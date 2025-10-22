import { spawn } from "child_process";
import inquirer from "inquirer";
import { resolve, sep } from "path";
import { cwd } from "process";
import {
	getDirectories,
	getPackageScripts,
	isWindows,
	workspaceDir,
} from "tools/utils";
import z4 from "zod/v4";

console.clear();

const packageNames = await getDirectories(
	resolve(import.meta.dirname, `..${sep}..${sep}${workspaceDir}`)
);

const scriptablePackages = (
	await Promise.all(
		packageNames.map(async (packageName) => {
			const scripts = await getPackageScripts(packageName);
			if (Object.keys(scripts).length === 0) return null;
			return { packageName, scripts };
		})
	)
).filter((pkg) => pkg !== null);

const scriptablePackaNames = scriptablePackages.map((pkg) => pkg.packageName);

const packageSchema = z4.enum(scriptablePackaNames).optional();

let packageName =
	packageSchema.safeParse(process.argv[process.argv.length - 2]).data ??
	(await inquirer
		.prompt([
			{
				type: "list",
				name: "packageName",
				message: "Select a package to run a script for:",
				choices: scriptablePackaNames,
			},
		])
		.then((answers) => answers.packageName as string)
		.catch(() => undefined));

if (!packageName || !scriptablePackaNames.includes(packageName))
	throw new Error(`Invalid package ${packageName}`);

const currentScriptablePackage = scriptablePackages.find(
	(pkg) => pkg!.packageName === packageName
)!;

const scriptSchema = z4
	.enum(Object.keys(currentScriptablePackage.scripts))
	.optional();

const scriptName =
	scriptSchema.safeParse(process.argv[process.argv.length - 1]).data ??
	(await inquirer
		.prompt([
			{
				type: "list",
				name: "scriptName",
				message: "Select a script to run:",
				choices: Object.keys(currentScriptablePackage.scripts),
			},
		])
		.then((answers) => answers.scriptName as string)
		.catch(() => undefined));

if (!scriptName) throw new Error(`Invalid script ${scriptName}`);

const runScript = currentScriptablePackage.scripts[scriptName];

if (!runScript)
	throw new Error(`${packageName} ${scriptName} script not defined`);

const { command, args } = runScript;

const npmCommand = isWindows && command === "npm" ? `${command}.cmd` : command;

const dir = resolve(cwd(), "packages", packageName);

try {
	process.loadEnvFile(resolve(dir, `.${sep}.env.dev`));
} catch (error) {}

console.clear();
spawn(npmCommand, args, {
	cwd: dir,
	shell: true,
	stdio: [process.stdin, process.stdout, process.stderr],
	env: process.env,
});
