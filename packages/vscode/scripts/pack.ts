import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { $ } from "zx";

main();

async function main() {
    const dir = resolve(__dirname, "../package.json");
    const text = await readFile(dir, "utf-8");
    const json = JSON.parse(text);

    json.devDependencies["@types/vscode"] = json.engines.vscode;

    await writeFile(dir, JSON.stringify(json));
    await $`vsce package --no-dependencies`;
    await writeFile(dir, text);
}