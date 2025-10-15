//@ts-check
import figlet from "figlet";
import { rainbow } from 'gradient-string';
import { lstat } from "node:fs/promises";
import { isBuiltin } from "node:module";
import { dirname, resolve as fsResolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import packageJson from "../package.json" with { type: "json" };

const workspaceName = `@${packageJson.name}`;
const version = packageJson.version;

const packagesFolder = fsResolve(import.meta.dirname, '../packages');
const nodeModulesFolder = fsResolve(import.meta.dirname, '../node_modules');

const baseURL = pathToFileURL(packagesFolder).href;

export async function initialize({ packageName }) {
	figlet(`${workspaceName}/${packageName}#${version}`, (_, text = '') => console.log(rainbow.multiline(text)));
	console.log(`NodeJS${process.version}`);
}


/**
 * @param {Parameters<import("node:module").ResolveHook>[0]} specifier
 * @param {Parameters<import("node:module").ResolveHook>[1]} context
 * @param {Parameters<import("node:module").ResolveHook>[2]} next
 * @returns {Promise<import("node:module").ResolveFnOutput>}
 */
export async function resolve(specifier, context, next) {
	const initial = specifier;
	let { parentURL = baseURL } = context;

	if (
		isBuiltin(specifier) ||
		(!specifier.startsWith("./") &&
		!specifier.startsWith("../") &&
		!specifier.startsWith(workspaceName)) || fileURLToPath(parentURL).startsWith(nodeModulesFolder)
	) {
		return next(specifier, context);
	}

	if (specifier.startsWith(workspaceName)) {
		const packageName = specifier.replace(`${workspaceName}/`,'').split('../').pop();
		specifier = specifier.replace(workspaceName + '/' + packageName, "");
		parentURL = pathToFileURL(fsResolve(packagesFolder, `./${packageName}/src`)).toString();
	}

	const parentPath = initial.startsWith('.') ? fileURLToPath(dirname(parentURL)) : fileURLToPath(parentURL);
	const stat =  await lstat(fsResolve(parentPath, specifier)).catch(() => null);
	specifier = pathToFileURL(stat?.isDirectory() ? fsResolve(parentPath, specifier, 'index.ts') : fsResolve(parentPath, specifier + '.ts')).href;
	try {
		return await next(specifier ,context);
	} catch (error) {
		if (error.code === "MODULE_NOT_FOUND") {
			error.code = "ERR_MODULE_NOT_FOUND";
		}
		error.specifier = specifier;
		error.base = initial;
		error.parent = parentPath;
		throw error;
	}
}
