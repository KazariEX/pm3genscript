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
                else if (isUppercaseAlpha(char)) {
                    do {
                        value += next;
                        next = text[++idx];
                    } while (idx < textLength && (isUppercaseAlpha(next) || isNumeric(next) || next === "_"));
                    add("symbol", value, offset);
                    break;
                }
                else if (isLowercaseAlpha(char)) {
                    do {
                        value += next;
                        next = text[++idx];
                    } while (idx < textLength && (isLowercaseAlpha(next) || isNumeric(next) || next === "_"));
                    add("identifier", value, offset);
                    break;
                }
                else if (isNumeric(char)) {
                    let isHex = false;
                    do {
                        value += next;
                        next = text[++idx];
                        if (value.length === 1 && next === "x") {
                            isHex = true;
                            value += next;
                            next = text[++idx];
                        }
                    } while (idx < textLength && (isHex ? isHexNumeric(next) : isNumeric(next)));
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
                diagnostics.push({
                    message: `Unexpected character "${char}".`,
                    offset: idx,
                    length: 1
                });
                idx++;
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

function isUppercaseAlpha(char: string) {
    const code = char.charCodeAt(0);
    return code >= 65 && code <= 90;
}

function isLowercaseAlpha(char: string) {
    const code = char.charCodeAt(0);
    return code >= 97 && code <= 122;
}

function isNumeric(char: string) {
    const code = char.charCodeAt(0);
    return code >= 48 && code <= 57;
}

function isHexNumeric(char: string) {
    const code = char.charCodeAt(0);
    return code >= 97 && code <= 102
        || code >= 65 && code <= 70
        || code >= 48 && code <= 57;
}