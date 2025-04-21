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

export abstract class Parent extends Node {
    arguments: Argument[] = [];

    constructor(
        public override type: string,
        public override offset: number,
        public name: Identifier
    ) {
        super(type, offset);
    }

    getEnd() {
        return this.arguments.length ? this.arguments.at(-1)!.getEnd() : this.name.getEnd();
    }
}

export class Macro extends Parent {
    constructor(
        public override offset: number,
        public override name: Identifier
    ) {
        super("macro", offset, name);
    }
}

export class Command extends Parent {
    constructor(
        public override name: Identifier
    ) {
        super("command", name.offset, name);
    }
}

export class Dynamic extends Node {
    constructor(
        public override offset: number,
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
        public override type: string,
        public override offset: number,
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
    constructor(
        public override offset: number,
        public override value: string
    ) {
        super("identifier", offset, value);
    }
}

export class NumberLiteral extends Literal {
    constructor(
        public override offset: number,
        public override value: string
    ) {
        super("number", offset, value);
    }
}

export class StringLiternal extends Literal {
    constructor(
        public override offset: number,
        public override value: string
    ) {
        super("string", offset, value);
    }
}

export type Argument = Dynamic | Identifier | NumberLiteral | StringLiternal;

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