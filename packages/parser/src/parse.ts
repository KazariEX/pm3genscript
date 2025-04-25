import { commands } from "@pm3genscript/shared";
import { Block, Command, Dynamic, Identifier, Macro, type Node, NumberLiteral, Root, StringLiternal, Symbol } from "./node";
import { tokenize } from "./tokenize";
import { isCommand } from "./utils/is";
import { joinWordsOr } from "./utils/shared";
import type { Diagnostic, Token, TokenType } from "./types";

export function parse(text: string) {
    const tokenized = tokenize(text);
    const walked = walkTokens(text, tokenized.tokens);

    return {
        ast: walked.root,
        diagnostics: [
            ...tokenized.diagnostics,
            ...walked.diagnostics
        ]
    };
}

export function walkTokens(text: string, tokens: Token[]) {
    const root = new Root(text);
    const diagnostics: Diagnostic[] = [];
    const tokenLength = tokens.length;
    let current = 0;

    const parents: (Macro | Command)[] = [];
    let currentBlock: Block | null = null;

    root: while (current < tokenLength) {
        const token = tokens[current];

        switch (token.type) {
            case "hash": {
                let name: Identifier;
                const next = advance();
                if (next?.type === "identifier") {
                    name = new Identifier(next.offset, next.value);
                    current++;
                }
                else {
                    name = new Identifier(token.offset + token.value.length, "");
                    mismatchAfter(token, next, "identifier");
                }
                const macro = new Macro(token.offset, name);
                if (macro.canonicalName === "org") {
                    const block = new Block(macro);
                    currentBlock = block;
                    root.children.push(block);
                }
                else {
                    currentBlock = null;
                    root.children.push(macro);
                }
                parents.unshift(macro);
                if (macro.canonicalName === "break") {
                    break root;
                }
                break;
            }
            case "at": {
                let name: Identifier;
                const next = advance();
                if (next?.type === "identifier" || next?.type === "number") {
                    name = new Identifier(next.offset, next.value);
                    current++;
                }
                else {
                    name = new Identifier(token.offset + token.value.length, "");
                    mismatchAfter(token, next, "identifier", "number");
                }
                const dynamic = new Dynamic(token.offset, name);
                attach(dynamic);
                break;
            }
            case "equal":
            case "identifier": {
                const identifier = new Identifier(token.offset, token.value);
                if (token.type === "equal" || identifier.value in commands) {
                    const command = new Command(identifier);
                    parents.unshift(command);
                    attach(command);
                }
                else {
                    attach(identifier);
                }
                current++;
                break;
            }
            case "symbol": {
                const symbol = new Symbol(token.offset, token.value);
                attach(symbol);
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

    function attach(node: Node) {
        const container = isCommand(node) ? currentBlock?.children : parents[0]?.arguments;
        (container ?? root.children).push(node);
    }

    function mismatchAfter(token: Token, next: Token | undefined, ...expectedTypes: TokenType[]) {
        diagnostics.push({
            message: `Expected ${joinWordsOr(expectedTypes)} token after "${token.value}"${next ? `, got "${next.type}"` : ""}.`,
            offset: next?.offset ?? (token.offset + token.value.length),
            length: next?.value.length ?? 0
        });
    }
}