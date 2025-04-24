import { createConnection, createServer, createSimpleProject } from "@volar/language-server/node";
import { ptsLanguagePlugin } from "./languagePlugin";
import { createDefinitionPlugin } from "./services/definition";
import { createDiagnosticsPlugin } from "./services/diagnostics";
import { createHoverPlugin } from "./services/hover";
import { createReferencesPlugin } from "./services/references";
import { createRenamePlugin } from "./services/rename";

const connection = createConnection();
const server = createServer(connection);

connection.listen();

connection.onInitialize((params) => {
    return server.initialize(
        params,
        createSimpleProject([ptsLanguagePlugin]),
        [
            createDefinitionPlugin(),
            createDiagnosticsPlugin(),
            createHoverPlugin(),
            createReferencesPlugin(),
            createRenamePlugin()
        ]
    );
});

connection.onInitialized(server.initialized);

connection.onShutdown(server.shutdown);