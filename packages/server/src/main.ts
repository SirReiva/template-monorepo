import { serve } from "@hono/node-server";
import { swaggerUI } from "@hono/swagger-ui";
import { OpenAPIHono, createRoute } from "@hono/zod-openapi";
import { apiReference } from "@scalar/hono-api-reference";
import { port } from "@template/common";
import { contextStorage } from "hono/context-storage";
import { showRoutes } from "hono/dev";
import { logger } from "hono/logger";
import { trimTrailingSlash } from "hono/trailing-slash";
import { install } from "source-map-support";
import { z } from "zod";

install({
  environment: "node",
});

const app = new OpenAPIHono();

app.use(contextStorage());
app.use(trimTrailingSlash());
app.use(logger());

app.doc("/doc", {
  openapi: "3.0.0",
  info: {
    version: "1.0.0",
    title: "My API",
  },
});

app.get(
  "/reference",
  apiReference({
    spec: {
      url: "/doc",
    },
  })
);

app.get("/ui", swaggerUI({ url: "/doc" }));

const route = createRoute({
  method: "get",
  path: "/",
  request: {
    query: z.object({
      hello: z.string().optional(),
    }),
  },
  responses: {
    200: {
      content: {
        "application/json": {
          schema: z.object({
            hello: z.string().optional(),
            var: z.string(),
          }),
        },
      },
      description: "say hello",
    },
  },
});

app.openapi(route, (c) => {
  const query = c.req.valid("query");
  return c.json({ hello: query.hello, var: "" }, 200);
});

serve({
  fetch: app.fetch,
  port,
});
showRoutes(app);
console.log(`Server is running on http://localhost:${port}`);
