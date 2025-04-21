import { describe, expect, it } from "vitest";
import { parse, walkTokens } from "../src/parse";
import { tokenize } from "../src/tokenize";
import { transform } from "../src/transform";

describe("basic", () => {
    const text = `
#dynamic 0xA00000

#org @1
msgbox @2 MSG_FACE
end

#org @2
= "你自己魔怔吧，我要去二次元了。"
`.trim();

    const { tokens, diagnostics: tokenizedDiagnostics } = tokenize(text);
    const { root, diagnostics: walkedDiagnostics } = walkTokens(text, tokens);
    const { ast, diagnostics: transformedDiagnostics } = transform(root);

    it("tokenize", () => {
        expect(tokenizedDiagnostics.length).toEqual(0);
        expect(tokens).toMatchSnapshot();
    });

    it("parse", () => {
        expect(walkedDiagnostics.length).toEqual(0);
        expect(root).toMatchSnapshot();
    });

    it("transform", () => {
        expect(transformedDiagnostics.length).toEqual(0);
        expect(ast).toMatchSnapshot();
    });
});

describe("diagnostic > macro", () => {
    it("unknown", () => {
        const text = `#unknown 0xA00000`;
        const { diagnostics } = parse(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Unknown macro \"unknown\".",
            offset: 1,
            length: 7
        });
    });

    it("argument count mismatch", () => {
        const text = `#org 0xA 0xB`;
        const { diagnostics } = parse(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Expected 1 arguments, got 2.",
            offset: 0,
            length: 12
        });
    });
});

describe("diagnostic > command", () => {
    it("argument count mismatch", () => {
        const text = `#org 0xA msgbox 0xB MSG_FACE 0xC`;
        const { diagnostics } = parse(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Expected 2 arguments, got 3.",
            offset: 9,
            length: 23
        });
    });

    it("not inside block", () => {
        const text = `msgbox 0xA MSG_FACE`;
        const { diagnostics } = parse(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Command \"msgbox\" is not inside a block.",
            offset: 0,
            length: 19
        });
    });
});

describe("diagnostic > other", () => {
    it("unexpected node at the root", () => {
        const text = `0xA`;
        const { diagnostics } = parse(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Expected \"macro\" or \"command\" node at the root, got \"number\"",
            offset: 0,
            length: 3
        });
    });
});