import { spawn } from "child_process";
import { resolve, sep } from "path";
import { cwd } from "process";
import {
	getDirectories,
	getPackageScripts,
	isWindows,
	workspaceDir,
} from "tools/utils";

const packageNames = await getDirectories(
	resolve(import.meta.dirname, `..${sep}..${sep}${workspaceDir}`)
);
const packageName = process.argv[process.argv.length - 1];
const scriptName = process.argv[process.argv.length - 2];

if (!packageName || !packageNames.includes(packageName))
	throw new Error(`Invalid package ${packageName}`);

const scripts = await getPackageScripts(packageName);

const runScript = scripts[scriptName];

if (!runScript)
	throw new Error(`${packageName} ${scriptName} script not defined`);

const { command, args } = runScript;

const npmCommand = isWindows && command === "npm" ? `${command}.cmd` : command;

const dir = resolve(cwd(), "packages", packageName);

try {
	process.loadEnvFile(resolve(dir, `.${sep}.env.dev`));
} catch (error) {}

spawn(npmCommand, args, {
	cwd: dir,
	shell: true,
	stdio: [process.stdin, process.stdout, process.stderr],
	env: process.env,
});
