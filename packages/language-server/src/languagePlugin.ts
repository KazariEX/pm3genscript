import { type AST, check, type Diagnostic, parse } from "@pm3genscript/parser";
import type { CodeMapping, LanguagePlugin, VirtualCode } from "@volar/language-server";
import type ts from "typescript";
import type { URI } from "vscode-uri";

export const ptsLanguagePlugin: LanguagePlugin<URI> = {
    getLanguageId(uri) {
        if (uri.path.endsWith(".pts")) {
            return "pm3genscript";
        }
    },
    createVirtualCode(uri, languageId, snapshot) {
        if (languageId === "pm3genscript") {
            return new PtsVirtualCode(snapshot);
        }
    }
};

export class PtsVirtualCode implements VirtualCode {
    id = "root";
    languageId = "pm3genscript";
    mappings: CodeMapping[];
    embeddedCodes: VirtualCode[] = [];

    ast: AST;
    checked: ReturnType<typeof check>;
    diagnostics: Diagnostic[] = [];

    constructor(
        public snapshot: ts.IScriptSnapshot
    ) {
        this.mappings = [{
            sourceOffsets: [0],
            generatedOffsets: [0],
            lengths: [snapshot.getLength()],
            data: {
                completion: true,
                format: true,
                navigation: true,
                semantic: true,
                structure: true,
                verification: true
            }
        }];

        const text = this.snapshot.getText(0, this.snapshot.getLength());
        const parsed = parse(text);
        const checked = check(parsed.ast);
        this.ast = parsed.ast;
        this.checked = checked;
        this.diagnostics = [
            ...parsed.diagnostics,
            ...checked.diagnostics
        ];
    }
}