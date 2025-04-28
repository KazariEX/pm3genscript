import { defineConfig } from "rolldown";

export default defineConfig({
    input: {
        client: "./src/index.ts",
        server: "../language-server/src/index.ts"
    },
    output: {
        format: "cjs",
        sourcemap: true
    },
    external: [
        "vscode"
    ]
});