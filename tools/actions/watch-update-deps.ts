import { spawn, type ChildProcessByStdio } from "child_process";
import { once } from "events";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { resolve } from "path";
import { cwd } from "process";
import { getDirectories, updateReferences, workspaceDir } from "tools/utils";
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
	debounce: 450,
});

let subProcess: ChildProcessByStdio<null, null, null> | null;
let isUpdating = false;

const updater = async () => {
	if (isUpdating) return;
	isUpdating = true;
	console.clear();
	if (subProcess) {
		subProcess.kill("SIGTERM");
		await once(subProcess, "close");
	}
	await updateReferences();
	const {
		stdout,
		stderr,
		code = 0,
	} = (await execAsync(
		`npx tsc -b ./packages/${packageName}/tsconfig.package.json --verbose`,
		{
			cwd: cwd(),
		}
	).catch((err) => {
		return { stdout: undefined, stderr: err.stdout, code: err.code };
	})) as any;
	console.log(stdout);
	console.log(stderr);
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
			console.clear();
		});
		subProcess.once("close", () => {
			subProcess = null;
		});
	}
	isUpdating = false;
};

watcher.on("add", (_filePath) => {
	updater();
});
watcher.on("change", (_filePath) => {
	updater();
});
watcher.on("rename", (_filePath, _filePathNext) => {
	updater();
});
watcher.on("unlink", (_filePath) => {
	updater();
});

updater();
