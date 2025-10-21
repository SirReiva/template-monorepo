import figlet from "figlet";
import { rainbow } from "gradient-string";
import { basename, resolve } from "path";
import { cwd } from "process";
import type { Plugin } from "vite";
import packageJson from "../package.json" assert { type: "json" };

const workspaceName = `@${packageJson.name}`;
const version = packageJson.version;

const packageName = basename(
	cwd().replace(resolve(import.meta.dirname, "../packages"), "")
);

export const loaderMonorepoPlugin: Plugin = {
	name: "loader-monorepo",
	config() {
		console.clear();
		figlet(`${workspaceName}/${packageName}#${version}`, (_, text = "") =>
			console.log(rainbow.multiline(text))
		);
		console.log(`NodeJS${process.version}`);
	},
};
