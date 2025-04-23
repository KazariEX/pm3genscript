import type { ArgumentType } from "@pm3genscript/shared";
import { type Argument, type Command, Dynamic, Identifier, Macro, NumberLiteral, type Parent, type Root, StringLiternal, Symbol } from "./node";
import { forEachNode, forEachStatement } from "./utils";
import type { Diagnostic } from "./types";

export function check(ast: Root) {
    const diagnostics: Diagnostic[] = [];
    const resolvedValues = new Map<Argument, any>();
    const dynamics = new Map<string, {
        definition: Macro;
        dynamic: Dynamic;
        references: Dynamic[];
    }>();
    const symbols = new Map<string, {
        definition: Macro;
        symbol: Symbol;
        references: Symbol[];
        type: ArgumentType;
        value: any;
    }>();

    const references = {
        dynamics: [] as Dynamic[],
        symbols: [] as Symbol[]
    };

    forEachNode(ast, (node, parent) => {
        if (node instanceof Dynamic) {
            if (
                parent instanceof Macro &&
                parent.canonicalName === "org" &&
                parent.arguments[0] === node
            ) {
                const name = node.name.value;
                if (!dynamics.has(name)) {
                    dynamics.set(name, {
                        definition: parent,
                        dynamic: node,
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
        else if (node instanceof Symbol) {
            if (
                parent instanceof Macro &&
                parent.canonicalName === "define" &&
                parent.arguments[0] === node &&
                parent.arguments.length >= 2
            ) {
                const [, arg1] = parent.arguments;
                const name = node.value;
                const [type, value] = resolveRuntimeTypeAndValue(arg1);
                if (symbols.has(name)) {
                    symbols.get(name)!.symbol = node;
                }
                else {
                    symbols.set(name, {
                        definition: parent,
                        symbol: node,
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
        else {
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

    for (const child of forEachStatement(ast.children)) {
        if (child instanceof Macro) {
            checkMacro(child);
        }
        else {
            checkCommand(child);
        }
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
            diagnostics.push({
                message: `Unknown macro "${macro.name.value}".`,
                offset: macro.name.offset,
                length: macro.name.getLength()
            });
            return;
        }

        const { arguments: args } = macro;
        const { arguments: templateArgs = [] } = template;
        const length = Math.max(args.length, templateArgs.length);

        for (let i = 0; i < length; i++) {
            const arg = args[i];
            const templateArg = templateArgs[i];
            if (!arg || !templateArg) {
                reportArgumentCountMismatch(arg, args, templateArgs.length, macro);
                break;
            }

            const allowedTypes = getAllowedTypes(templateArg.type ?? []);
            const canSymbol = (templateArg.can?.symbol ?? true) && !allowedTypes.has("symbol");
            const [type, value] = resolveRuntimeTypeAndValue(arg, canSymbol);

            if (templateArg.enum) {
                if (!templateArg.enum.includes(value)) {
                    diagnostics.push({
                        message: `Value "${value}" is not allowed for argument "${templateArg.name}".`,
                        offset: arg.offset,
                        length: arg.getLength()
                    });
                }
            }
            else if (!allowedTypes.has(type)) {
                diagnostics.push({
                    message: `Expected argument type "${templateArg.type}", got "${type}".`,
                    offset: arg.offset,
                    length: arg.getLength()
                });
            }
        }
    }

    function checkCommand(command: Command) {
        const { arguments: args, template } = command;
        const { arguments: templateArgs = [] } = template;
        const length = Math.max(args.length, templateArgs.length);
        const values: any[] = [];

        for (let i = 0; i < length; i++) {
            const arg = args[i];
            const templateArg = templateArgs[i];
            if (!arg || !templateArg) {
                reportArgumentCountMismatch(arg, args, templateArgs.length, command);
                break;
            }

            const allowedTypes = getAllowedTypes(templateArg.type ?? []);
            const [type, value] = resolveRuntimeTypeAndValue(arg, !allowedTypes.has("symbol"));

            if (templateArg.when && !templateArg.when?.(values)) {
                break;
            }
            values.push(value);

            if (!allowedTypes.has(type)) {
                diagnostics.push({
                    message: `Expected argument type "${templateArg.type}", got "${type}".`,
                    offset: arg.offset,
                    length: arg.getLength()
                });
            }
        }
    }

    function reportArgumentCountMismatch(arg: Argument, args: Argument[], templateArgLength: number, parent: Parent) {
        const [start, end] = arg
            ? [arg.offset, args.at(-1)!.getEnd()]
            : [parent.offset, parent.getEnd()];
        diagnostics.push({
            message: `Expected ${templateArgLength} argument(s), got ${args.length}.`,
            offset: start,
            length: end - start
        });
    }

    function resolveRuntimeTypeAndValue(arg: Argument, canSymbol = true): [ArgumentType, any] {
        if (arg instanceof Dynamic) {
            const name = arg.name.value;
            resolvedValues.set(arg, name);
            return ["pointer", name];
        }
        if (arg instanceof Identifier) {
            const name = arg.value;
            resolvedValues.set(arg, name);
            return ["identifier", name];
        }
        if (arg instanceof Symbol) {
            const name = arg.value;
            if (canSymbol) {
                const symbol = symbols.get(name);
                if (symbol) {
                    return [symbol.type, symbol.value];
                }
            }
            return ["symbol", name];
        }
        if (arg instanceof NumberLiteral) {
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
        if (arg instanceof StringLiternal) {
            const value = arg.value;
            resolvedValues.set(arg, value);
            return ["string", value];
        }
        else {
            throw arg satisfies never;
        }
    }
}

function getAllowedTypes(type: ArgumentType | ArgumentType[]) {
    const types = Array.isArray(type) ? type : [type];
    if (types.includes("number") || types.includes("dword") || types.includes("pointer")) {
        types.push("byte", "word", "dword", "pointer");
    }
    else if (types.includes("word")) {
        types.push("byte");
    }
    return new Set(types);
}