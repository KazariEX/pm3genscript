import { isBlock, isCommand, isDynamic, isMacro, isRoot } from "./is";
import type { Command, Macro, Node } from "../node";

export function forEachNode(
    node: Node,
    visit: (node: Node, parent: Node | undefined, parents: Node[]) => void
) {
    const parents: Node[] = [];
    traverse(node);

    function traverse(node: Node) {
        visit(node, parents[parents.length - 1], parents);

        parents.push(node);
        if (isRoot(node)) {
            for (const child of node.children) {
                traverse(child);
            }
        }
        else if (isBlock(node)) {
            traverse(node.label);
            for (const child of node.children) {
                traverse(child);
            }
        }
        else if (isMacro(node) || isCommand(node)) {
            traverse(node.name);
            for (const arg of node.arguments) {
                traverse(arg);
            }
        }
        else if (isDynamic(node)) {
            traverse(node.name);
        }
        parents.pop();
    }
}

export function* forEachStatement(children: Node[]): Generator<Macro | Command> {
    for (const child of children) {
        if (isBlock(child)) {
            yield child.label;
            yield* child.children;
        }
        else if (isMacro(child) || isCommand(child)) {
            yield child;
        }
    }
}