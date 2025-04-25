import { type ArgumentType, argumentTypes } from "@pm3genscript/shared";
import { isBlock, isCommand, isDynamic, isIdentifier, isMacro, isNumberLiteral, isStringLiteral, isSymbol } from "./utils/is";
import { joinWords, joinWordsOr, toArray } from "./utils/shared";
import { forEachNode, forEachStatement } from "./utils/traverse";
import type { Argument, Command, Dynamic, Macro, Parent, Root, Symbol } from "./node";
import type { Diagnostic } from "./types";

export function check(ast: Root) {
    const diagnostics: Diagnostic[] = [];
    const resolvedValues = new Map<Argument, any>();
    const dynamics = new Map<string, {
        macro: Macro;
        definition: Dynamic;
        references: Dynamic[];
    }>();
    const symbols = new Map<string, {
        macro: Macro;
        definition: Symbol;
        references: Symbol[];
        type: ArgumentType;
        value: any;
    }>();

    const references = {
        dynamics: [] as Dynamic[],
        symbols: [] as Symbol[]
    };

    for (const node of ast.children) {
        if (isMacro(node) || isBlock(node)) {
            continue;
        }
        else if (isCommand(node)) {
            diagnostics.push({
                message: `Command "${node.name.value}" is not inside a block.`,
                offset: node.offset,
                length: node.getLength()
            });
        }
        else {
            diagnostics.push({
                message: `Expected "macro" or "command" node at the root, got "${node.type}"`,
                offset: node.offset,
                length: node.getLength()
            });
        }
    }

    forEachNode(ast, (node, parent) => {
        if (isDynamic(node)) {
            if (
                parent && isMacro(parent) &&
                parent.canonicalName === "org" &&
                parent.arguments[0] === node
            ) {
                const name = node.name.value;
                if (!dynamics.has(name)) {
                    dynamics.set(name, {
                        macro: parent,
                        definition: node,
                        references: []
                    });
                }
                else {
                    diagnostics.push({
                        message: `Dynamic offset "@${name}" is already defined.`,
                        offset: node.offset,
                        length: node.getLength()
                    });
                }
            }
            else {
                references.dynamics.push(node);
            }
        }
        else if (isSymbol(node)) {
            if (
                parent && isMacro(parent) &&
                parent.canonicalName === "define" &&
                parent.arguments[0] === node &&
                parent.arguments.length >= 2
            ) {
                const [, arg1] = parent.arguments;
                const name = node.value;
                const [type, value] = resolveRuntimeTypeAndValue(arg1);
                if (symbols.has(name)) {
                    symbols.get(name)!.definition = node;
                }
                else {
                    symbols.set(name, {
                        macro: parent,
                        definition: node,
                        references: [],
                        type,
                        value
                    });
                }
            }
            else {
                references.symbols.push(node);
            }
        }
    });

    for (const node of references.dynamics) {
        const name = node.name.value;
        if (dynamics.has(name)) {
            dynamics.get(name)!.references.push(node);
        }
        else if (name) {
            diagnostics.push({
                message: `Dynamic offset "@${name}" is not defined.`,
                offset: node.offset,
                length: node.getLength()
            });
        }
    }

    for (const node of references.symbols) {
        const name = node.value;
        if (symbols.has(name)) {
            symbols.get(name)!.references.push(node);
        }
        else {
            diagnostics.push({
                message: `Symbol "${name}" is not defined.`,
                offset: node.offset,
                length: node.getLength()
            });
        }
    }

    for (const node of forEachStatement(ast.children)) {
        isMacro(node) ? checkMacro(node) : checkCommand(node);
    }

    return {
        diagnostics,
        resolvedValues,
        dynamics,
        symbols
    };

    function checkMacro(macro: Macro) {
        const { template } = macro;
        if (!template) {
            if (macro.name.value) {
                diagnostics.push({
                    message: `Unknown macro "${macro.name.value}".`,
                    offset: macro.name.offset,
                    length: macro.name.getLength()
                });
            }
            return;
        }

        if (macro.canonicalName === "raw") {
            checkRaw(macro);
            return;
        }

        const { arguments: args } = macro;
        const { arguments: templateArgs = [] } = template;
        const length = Math.max(args.length, templateArgs.length);

        for (let i = 0; i < length; i++) {
            const arg = args[i];
            const templateArg = templateArgs[i];
            if (!arg || !templateArg) {
                mismatchArgumentCount(macro, templateArgs.length);
                break;
            }

            const allowedTypes = getAllowedTypes(templateArg.type ?? []);
            const canSymbol = (templateArg.can?.symbol ?? true) && !allowedTypes.has("symbol");
            const [type, value] = resolveRuntimeTypeAndValue(arg, canSymbol);

            if (templateArg.enum) {
                if (!templateArg.enum.includes(value)) {
                    mismatchArgumentEnum(arg, templateArg.enum);
                }
            }
            else if (!allowedTypes.has(type)) {
                mismatchArgumentType(arg, type, templateArg.type ?? []);
            }
        }
    }

    function checkRaw(macro: Macro) {
        const { arguments: args } = macro;
        const [templateArg0, templateArg1] = macro.template.arguments!;

        let prev: string | undefined;
        for (let i = 0; i < args.length; i++) {
            const arg = args[i];
            const [type, value] = resolveRuntimeTypeAndValue(arg);
            if (type === "identifier") {
                if (!templateArg0.enum!.includes(value)) {
                    mismatchArgumentEnum(arg, templateArg0.enum!);
                }
                prev = normalizeRawType(value);
                continue;
            }
            else {
                const originalType = prev && argumentTypes.has(prev) ? prev as ArgumentType : templateArg1.type!;
                const allowedTypes = getAllowedTypes(originalType);
                if (!allowedTypes.has(type)) {
                    mismatchArgumentType(arg, type, originalType);
                }
            }
            prev = void 0;
        }
    }

    function checkCommand(command: Command) {
        const { arguments: args, template } = command;
        const { arguments: templateArgs = [] } = template;
        const length = Math.max(args.length, templateArgs.length);
        const values: any[] = [];

        let idx = 0;
        let templateIdx = 0;
        for (let i = 0; i < length; i++) {
            const templateArg = templateArgs[templateIdx];
            if (templateArg && (!templateArg.when || templateArg.when(values))) {
                templateIdx++;
            }

            const arg = args[idx];
            if (arg) {
                const allowedTypes = getAllowedTypes(templateArg?.type ?? []);
                const [type, value] = resolveRuntimeTypeAndValue(arg, !allowedTypes.has("symbol"));
                values.push(value);
                idx++;

                if (templateArg && !allowedTypes.has(type)) {
                    mismatchArgumentType(arg, type, templateArg.type);
                }
            }
        }
        if (args.length !== templateIdx) {
            mismatchArgumentCount(command, templateIdx);
        }
    }

    function mismatchArgumentCount(parent: Parent, expectedLength: number) {
        const { arguments: args } = parent;
        const isMoreThan = args.length > expectedLength;
        const start = (isMoreThan ? args[expectedLength] : parent).offset;
        const end = (isMoreThan ? args.at(-1)! : parent).getEnd();
        diagnostics.push({
            message: `Expected ${expectedLength} argument(s), got ${args.length}.`,
            offset: start,
            length: end - start
        });
    }

    function mismatchArgumentEnum(arg: Argument, expectedValues: string[]) {
        diagnostics.push({
            message: `Value is not accepted. Valid values: ${joinWords(expectedValues)}.`,
            offset: arg.offset,
            length: arg.getLength()
        });
    }

    function mismatchArgumentType(arg: Argument, type: ArgumentType, expectedType: ArgumentType | ArgumentType[]) {
        const types = toArray(expectedType);
        diagnostics.push({
            message: `Expected argument type ${joinWordsOr(types)}, got "${type}".`,
            offset: arg.offset,
            length: arg.getLength()
        });
    }

    function resolveRuntimeTypeAndValue(arg: Argument, canSymbol = true): [ArgumentType, any] {
        if (isIdentifier(arg)) {
            const name = arg.value;
            resolvedValues.set(arg, name);
            return ["identifier", name];
        }
        if (isSymbol(arg)) {
            const name = arg.value;
            if (canSymbol) {
                const symbol = symbols.get(name);
                if (symbol) {
                    return [symbol.type, symbol.value];
                }
            }
            return ["symbol", name];
        }
        if (isNumberLiteral(arg)) {
            const value = arg.value.startsWith("0x")
                ? Number.parseInt(arg.value.slice(2), 16)
                : Number.parseInt(arg.value);
            resolvedValues.set(arg, value);

            const type = value >= 0 && value <= 0xFF ? "byte"
                : value >= 0 && value <= 0xFFFF ? "word"
                : value >= 0 && value <= 0xFFFFFFFF ? "dword"
                : "number";
            return [type, value];
        }
        if (isStringLiteral(arg)) {
            const value = arg.value;
            resolvedValues.set(arg, value);
            return ["string", value];
        }
        // HACK: 放开头会导致不可预测的类型收缩行为
        if (isDynamic(arg)) {
            const name = arg.name.value;
            resolvedValues.set(arg, name);
            return ["pointer", name];
        }
        else {
            throw arg satisfies never;
        }
    }
}

function getAllowedTypes(type: ArgumentType | ArgumentType[]) {
    const types = [...toArray(type)];
    if (types.includes("number") || types.includes("dword") || types.includes("pointer")) {
        types.push("byte", "word", "dword", "pointer");
    }
    else if (types.includes("word")) {
        types.push("byte");
    }
    return new Set(types);
}

function normalizeRawType(type: string) {
    switch (type) {
        case "b":
        case "char":
            return "byte";
        case "i":
        case "int":
        case "integer":
            return "word";
        case "l":
        case "long":
            return "dword";
        case "p":
        case "ptr":
            return "pointer";
        default:
            return type;
    }
}