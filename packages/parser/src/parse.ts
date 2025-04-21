import { commands } from "@pm3genscript/shared";
import { type Argument, Command, Dynamic, Identifier, Macro, NumberLiteral, Root, StringLiternal } from "./node";
import { tokenize } from "./tokenize";
import { transform } from "./transform";
import type { Diagnostic, Token } from "./types";

export function parse(text: string) {
    const tokenized = tokenize(text);
    const walked = walkTokens(text, tokenized.tokens);
    const transformed = transform(walked.root);

    return {
        ast: transformed.ast,
        diagnostics: [
            ...tokenized.diagnostics,
            ...walked.diagnostics,
            ...transformed.diagnostics
        ]
    };
}

export function walkTokens(text: string, tokens: Token[]) {
    const root = new Root(text);
    const diagnostics: Diagnostic[] = [];
    const tokenLength = tokens.length;
    let current = 0;

    const parents: (Macro | Command)[] = [];

    while (current < tokenLength) {
        const token = tokens[current];

        switch (token.type) {
            case "hash": {
                const macro = new Macro(token.offset, null!);
                root.children.push(macro);
                parents.unshift(macro);

                const next = advance();
                if (next?.type === "identifier") {
                    macro.name = new Identifier(next.offset, next.value);
                    current++;
                }
                else {
                    macro.name = new Identifier(token.offset + token.value.length, "");
                    diagnostics.push({
                        message: `Expected identifier after "#", got "${next.type}".`,
                        offset: next.offset,
                        length: next.value.length
                    });
                }
                break;
            }
            case "at": {
                const dynamic = new Dynamic(token.offset, null!);
                attach(dynamic);

                const next = advance();
                if (next?.type === "identifier" || next?.type === "number") {
                    dynamic.name = new Identifier(next.offset, next.value);
                    current++;
                }
                else {
                    dynamic.name = new Identifier(token.offset + token.value.length, "");
                    diagnostics.push({
                        message: `Expected identifier or number after "@", got "${next.type}".`,
                        offset: next.offset,
                        length: next.value.length
                    });
                }
                break;
            }
            case "equal":
            case "identifier": {
                const identifier = new Identifier(token.offset, token.value);
                if (token.type === "equal" || identifier.value in commands) {
                    const command = new Command(identifier);
                    parents.unshift(command);
                    root.children.push(command);
                }
                else {
                    attach(identifier);
                }
                current++;
                break;
            }
            case "number": {
                const number = new NumberLiteral(token.offset, token.value);
                attach(number);
                current++;
                break;
            }
            case "string": {
                const string = new StringLiternal(token.offset, token.value);
                attach(string);
                current++;
                break;
            }
        }
    }

    return {
        root,
        diagnostics
    };

    function advance() {
        return tokens[++current];
    }

    function attach(node: Argument) {
        const container = parents.length ? parents[0].arguments : root.children;
        container.push(node);
    }
}