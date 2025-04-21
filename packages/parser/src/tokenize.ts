import type { Diagnostic, Token, TokenType } from "./types";

export function tokenize(text: string) {
    const tokens: Token[] = [];
    const diagnostics: Diagnostic[] = [];
    const textLength = text.length;
    let idx = 0;

    while (idx < textLength) {
        const char = text[idx];
        switch (char) {
            case "#": {
                add("hash", char, idx);
                idx++;
                break;
            }
            case "@": {
                add("at", char, idx);
                idx++;
                break;
            }
            case "=": {
                add("equal", char, idx);
                idx++;
                break;
            }
            default: {
                const offset = idx;
                let value = "";
                let next = char;
                if (isWhitespace(char)) {
                    do {
                        next = text[++idx];
                    } while (idx < textLength && isWhitespace(next));
                    break;
                }
                else if (isAlpha(char)) {
                    do {
                        value += next;
                        next = text[++idx];
                    } while (idx < textLength && (isAlphaNumeric(next) || next === "_"));
                    add("identifier", value, offset);
                    break;
                }
                else if (isDigit(char)) {
                    let isHex = false;
                    do {
                        value += next;
                        next = text[++idx];
                        if (value.length === 1 && next === "x") {
                            isHex = true;
                            value += next;
                            next = text[++idx];
                        }
                    } while (idx < textLength && (isHex ? isHexNumeric(next) : isDigit(next)));
                    add("number", value, offset);
                    break;
                }
                else if (char === "\"" || char === "'") {
                    const quote = char;
                    do {
                        value += next;
                        next = text[++idx];
                    } while (idx < textLength && next !== quote);
                    value += next;
                    idx++;
                    add("string", value, offset);
                    break;
                }
                else {
                    diagnostics.push({
                        message: `Unexpected character "${char}".`,
                        offset: idx,
                        length: 1
                    });
                }
            }
        }
    }

    return {
        tokens,
        diagnostics
    };

    function add(type: TokenType, value: string, offset: number) {
        tokens.push({
            type,
            value,
            offset
        });
    }
}

function isWhitespace(char: string) {
    return char === " " || char === "\n" || char === "\r" || char === "\t";
}

function isAlpha(char: string) {
    const code = char.charCodeAt(0);
    return code >= 97 && code <= 122 || code >= 65 && code <= 90;
}

function isDigit(char: string) {
    const code = char.charCodeAt(0);
    return code >= 48 && code <= 57;
}

function isAlphaNumeric(char: string) {
    const code = char.charCodeAt(0);
    return code >= 97 && code <= 122
        || code >= 65 && code <= 90
        || code >= 48 && code <= 57;
}

function isHexNumeric(char: string) {
    const code = char.charCodeAt(0);
    return code >= 97 && code <= 102
        || code >= 65 && code <= 70
        || code >= 48 && code <= 57;
}