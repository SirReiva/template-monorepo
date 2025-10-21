import figlet from "figlet";
import gradient from "gradient-string";
import { spawnSync } from "node:child_process";
import { register } from "node:module";
import { basename, resolve } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import YAML from "yaml";
import packageJson from "../package.json" assert { type: "json" };

const workspaceName = `@${packageJson.name}`;
const version = packageJson.version;

const typeGradients = Object.keys(gradient);

const typeGradient = typeGradients[
	Math.floor(Math.random() * typeGradients.length)
] as keyof typeof gradient;
const typeGradientFn = gradient[typeGradient];

const mode = new URL(import.meta.url).searchParams.get("mode");

const packageName = basename(
	cwd().replace(resolve(import.meta.dirname, "../packages"), "")
);
console.clear();
register("../../loader/loader.ts", pathToFileURL("./"), {
	data: {
		packageName,
		workspaceName,
		version,
	},
	parentURL: pathToFileURL("./"),
});

if (mode === "dev") {
	console.time("Start time");

	console.time("Updating dependencies");
	const dependecies = await import("../tools/utils").then(async (utils) =>
		utils.updateProjectReferencesDeep(packageName)
	);
	console.timeEnd("Updating dependencies");
	console.warn(YAML.stringify({ dependecies }, { indent: 2 }).trim());

	console.time("Type Checking");
	const result = spawnSync(
		"npx",
		["tsc", "-b", `./packages/${packageName}/tsconfig.package.json`],
		{
			cwd: resolve(import.meta.dirname, "../"),
			stdio: [undefined, process.stdout, process.stderr],
		}
	);
	console.timeEnd("Type Checking");
	console.timeEnd("Start time");
	if (result.status !== 0 || result.error) {
		process.exit(result.status ?? 1);
	} else {
		console.log(`NodeJS${process.version}`);
		console.log(
			typeGradientFn.multiline(
				(await figlet(
					`${workspaceName}/${packageName}#${version}`,
					{}
				)) ?? ""
			)
		);
	}
}
