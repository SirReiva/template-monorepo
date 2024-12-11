//@ts-check
import { register } from "node:module";
import { sep } from "node:path";
import { pathToFileURL } from "node:url";
import { install } from "source-map-support";

install({
	environment: "node",
});

const packageName =
	process.argv[1]
		.split("dist")
		.pop()
		?.split(sep)
		.filter((s) => s.length > 0)
		.shift() ?? "";

register("./loader/loader.mjs", pathToFileURL("./"), {
	data: {
		packageName,
	},
	parentURL: pathToFileURL("./"),
});
