import { commands } from "@pm3genscript/shared";
import { tokenize } from "./tokenize";
import type { Argument, Command, Dynamic, Identifier, Macro, NumberLiteral, ParseError, Root, StringLiternal, Token } from "./types";

export function parse(text: string) {
    const tokenized = tokenize(text);
    const walked = walkTokens(tokenized.tokens);

    return {
        root: walked.root,
        errors: [
            ...tokenized.errors,
            ...walked.errors
        ]
    };
}

export function walkTokens(tokens: Token[]) {
    const root: Root = {
        type: "root",
        offset: 0,
        children: []
    };
    const errors: ParseError[] = [];
    const tokenLength = tokens.length;
    let current = 0;

    const parents: (Macro | Command)[] = [];

    while (current < tokenLength) {
        const token = tokens[current];

        switch (token.type) {
            case "equal":
            case "hash": {
                const macro: Macro = {
                    type: "macro",
                    offset: token.offset,
                    name: null!,
                    arguments: []
                };
                root.children.push(macro);
                parents.unshift(macro);

                const next = advance();
                if (token.type === "equal") {
                    macro.name = createIdentifier(token);
                }
                else if (next?.type === "identifier") {
                    macro.name = createIdentifier(next);
                    current++;
                }
                else {
                    macro.name = {
                        type: "identifier",
                        offset: token.offset + token.value.length,
                        value: ""
                    };
                    errors.push({
                        message: `Expected identifier after "#", got "${next.type}".`,
                        offset: next.offset
                    });
                }
                break;
            }
            case "at": {
                const dynamic: Dynamic = {
                    type: "dynamic",
                    offset: token.offset,
                    name: null!
                };
                attach(dynamic);

                const next = advance();
                if (next?.type === "identifier" || next?.type === "number") {
                    dynamic.name = createIdentifier(next);
                    current++;
                }
                else {
                    dynamic.name = {
                        type: "identifier",
                        offset: token.offset + token.value.length,
                        value: ""
                    };
                    errors.push({
                        message: `Expected identifier or number after "@", got "${next.type}".`,
                        offset: next.offset
                    });
                }
                break;
            }
            case "identifier": {
                const identifier = createIdentifier(token);
                if (identifier.value in commands) {
                    const command: Command = {
                        type: "command",
                        offset: identifier.offset,
                        name: identifier,
                        arguments: []
                    };
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
                const number = createNumberLiteral(token);
                attach(number);
                current++;
                break;
            }
            case "string": {
                const string = createStringLiteral(token);
                attach(string);
                current++;
                break;
            }
        }
    }

    return {
        root,
        errors
    };

    function advance() {
        return tokens[++current];
    }

    function attach(node: Argument) {
        const container = parents.length ? parents[0].arguments : root.children;
        container.push(node);
    }
}

function createIdentifier(token: Token): Identifier {
    return {
        type: "identifier",
        offset: token.offset,
        value: token.value
    };
}

function createNumberLiteral(token: Token): NumberLiteral {
    return {
        type: "number",
        offset: token.offset,
        value: token.value
    };
}

function createStringLiteral(token: Token): StringLiternal {
    return {
        type: "string",
        offset: token.offset,
        value: token.value
    };
}