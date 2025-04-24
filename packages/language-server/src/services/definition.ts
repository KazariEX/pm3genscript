import { forEachNode, isDynamic, isSymbol } from "@pm3genscript/parser";
import { URI } from "vscode-uri";
import type { LanguageServicePlugin, LocationLink } from "@volar/language-service";
import { PtsVirtualCode } from "../languagePlugin";

export const createDefinitionPlugin = (): LanguageServicePlugin => {
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
                    if (!PtsVirtualCode.is(root)) {
                        return;
                    }

                    const offset = document.offsetAt(position);
                    const results: LocationLink[] = [];

                    forEachNode(root.ast, (node) => {
                        if (offset < node.offset || offset > node.getEnd()) {
                            return;
                        }
                        if (isDynamic(node)) {
                            for (const [, { macro, definition, references }] of root.checked.dynamics) {
                                if (references.includes(node)) {
                                    results.push({
                                        targetUri: root.uri.toString(),
                                        targetRange: {
                                            start: document.positionAt(macro.offset),
                                            end: document.positionAt(macro.getEnd())
                                        },
                                        targetSelectionRange: {
                                            start: document.positionAt(definition.offset),
                                            end: document.positionAt(definition.getEnd())
                                        }
                                    });
                                    break;
                                }
                            }
                        }
                        else if (isSymbol(node)) {
                            for (const [, { macro, definition, references }] of root.checked.symbols) {
                                if (references.includes(node)) {
                                    results.push({
                                        targetUri: root.uri.toString(),
                                        targetRange: {
                                            start: document.positionAt(macro.offset),
                                            end: document.positionAt(macro.getEnd())
                                        },
                                        targetSelectionRange: {
                                            start: document.positionAt(definition.offset),
                                            end: document.positionAt(definition.getEnd())
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