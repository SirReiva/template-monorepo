import { serve } from "@hono/node-server";
import { port } from "@template/common";
import { showRoutes } from "hono/dev";
import { install } from "source-map-support";
import { app } from "./app";

install({
	environment: "node",
});

serve({
	fetch: app.fetch,
	port,
});
showRoutes(app);

console.log(`Server is running on http://localhost:${port}`);
