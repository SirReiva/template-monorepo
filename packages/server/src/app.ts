import { swaggerUI } from "@hono/swagger-ui";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { contextStorage } from "hono/context-storage";
import { logger } from "hono/logger";
import { trimTrailingSlash } from "hono/trailing-slash";
import { z } from "zod";

export const app = new OpenAPIHono({
	defaultHook: (result, c) => {
		if (!result.success) {
			throw new Error(result.error.message, {
				cause: result.error,
			});
		}
		return;
	},
});

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
	Scalar({
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
			hello: z.string().endsWith("z").optional(),
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

app.onError((err, c) => {
	return c.json(
		{ error: "Internal server error", data: (err.cause as any).issues },
		500
	);
});
