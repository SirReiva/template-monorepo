import { serve } from "@hono/node-server";
import { port } from "@template/common";
import { showRoutes } from "hono/dev";
import { app } from "./app";

serve({
	fetch: app.fetch,
	port,
});
showRoutes(app);

// const a: number = "a";

console.log(`Server is running on: http://localhost:${port}...`);
