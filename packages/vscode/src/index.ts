import * as protocol from "@volar/language-server/protocol";
import { createLabsInfo, getTsdk, type LanguageClientOptions } from "@volar/vscode";
import { LanguageClient, type ServerOptions, TransportKind } from "@volar/vscode/node";
import { defineExtension, onDeactivate } from "reactive-vscode";
import * as vscode from "vscode";

export const { activate, deactivate } = defineExtension(async (context) => {
    const serverModule = vscode.Uri.joinPath(context.extensionUri, "dist", "server.js");
    const serverOptions: ServerOptions = {
        run: {
            module: serverModule.fsPath,
            transport: TransportKind.ipc,
            options: { execArgv: [] }
        },
        debug: {
            module: serverModule.fsPath,
            transport: TransportKind.ipc,
            options: { execArgv: ["--nolazy", "--inspect=6009"] }
        }
    };
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{
            language: "pm3genscript"
        }],
        initializationOptions: {
            typescript: {
                tsdk: (await getTsdk(context))!.tsdk
            }
        }
    };
    const client = new LanguageClient(
        "pm3genscript-language-server",
        "PM3GenScript Language Server",
        serverOptions,
        clientOptions
    );
    await client.start();

    onDeactivate(() => {
        return client.stop();
    });

    const labsInfo = createLabsInfo(protocol);
    labsInfo.addLanguageClient(client);
    return labsInfo.extensionExports;
});