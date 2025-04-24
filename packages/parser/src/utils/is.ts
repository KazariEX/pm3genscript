import type { Block, Command, Dynamic, Identifier, Macro, Node, NumberLiteral, Root, StringLiternal, Symbol } from "../node";

export function isRoot(node: Node): node is Root {
    return node.type === "root";
}

export function isBlock(node: Node): node is Block {
    return node.type === "block";
}

export function isMacro(node: Node): node is Macro {
    return node.type === "macro";
}

export function isCommand(node: Node): node is Command {
    return node.type === "command";
}

export function isDynamic(node: Node): node is Dynamic {
    return node.type === "dynamic";
}

export function isIdentifier(node: Node): node is Identifier {
    return node.type === "identifier";
}

export function isSymbol(node: Node): node is Symbol {
    return node.type === "symbol";
}

export function isNumberLiteral(node: Node): node is NumberLiteral {
    return node.type === "number";
}

export function isStringLiteral(node: Node): node is StringLiternal {
    return node.type === "string";
}