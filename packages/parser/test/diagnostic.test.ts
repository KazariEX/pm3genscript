import { describe, expect, it } from "vitest";
import { check } from "../src/check";
import { parse } from "../src/parse";

describe("macro", () => {
    it("unknown", () => {
        const text = `#unknown 0xA`;
        const { diagnostics } = parsec(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Unknown macro \"unknown\".",
            offset: 1,
            length: 7
        });
    });

    it("argument count mismatch", () => {
        const text = `#org 0xA 0xB`;
        const { diagnostics } = parsec(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Expected 1 argument(s), got 2.",
            offset: 9,
            length: 3
        });
    });

    it("argument type mismatch", () => {
        const text = `#org identifier`;
        const { diagnostics } = parsec(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Expected argument type \"pointer\", got \"identifier\".",
            offset: 5,
            length: 10
        });
    });

    it("break", () => {
        const text = `#break #org identifier`;
        const { diagnostics } = parsec(text);

        expect(diagnostics.length).toEqual(0);
    });
});

describe("command", () => {
    it("not inside block", () => {
        const text = `msgbox 0xA 0x2`;
        const { diagnostics } = parsec(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Command \"msgbox\" is not inside a block.",
            offset: 0,
            length: 14
        });
    });

    it("argument count mismatch", () => {
        const text = `#org 0xA msgbox 0xB 0x2 0xC`;
        const { diagnostics } = parsec(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Expected 2 argument(s), got 3.",
            offset: 24,
            length: 3
        });
    });

    it("argument type mismatch", () => {
        const text = `#org 0xA msgbox 0xB identifier`;
        const { diagnostics } = parsec(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Expected argument type \"byte\", got \"identifier\".",
            offset: 20,
            length: 10
        });
    });
});

describe("dynamic", () => {
    it("duplicate definition", () => {
        const text = `#dynamic 0xA #org @1 #org @1`;
        const { diagnostics } = parsec(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Dynamic offset \"@1\" is already defined.",
            offset: 26,
            length: 2
        });
    });

    it("undefined reference", () => {
        const text = `#dynamic 0xA #org @1 msgbox @2 0x2 end`;
        const { diagnostics } = parsec(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Dynamic offset \"@2\" is not defined.",
            offset: 28,
            length: 2
        });
    });
});

describe("symbol", () => {
    it("undefined reference", () => {
        const text = `#org 0xA msgbox 0xB MSG_FATE end`;
        const { diagnostics } = parsec(text);

        expect(diagnostics.length).toEqual(2);
        expect(diagnostics[0]).toEqual({
            message: "Symbol \"MSG_FATE\" is not defined.",
            offset: 20,
            length: 8
        });
    });
});

describe("other", () => {
    it("unexpected node at the root", () => {
        const text = `0xA`;
        const { diagnostics } = parsec(text);

        expect(diagnostics.length).toEqual(1);
        expect(diagnostics[0]).toEqual({
            message: "Expected \"macro\" or \"command\" node at the root, got \"number\"",
            offset: 0,
            length: 3
        });
    });
});

function parsec(text: string) {
    const parsed = parse(text);
    const checked = check(parsed.ast);

    return {
        ast: parsed.ast,
        diagnostics: [
            ...parsed.diagnostics,
            ...checked.diagnostics
        ]
    };
}