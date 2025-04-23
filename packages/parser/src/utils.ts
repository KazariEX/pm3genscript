import { Block, Command, Dynamic, Macro, type Node, Parent, Root } from "./node";

export function forEachNode(
    node: Node,
    visit: (node: Node, parent: Node | undefined, parents: Node[]) => void
) {
    const parents: Node[] = [];
    traverse(node);

    function traverse(node: Node) {
        visit(node, parents[parents.length - 1], parents);

        parents.push(node);
        if (node instanceof Root) {
            for (const child of node.children) {
                traverse(child);
            }
        }
        else if (node instanceof Block) {
            traverse(node.label);
            for (const child of node.children) {
                traverse(child);
            }
        }
        else if (node instanceof Parent) {
            traverse(node.name);
            for (const arg of node.arguments) {
                traverse(arg);
            }
        }
        else if (node instanceof Dynamic) {
            traverse(node.name);
        }
        parents.pop();
    }
}

export function* forEachStatement(children: Node[]): Generator<Macro | Command> {
    for (const child of children) {
        if (child instanceof Block) {
            yield child.label;
            yield* child.children;
        }
        else if (child instanceof Macro || child instanceof Command) {
            yield child;
        }
    }
}