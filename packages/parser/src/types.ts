export interface ParseError {
    message: string;
    offset: number;
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

export interface Node {
    type: string;
    offset: number;
}

export interface Root extends Node {
    type: "root";
    children: Node[];
}

export interface Macro extends Node {
    type: "macro";
    name: Identifier;
    arguments: Argument[];
}

export interface Command extends Node {
    type: "command";
    name: Identifier;
    arguments: Argument[];
}

export interface Dynamic extends Node {
    type: "dynamic";
    name: Identifier;
}

export interface Identifier extends Node {
    type: "identifier";
    value: string;
}

export interface NumberLiteral extends Node {
    type: "number";
    value: string;
}

export interface StringLiternal extends Node {
    type: "string";
    value: string;
}

export type Argument = Dynamic | Identifier | NumberLiteral | StringLiternal;