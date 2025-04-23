import { createConnection, createServer, createSimpleProject } from "@volar/language-server/node";
import { ptsLanguagePlugin } from "./languagePlugin";
import { ptsDefinitionPlugin } from "./services/definition";
import { ptsDiagnosticsPlugin } from "./services/diagnostics";
import { ptsReferencesPlugin } from "./services/references";
import { ptsRenamePlugin } from "./services/rename";

const connection = createConnection();
const server = createServer(connection);

connection.listen();

connection.onInitialize((params) => {
    return server.initialize(
        params,
        createSimpleProject([ptsLanguagePlugin]),
        [
            ptsDefinitionPlugin(),
            ptsDiagnosticsPlugin(),
            ptsReferencesPlugin(),
            ptsRenamePlugin()
        ]
    );
});

connection.onInitialized(server.initialized);

connection.onShutdown(server.shutdown);