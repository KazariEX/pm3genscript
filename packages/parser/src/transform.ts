import { commands, macros } from "@pm3genscript/shared";
import { Block, Command, Dynamic, Macro, type Root } from "./node";
import type { AST, Diagnostic } from "./types";

export function transform(root: Root) {
    const ast: AST = {
        dynamic: {
            defines: [],
            references: []
        },
        children: []
    };
    const diagnostics: Diagnostic[] = [];
    const childLength = root.children.length;
    let current = 0;
    let currentBlock: Block | null = null;

    while (current < childLength) {
        const child = root.children[current];
        if (child instanceof Macro) {
            transformMacro(child);
        }
        else if (child instanceof Command) {
            transformCommand(child);
        }
        else {
            diagnostics.push({
                message: `Expected "macro" or "command" node at the root, got "${child.type}"`,
                offset: child.offset,
                length: child.getLength()
            });
        }
        current++;
    }

    return {
        ast,
        diagnostics
    };

    function transformMacro(macro: Macro) {
        const name = macro.name.value;
        switch (name) {
            case "org": {
                const block = new Block(macro);
                currentBlock = block;
                ast.children.push(block);

                const arg0 = macro.arguments[0];
                if (arg0 instanceof Dynamic) {
                    ast.dynamic.defines.push(arg0);
                }
                break;
            }
            default: {
                currentBlock = null;
                ast.children.push(macro);
                break;
            }
        }

        const template = getMacroTemplate(name);
        if (template) {
            const args = macro.arguments;
            const templateArgs = template.arguments;
            if (args.length !== templateArgs.length) {
                diagnostics.push({
                    message: `Expected ${templateArgs.length} arguments, got ${args.length}.`,
                    offset: macro.offset,
                    length: macro.getLength()
                });
            }
        }
        else {
            diagnostics.push({
                message: `Unknown macro "${name}".`,
                offset: macro.name.offset,
                length: macro.name.getLength()
            });
        }
    }

    function transformCommand(command: Command) {
        const name = command.name.value;
        const template = getCommandTemplate(name)!;
        const argLength = command.arguments.length;
        const templateArgLength = template.arguments?.length ?? 0;
        if (argLength !== templateArgLength) {
            diagnostics.push({
                message: `Expected ${templateArgLength} arguments, got ${argLength}.`,
                offset: command.offset,
                length: command.getLength()
            });
        }

        for (const arg of command.arguments) {
            if (arg instanceof Dynamic) {
                ast.dynamic.references.push(arg);
            }
        }

        if (currentBlock) {
            currentBlock.children.push(command);
        }
        else {
            ast.children.push(command);
            diagnostics.push({
                message: `Command "${name}" is not inside a block.`,
                offset: command.offset,
                length: command.getLength()
            });
        }
    }
}

function getMacroTemplate(name: string) {
    let template = macros[name];
    if (template?.redirect) {
        template = macros[template.redirect];
    }
    return template;
}

function getCommandTemplate(name: string) {
    let template = commands[name];
    if (template?.redirect) {
        template = commands[template.redirect];
    }
    return template;
}