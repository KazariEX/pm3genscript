import { commands, macros } from "@pm3genscript/shared";

export abstract class Node {
    constructor(
        public type: string,
        public offset: number
    ) {}

    getText(root: Root) {
        return root.text.slice(this.offset, this.getEnd());
    }

    abstract getEnd(): number;

    getLength() {
        return this.getEnd() - this.offset;
    }
}

export class Root extends Node {
    children: Node[] = [];

    constructor(
        public text: string
    ) {
        super("root", 0);
    }

    override getText() {
        return this.text;
    }

    getEnd() {
        return this.text.length;
    }
}

export class Block extends Node {
    children: Command[] = [];

    constructor(
        public label: Macro
    ) {
        super("block", label.offset);
    }

    getEnd() {
        return this.children.length ? this.children.at(-1)!.getEnd() : this.label.getEnd();
    }
}

export abstract class Parent extends Node {
    arguments: Argument[] = [];

    constructor(
        type: string,
        offset: number,
        public name: Identifier
    ) {
        super(type, offset);
    }

    getEnd() {
        return this.arguments.length ? this.arguments.at(-1)!.getEnd() : this.name.getEnd();
    }
}

export class Macro extends Parent {
    canonicalName: string;

    constructor(offset: number, name: Identifier) {
        super("macro", offset, name);
        this.canonicalName = macros[name.value]?.redirect ?? name.value;
    }

    get template() {
        return macros[this.canonicalName];
    }
}

export class Command extends Parent {
    canonicalName: string;

    constructor(name: Identifier) {
        super("command", name.offset, name);
        this.canonicalName = commands[name.value]?.redirect ?? name.value;
    }

    get template() {
        return commands[this.canonicalName];
    }
}

export class Dynamic extends Node {
    constructor(
        offset: number,
        public name: Identifier
    ) {
        super("dynamic", offset);
    }

    getEnd() {
        return this.name.getEnd();
    }
}

export abstract class Literal extends Node {
    constructor(
        type: string,
        offset: number,
        public value: string
    ) {
        super(type, offset);
    }

    override getText() {
        return this.value;
    }

    getEnd() {
        return this.offset + this.value.length;
    }

    override getLength() {
        return this.value.length;
    }
}

export class Identifier extends Literal {
    constructor(offset: number, value: string) {
        super("identifier", offset, value);
    }
}

export class Symbol extends Literal {
    constructor(offset: number, value: string) {
        super("symbol", offset, value);
    }
}

export class NumberLiteral extends Literal {
    constructor(offset: number, value: string) {
        super("number", offset, value);
    }
}

export class StringLiternal extends Literal {
    constructor(offset: number, value: string) {
        super("string", offset, value);
    }
}

export type Argument = Dynamic | Identifier | Symbol | NumberLiteral | StringLiternal;