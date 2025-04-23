import type { ArgumentType } from "@pm3genscript/shared";
import { type Argument, Block, type Command, Dynamic, Identifier, Macro, NumberLiteral, type Parent, StringLiternal } from "./node";
import type { AST, ASTChild, Diagnostic } from "./types";

export const symbolRE = /^[A-Z][A-Z0-9_]*$/;

export function check(ast: AST) {
    const diagnostics: Diagnostic[] = [];
    const resolvedValues = new Map<Argument, any>();
    const dynamicNames = new Map<string, {
        identifier: Identifier;
        references: Identifier[];
    }>();
    const symbols = new Map<string, {
        identifier: Exclude<Argument, Dynamic>;
        references: Identifier[];
        type: ArgumentType;
        value: any;
    }>();

    for (const macro of ast.symbol.defines) {
        if (macro.arguments.length < 2) {
            continue;
        }
        const [arg0, arg1] = macro.arguments;
        if (arg0 instanceof Identifier && symbolRE.test(arg0.value)) {
            const name = arg0.value;
            const [type, value] = resolveRuntimeTypeAndValue(arg1, false);
            if (symbols.has(name)) {
                symbols.get(name)!.identifier = arg0;
            }
            else {
                symbols.set(name, {
                    identifier: arg0,
                    references: [],
                    type,
                    value
                });
            }
        }
    }
    for (const reference of ast.symbol.references) {
        const name = reference.value;
        if (symbols.has(name)) {
            symbols.get(name)!.references.push(reference);
        }
        else {
            diagnostics.push({
                message: `Symbol "${name}" is not defined.`,
                offset: reference.offset,
                length: reference.getLength()
            });
        }
    }

    for (const dynamic of ast.dynamic.defines) {
        const name = dynamic.name.value;
        if (!dynamicNames.has(name)) {
            dynamicNames.set(name, {
                identifier: dynamic.name,
                references: []
            });
        }
        else {
            diagnostics.push({
                message: `Dynamic offset "@${name}" is already defined.`,
                offset: dynamic.offset,
                length: dynamic.getLength()
            });
        }
    }
    for (const reference of ast.dynamic.references) {
        const name = reference.name.value;
        if (dynamicNames.has(name)) {
            dynamicNames.get(name)!.references.push(reference.name);
        }
        else {
            diagnostics.push({
                message: `Dynamic offset "@${name}" is not defined.`,
                offset: reference.offset,
                length: reference.getLength()
            });
        }
    }

    for (const child of forEachChild(ast.children)) {
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
        dynamicNames,
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
            const value = arg.name.value;
            resolvedValues.set(arg, value);
            return ["pointer", value];
        }
        if (arg instanceof Identifier) {
            const value = arg.value;
            if (symbolRE.test(value)) {
                if (canSymbol) {
                    const symbol = symbols.get(value);
                    if (symbol) {
                        return [symbol.type, symbol.value];
                    }
                }
                return ["symbol", value];
            }
            resolvedValues.set(arg, value);
            return ["identifier", value];
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

function* forEachChild(children: ASTChild[]): Generator<Macro | Command> {
    for (const child of children) {
        if (child instanceof Block) {
            yield child.label;
            yield* child.children;
        }
        else {
            yield child;
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