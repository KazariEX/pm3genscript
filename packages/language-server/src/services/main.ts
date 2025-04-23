import { URI } from "vscode-uri";
import type { DiagnosticSeverity, LanguageServicePlugin } from "@volar/language-service";
import { PtsVirtualCode } from "../languagePlugin";

export default (): LanguageServicePlugin => {
    return {
        capabilities: {
            diagnosticProvider: {
                interFileDependencies: true,
                workspaceDiagnostics: true
            },
            hoverProvider: true
        },
        create(context) {
            return {
                provideDiagnostics(document) {
                    const uri = URI.parse(document.uri);
                    const decoded = context.decodeEmbeddedDocumentUri(uri);
                    const sourceScript = decoded && context.language.scripts.get(decoded[0]);
                    const root = sourceScript?.generated?.root;
                    if (!(root instanceof PtsVirtualCode)) {
                        return;
                    }

                    return root.diagnostics.map((diagnostic) => ({
                        message: diagnostic.message,
                        range: {
                            start: document.positionAt(diagnostic.offset),
                            end: document.positionAt(diagnostic.offset + diagnostic.length)
                        },
                        severity: 1 satisfies typeof DiagnosticSeverity.Error
                    }));
                }
            };
        }
    };
};