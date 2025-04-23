import { Dynamic, forEachNode, Symbol } from "@pm3genscript/parser";
import { URI } from "vscode-uri";
import type { LanguageServicePlugin, Range, TextEdit } from "@volar/language-service";
import { PtsVirtualCode } from "../languagePlugin";

export const ptsRenamePlugin = (): LanguageServicePlugin => {
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
                    if (!(root instanceof PtsVirtualCode)) {
                        return;
                    }

                    const results: TextEdit[] = [];
                    const offset = document.offsetAt(position);
                    forEachNode(root.ast, (node) => {
                        if (offset < node.offset || offset > node.getEnd()) {
                            return;
                        }
                        if (node instanceof Dynamic) {
                            const name = node.name.value;
                            if (root.checked.dynamics.has(name)) {
                                const { dynamic, references } = root.checked.dynamics.get(name)!;
                                results.push(...[dynamic, ...references].map(({ name }) => ({
                                    range: {
                                        start: document.positionAt(name.offset),
                                        end: document.positionAt(name.getEnd())
                                    },
                                    newText: newName
                                })));
                            }
                        }
                        else if (node instanceof Symbol) {
                            const name = node.value;
                            if (root.checked.symbols.has(name)) {
                                const { symbol, references } = root.checked.symbols.get(name)!;
                                results.push(...[symbol, ...references].map((node) => ({
                                    range: {
                                        start: document.positionAt(node.offset),
                                        end: document.positionAt(node.getEnd())
                                    },
                                    newText: newName
                                })))
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
                    if (!(root instanceof PtsVirtualCode)) {
                        return;
                    }

                    let result: Range | undefined;
                    const offset = document.offsetAt(position);
                    forEachNode(root.ast, (node) => {
                        if (offset < node.offset || offset > node.getEnd()) {
                            return;
                        }
                        if (node instanceof Dynamic || node instanceof Symbol) {
                            const target = node instanceof Dynamic ? node.name : node;
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