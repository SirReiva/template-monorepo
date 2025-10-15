import { spawn } from "child_process";
import { resolve } from "path";
import { cwd } from "process";
import {
	getDirectories,
	getPackageScripts,
	isWindows,
	workspaceDir,
} from "tools/utils";

const packageNames = await getDirectories(
	resolve(import.meta.dirname, `../../${workspaceDir}`)
);
const packageName = process.argv[process.argv.length - 1];

if (!packageName || !packageNames.includes(packageName))
	throw new Error(`Invalid package ${packageName}`);

const scripts = await getPackageScripts(packageName);

const devScript = scripts["dev"];

if (!devScript) throw new Error(`${packageName} dev script not defined`);

const { command, args } = devScript;

const npmCommand = isWindows && command === "npm" ? `${command}.cmd` : command;

spawn(npmCommand, args, {
	cwd: resolve(cwd(), "packages", packageName),
	shell: true,
	stdio: [process.stdin, process.stdout, process.stderr],
});
