import { URI } from "vscode-uri";
import type { LanguageServicePlugin } from "@volar/language-service";
import { PtsVirtualCode } from "../languagePlugin";

export default (): LanguageServicePlugin => {
    return {
        capabilities: {
            hoverProvider: true
        },
        create(context) {
            return {
                provideHover(document, position, token) {
                    const uri = URI.parse(document.uri);
                    const decoded = context.decodeEmbeddedDocumentUri(uri);
                    const sourceScript = decoded && context.language.scripts.get(decoded[0]);
                    const root = sourceScript?.generated?.root;
                    if (!(root instanceof PtsVirtualCode)) {
                        return;
                    }

                    return {
                        contents: "Hello world!"
                    };
                }
            };
        }
    };
};