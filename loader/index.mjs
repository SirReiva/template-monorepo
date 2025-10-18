//@ts-check
import { exec, spawnSync } from "node:child_process";
import { register } from "node:module";
import { basename, resolve } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
const execAsync = promisify(exec);

const packageName = basename(
	cwd().replace(resolve(import.meta.dirname, "../packages"), "")
);

console.clear();
console.time("Start time");
console.time("Updating dependencies");
await execAsync(`tsx ../tools/actions/pre-dev.ts ${packageName}`, {
	cwd: import.meta.dirname,
});
console.timeEnd("Updating dependencies");

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
	register("../../loader/loader.mjs", pathToFileURL("./"), {
		data: {
			packageName,
		},
		parentURL: pathToFileURL("./"),
	});
}
