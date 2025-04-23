import { describe, expect, it } from "vitest";
import { walkTokens } from "../src/parse";
import { tokenize } from "../src/tokenize";

describe("basic", () => {
    const text = `
#dynamic 0xA00000

#org @1
msgbox @2 MSG_FACE
end

#org @2
= "你自己魔怔吧，我要去二次元了。"
`.trim();

    const tokenized = tokenize(text);
    const walked = walkTokens(text, tokenized.tokens);

    it("tokenize", () => {
        expect(tokenized.diagnostics.length).toEqual(0);
        expect(tokenized.tokens).toMatchSnapshot();
    });

    it("walk", () => {
        expect(walked.diagnostics.length).toEqual(0);
        expect(walked.root).toMatchSnapshot();
    });
});