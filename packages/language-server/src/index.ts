import { createConnection, createServer, createSimpleProject } from "@volar/language-server/node";
import { ptsLanguagePlugin } from "./languagePlugin";
import ptsMainPlugin from "./services/main";

const connection = createConnection();
const server = createServer(connection);

connection.listen();

connection.onInitialize((params) => {
    return server.initialize(
        params,
        createSimpleProject([ptsLanguagePlugin]),
        [
            ptsMainPlugin()
        ]
    );
});

connection.onInitialized(server.initialized);

connection.onShutdown(server.shutdown);