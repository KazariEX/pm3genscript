import { forEachNode, isDynamic, isSymbol } from "@pm3genscript/parser";
import { URI } from "vscode-uri";
import type { LanguageServicePlugin, Range, TextEdit } from "@volar/language-service";
import { PtsVirtualCode } from "../languagePlugin";

export const createRenamePlugin = (): LanguageServicePlugin => {
    return {
        capabilities: {
            renameProvider: {
                prepareProvider: true
            }
        },
        create(context) {
            return {
                provideRenameEdits(document, position, newName) {
                    const uri = URI.parse(document.uri);
                    const decoded = context.decodeEmbeddedDocumentUri(uri);
                    const sourceScript = decoded && context.language.scripts.get(decoded[0]);
                    const root = sourceScript?.generated?.root;
                    if (!PtsVirtualCode.is(root)) {
                        return;
                    }

                    const offset = document.offsetAt(position);
                    const results: TextEdit[] = [];

                    forEachNode(root.ast, (node) => {
                        if (offset < node.offset || offset > node.getEnd()) {
                            return;
                        }
                        if (isDynamic(node)) {
                            const name = node.name.value;
                            if (root.checked.dynamics.has(name)) {
                                const { definition, references } = root.checked.dynamics.get(name)!;
                                results.push(...[definition, ...references].map(({ name }) => ({
                                    range: {
                                        start: document.positionAt(name.offset),
                                        end: document.positionAt(name.getEnd())
                                    },
                                    newText: newName
                                })));
                            }
                        }
                        else if (isSymbol(node)) {
                            const name = node.value;
                            if (root.checked.symbols.has(name)) {
                                const { definition, references } = root.checked.symbols.get(name)!;
                                results.push(...[definition, ...references].map((node) => ({
                                    range: {
                                        start: document.positionAt(node.offset),
                                        end: document.positionAt(node.getEnd())
                                    },
                                    newText: newName
                                })));
                            }
                        }
                    });

                    return {
                        changes: {
                            [root.uri.toString()]: results
                        }
                    };
                },
                provideRenameRange(document, position) {
                    const uri = URI.parse(document.uri);
                    const decoded = context.decodeEmbeddedDocumentUri(uri);
                    const sourceScript = decoded && context.language.scripts.get(decoded[0]);
                    const root = sourceScript?.generated?.root;
                    if (!PtsVirtualCode.is(root)) {
                        return;
                    }

                    let result: Range | undefined;
                    const offset = document.offsetAt(position);
                    forEachNode(root.ast, (node) => {
                        if (offset < node.offset || offset > node.getEnd()) {
                            return;
                        }
                        if (isDynamic(node) || isSymbol(node)) {
                            const target = isDynamic(node) ? node.name : node;
                            result = {
                                start: document.positionAt(target.offset),
                                end: document.positionAt(node.getEnd())
                            };
                        }
                    });
                    return result;
                }
            };
        }
    };
};