import { forEachNode, isDynamic, isSymbol } from "@pm3genscript/parser";
import { URI } from "vscode-uri";
import type { LanguageServicePlugin, Location } from "@volar/language-service";
import { PtsVirtualCode } from "../languagePlugin";

export const ptsReferencesPlugin = (): LanguageServicePlugin => {
    return {
        capabilities: {
            referencesProvider: true
        },
        create(context) {
            return {
                provideReferences(document, position) {
                    const uri = URI.parse(document.uri);
                    const decoded = context.decodeEmbeddedDocumentUri(uri);
                    const sourceScript = decoded && context.language.scripts.get(decoded[0]);
                    const root = sourceScript?.generated?.root;
                    if (!PtsVirtualCode.is(root)) {
                        return;
                    }

                    const results: Location[] = [];
                    const offset = document.offsetAt(position);

                    forEachNode(root.ast, (node) => {
                        if (offset < node.offset || offset > node.getEnd()) {
                            return;
                        }
                        if (isDynamic(node)) {
                            const name = node.name.value;
                            if (root.checked.dynamics.has(name)) {
                                const { references } = root.checked.dynamics.get(name)!;
                                results.push(...references.map((reference) => ({
                                    uri: root.uri.toString(),
                                    range: {
                                        start: document.positionAt(reference.offset),
                                        end: document.positionAt(reference.getEnd())
                                    }
                                })));
                            }
                        }
                        else if (isSymbol(node)) {
                            const name = node.value;
                            if (root.checked.symbols.has(name)) {
                                const { references } = root.checked.symbols.get(name)!;
                                results.push(...references.map((reference) => ({
                                    uri: root.uri.toString(),
                                    range: {
                                        start: document.positionAt(reference.offset),
                                        end: document.positionAt(reference.getEnd())
                                    }
                                })));
                            }
                        }
                    });
                    return results;
                }
            };
        }
    };
};