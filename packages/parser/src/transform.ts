import { symbolRE } from "./check";
import { Block, Command, Dynamic, Identifier, Macro, type Root } from "./node";
import type { AST, Diagnostic } from "./types";

export function transform(root: Root) {
    const ast: AST = {
        dynamic: {
            defines: [],
            references: []
        },
        symbol: {
            defines: [],
            references: []
        },
        children: []
    };
    const diagnostics: Diagnostic[] = [];
    let currentBlock: Block | null = null;

    for (const child of root.children) {
        if (child instanceof Macro) {
            processMacro(child);
        }
        else if (child instanceof Command) {
            processCommand(child);
        }
        else {
            diagnostics.push({
                message: `Expected "macro" or "command" node at the root, got "${child.type}"`,
                offset: child.offset,
                length: child.getLength()
            });
        }
    }

    return {
        ast,
        diagnostics
    };

    function processMacro(macro: Macro) {
        switch (macro.canonicalName) {
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
            case "define": {
                ast.symbol.defines.push(macro);
            }
            default: {
                currentBlock = null;
                ast.children.push(macro);
                break;
            }
        }
    }

    function processCommand(command: Command) {
        for (const arg of command.arguments) {
            if (arg instanceof Dynamic) {
                ast.dynamic.references.push(arg);
            }
            else if (arg instanceof Identifier && symbolRE.test(arg.value)) {
                ast.symbol.references.push(arg);
            }
        }

        if (currentBlock) {
            currentBlock.children.push(command);
        }
        else {
            ast.children.push(command);
            diagnostics.push({
                message: `Command "${command.name.value}" is not inside a block.`,
                offset: command.offset,
                length: command.getLength()
            });
        }
    }
}