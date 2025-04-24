import { forEachNode, isCommand, isMacro, isSymbol } from "@pm3genscript/parser";
import { URI } from "vscode-uri";
import type { CommandTemplate, MacroTemplate } from "@pm3genscript/shared";
import type { Hover, LanguageServicePlugin } from "@volar/language-service";
import { PtsVirtualCode } from "../languagePlugin";
import { highlight } from "./utils";

export const createHoverPlugin = (): LanguageServicePlugin => {
    return {
        capabilities: {
            hoverProvider: true
        },
        create(context) {
            return {
                provideHover(document, position) {
                    const uri = URI.parse(document.uri);
                    const decoded = context.decodeEmbeddedDocumentUri(uri);
                    const sourceScript = decoded && context.language.scripts.get(decoded[0]);
                    const root = sourceScript?.generated?.root;
                    if (!PtsVirtualCode.is(root)) {
                        return;
                    }

                    const offset = document.offsetAt(position);
                    let result: Hover | undefined;

                    forEachNode(root.ast, (node, parent) => {
                        if (offset < node.offset || offset > node.getEnd() || !parent) {
                            return;
                        }
                        if (isMacro(parent) && parent.name === node) {
                            result = {
                                contents: join(generateMacroInfo, parent.canonicalName, parent.template),
                                range: {
                                    start: document.positionAt(parent.offset),
                                    end: document.positionAt(node.getEnd())
                                }
                            };
                        }
                        else if (isCommand(parent) && parent.name === node) {
                            result = {
                                contents: join(generateCommandInfo, parent.canonicalName, parent.template),
                                range: {
                                    start: document.positionAt(parent.offset),
                                    end: document.positionAt(node.getEnd())
                                }
                            };
                        }
                        else if (isSymbol(node)) {
                            const name = node.value;
                            if (root.checked.symbols.has(name)) {
                                const { macro } = root.checked.symbols.get(name)!;
                                result = {
                                    contents: highlight(`${name} = ${macro.arguments[1].getText(root.ast)}`)
                                };
                            }
                        }
                    });
                    return result;
                }
            };
        }
    };
};

function join<T extends unknown[]>(generate: (...args: T) => Generator<string>, ...args: T) {
    return [...generate(...args)].join("").split("\r");
}

function* generateMacroInfo(name: string, template: MacroTemplate) {
    yield `**#${name}**`;
    if (template.alias?.length) {
        yield ` (alias: ${template.alias.map((item) => ` #${item}`).join(",")})`;
    }
    yield `\r`;

    if (template.description?.en) {
        yield template.description.en;
        yield `\r`;
    }
    if (template.description?.zh) {
        yield template.description.zh;
        yield `\r`;
    }

    yield `语法：\n\n`;
    yield `#${name} ${template.arguments?.map((arg) => `[${arg.name}]`).join(" ") || ""}\r`;

    if (template.example) {
        yield `用例：\n\n`;
        yield `${template.example.content}\n\n`;
        yield `${template.example.description}\r`;
    }
}

function* generateCommandInfo(name: string, template: CommandTemplate) {
    if (template.value !== void 0) {
        yield `0x${template.value.toString(16).toUpperCase().padStart(2, "0")} - `;
    }
    yield `**${name}**`;
    yield `\r`;

    if (template.description?.en) {
        yield template.description.en;
        yield `\r`;
    }
    if (template.description?.zh) {
        yield template.description.zh;
        yield `\r`;
    }

    yield `所需字节：${template.bytes}\n\n`;
    if (template.arguments?.length) {
        yield `参数：\n\n`;
        yield template.arguments.map((arg) => `?? &lt;${arg.type}&gt; ${arg.description}`).join("\n\n");
    }
    else {
        yield `无参数要求。`;
    }
    yield `\r`;
}