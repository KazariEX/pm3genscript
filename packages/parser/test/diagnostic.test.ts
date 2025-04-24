import { describe, expect, it } from "vitest";
import type { Diagnostic } from "@pm3genscript/parser";
import { check } from "../src/check";
import { parse } from "../src/parse";

describe("tokenize", () => {
    it("unexpected character", () => {
        diagnose(`#org &1`, 0, {
            message: `Unexpected character "&".`,
            offset: 5,
            length: 1
        });
    });
});

describe("parse", () => {
    it("unexpected token after hash", () => {
        diagnose(`#233`, 0, {
            message: `Expected "identifier" token after "#", got "number".`,
            offset: 1,
            length: 3
        });
    });

    it("unexpected token after at", () => {
        diagnose(`#org @"233"`, 0, {
            message: `Expected "identifier" or "number" token after "@", got "string".`,
            offset: 6,
            length: 5
        });
    });
});

describe("macro", () => {
    it("unknown", () => {
        diagnose(`#unknown 0xA`, 0, {
            message: `Unknown macro "unknown".`,
            offset: 1,
            length: 7
        });
    });

    it("argument count mismatch", () => {
        diagnose(`#org 0xA 0xB`, 0, {
            message: `Expected 1 argument(s), got 2.`,
            offset: 9,
            length: 3
        });
    });

    it("argument type mismatch", () => {
        diagnose(`#org identifier`, 0, {
            message: `Expected argument type "pointer", got "identifier".`,
            offset: 5,
            length: 10
        });
    });

    it("break", () => {
        diagnose(`#break #org identifier`, 0);
    });
});

describe("command", () => {
    it("not inside block", () => {
        diagnose(`msgbox 0xA 0x2`, 0, {
            message: `Command "msgbox" is not inside a block.`,
            offset: 0,
            length: 14
        });
    });

    it("argument count mismatch", () => {
        diagnose(`#org 0xA msgbox 0xB 0x2 0xC`, 0, {
            message: `Expected 2 argument(s), got 3.`,
            offset: 24,
            length: 3
        });

        diagnose(`#org 0xA trainerbattle 0x3 0x0 0x0 0x0 0x0`, 0, {
            message: `Expected 4 argument(s), got 5.`,
            offset: 39,
            length: 3
        });

        diagnose(`#org 0xA trainerbattle 0x6 0x0 0x0 0x0 0x0`, 0, {
            message: `Expected 7 argument(s), got 5.`,
            offset: 9,
            length: 33
        });
    });

    it("argument type mismatch", () => {
        diagnose(`#org 0xA msgbox 0xB identifier`, 0, {
            message: `Expected argument type "byte", got "identifier".`,
            offset: 20,
            length: 10
        });
    });
});

describe("dynamic", () => {
    it("duplicate definition", () => {
        diagnose(`#dynamic 0xA #org @1 #org @1`, 0, {
            message: `Dynamic offset "@1" is already defined.`,
            offset: 26,
            length: 2
        });
    });

    it("undefined reference", () => {
        diagnose(`#dynamic 0xA #org @1 msgbox @2 0x2 end`, 0, {
            message: `Dynamic offset "@2" is not defined.`,
            offset: 28,
            length: 2
        });
    });
});

describe("symbol", () => {
    it("undefined reference", () => {
        diagnose(`#org 0xA msgbox 0xB MSG_FATE end`, 0, {
            message: `Symbol "MSG_FATE" is not defined.`,
            offset: 20,
            length: 8
        });
    });
});

describe("other", () => {
    it("unexpected node at the root", () => {
        diagnose(`0xA`, 0, {
            message: `Expected "macro" or "command" node at the root, got "number"`,
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

function diagnose(
    text: string,
    index: number,
    expected?: Diagnostic
) {
    const { diagnostics } = parsec(text);
    expect(diagnostics[index]).toEqual(expected);
}