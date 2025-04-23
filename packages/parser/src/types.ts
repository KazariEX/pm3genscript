export interface Diagnostic {
    message: string;
    offset: number;
    length: number;
}

export interface Token {
    type: TokenType;
    value: string;
    offset: number;
}

export interface TokenTypeMap {
    hash: "hash";
    at: "at";
    equal: "equal";
    identifier: "identifier";
    symbol: "symbol";
    number: "number";
    string: "string";
}

export type TokenType = TokenTypeMap[keyof TokenTypeMap];