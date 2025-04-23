import { Dynamic, forEachNode, Symbol } from "@pm3genscript/parser";
import { URI } from "vscode-uri";
import type { LanguageServicePlugin, LocationLink } from "@volar/language-service";
import { PtsVirtualCode } from "../languagePlugin";

export const ptsDefinitionPlugin = (): LanguageServicePlugin => {
    return {
        capabilities: {
            definitionProvider: true
        },
        create(context) {
            return {
                provideDefinition(document, position) {
                    const uri = URI.parse(document.uri);
                    const decoded = context.decodeEmbeddedDocumentUri(uri);
                    const sourceScript = decoded && context.language.scripts.get(decoded[0]);
                    const root = sourceScript?.generated?.root;
                    if (!(root instanceof PtsVirtualCode)) {
                        return;
                    }

                    const results: LocationLink[] = [];
                    const offset = document.offsetAt(position);

                    forEachNode(root.ast, (node, parent) => {
                        if (offset < node.offset || offset > node.getEnd()) {
                            return;
                        }
                        if (node instanceof Dynamic) {
                            for (const [, { dynamic, references }] of root.checked.dynamics) {
                                if (references.includes(node)) {
                                    results.push({
                                        targetUri: root.uri.toString(),
                                        targetRange: {
                                            start: document.positionAt(parent!.offset),
                                            end: document.positionAt(parent!.getEnd())
                                        },
                                        targetSelectionRange: {
                                            start: document.positionAt(dynamic.offset),
                                            end: document.positionAt(dynamic.getEnd())
                                        }
                                    });
                                    break;
                                }
                            }
                        }
                        else if (node instanceof Symbol) {
                            for (const [, { symbol, references }] of root.checked.symbols) {
                                if (references.includes(node)) {
                                    results.push({
                                        targetUri: root.uri.toString(),
                                        targetRange: {
                                            start: document.positionAt(parent!.offset),
                                            end: document.positionAt(parent!.getEnd())
                                        },
                                        targetSelectionRange: {
                                            start: document.positionAt(symbol.offset),
                                            end: document.positionAt(symbol.getEnd())
                                        }
                                    });
                                    break;
                                }
                            }
                        }
                    });
                    return results;
                }
            };
        }
    };
};