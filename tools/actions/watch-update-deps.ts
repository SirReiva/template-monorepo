import { exec, spawn, type ChildProcessByStdio } from "node:child_process";
import { once } from "node:events";
import { relative, resolve, sep } from "node:path";
import { cwd } from "node:process";
import { promisify } from "node:util";
import { build } from "tools/compiler";
import {
	getDirectories,
	getProjectWorskspaceDeps,
	updateReferences,
	workspaceDir,
} from "tools/utils";
import Watcher from "watcher";

const packageNames = await getDirectories(
	resolve(import.meta.dirname, `../../${workspaceDir}`)
);
const packageName = process.argv[process.argv.length - 1];

if (!packageName || !packageNames.includes(packageName))
	throw new Error(`Invalid package ${packageName}`);

const execAsync = promisify(exec);
const watchFolder = resolve(cwd(), "./packages");

console.log(watchFolder);

const watcher = new Watcher(watchFolder, {
	recursive: true,
	ignoreInitial: true,
});

let subProcess: ChildProcessByStdio<null, null, null> | null;
let isUpdating = false;

const updater = async (fileChangePath: string | null) => {
	if (fileChangePath) {
		const updateFileProject = relative(
			resolve(cwd(), "packages"),
			fileChangePath
		)
			.split(sep)
			.shift();
		const deps = [
			...(await getProjectWorskspaceDeps(packageName)),
			packageName,
		];
		const contains = !!deps.find((p) => p === updateFileProject);
		if (!contains) return;
	}
	if (isUpdating) return;
	isUpdating = true;
	console.clear();
	if (subProcess) {
		subProcess.kill("SIGTERM");
		await once(subProcess, "close");
	}
	await updateReferences();
	// const {
	// 	stdout,
	// 	stderr,
	// 	code = 0,
	// } = (await execAsync(
	// 	`npx tsc -b ./packages/${packageName}/tsconfig.package.json --verbose`,
	// 	{
	// 		cwd: cwd(),
	// 	}
	// ).catch((err) => {
	// 	return { stdout: undefined, stderr: err.stdout, code: err.code };
	// })) as any;
	// console.log(stdout);
	// console.log(stderr);
	const code = !build(packageName);
	if (!code) {
		subProcess = spawn(
			"node",
			["--import=./loader/index.mjs", `./dist/${packageName}/main.js`],
			{
				cwd: cwd(),
				stdio: [process.stdin, process.stdout, process.stderr],
			}
		);
		subProcess.once("spawn", () => {
			//console.clear();
		});
		subProcess.once("close", () => {
			subProcess = null;
		});
	}
	isUpdating = false;
};

watcher.on("add", (filePath) => {
	updater(filePath);
});
watcher.on("change", (filePath) => {
	updater(filePath);
});
watcher.on("rename", (_filePath, filePathNext) => {
	updater(filePathNext);
});
watcher.on("unlink", (filePath) => {
	updater(filePath);
});

updater(null);
