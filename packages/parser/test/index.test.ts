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

    const { tokens, errors: tokenizedErrors } = tokenize(text);
    const { root, errors: walkedErrors } = walkTokens(tokens);

    it("tokenize", () => {
        expect(tokenizedErrors.length).toEqual(0);
        expect(tokens).toMatchSnapshot();
    });

    it("parse", () => {
        expect(walkedErrors.length).toEqual(0);
        expect(root).toMatchSnapshot();
    });
});