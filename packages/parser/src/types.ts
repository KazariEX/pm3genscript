import type { Block, Command, Dynamic, Identifier, Macro } from "./node";

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
    number: "number";
    string: "string";
}

export type TokenType = TokenTypeMap[keyof TokenTypeMap];

export interface AST {
    dynamic: {
        defines: Dynamic[];
        references: Dynamic[];
    };
    symbol: {
        defines: Macro[];
        references: Identifier[];
    };
    children: ASTChild[];
}

export type ASTChild = Block | Macro | Command;