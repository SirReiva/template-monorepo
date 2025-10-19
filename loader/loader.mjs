//@ts-check
import figlet from "figlet";
import { rainbow } from 'gradient-string';
import { lstat } from "node:fs/promises";
import { isBuiltin } from "node:module";
import { resolve as fsResolve } from "node:path";
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
 * @param {String} basePath
 * @returns {Promise<String>}
 */
const findFile = async(basePath) => {
	const dirStat = await lstat(basePath).catch((err) =>{
		if (err.code === 'ENOENT') return null;
		throw err;
	});

	if (dirStat?.isDirectory()) return `${basePath}/index.ts`;

	return `${basePath}.ts`
}

/**
 * @param {String} specifier
 * @returns {Promise<String>}
 */
const resolveAliasImport = async(specifier) => {
	const parts = specifier.replace(`${workspaceName}/`,'').split('/')
	const packageName = parts.shift();
	const fileOrFolder = fsResolve(packagesFolder, `./${packageName}/src`, ...parts);
	const targetFile = await findFile(fileOrFolder);
	const targetSpecifier = pathToFileURL(targetFile).href;
	return targetSpecifier;
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


	try {
		if(specifier.startsWith(workspaceName)) return await next(await resolveAliasImport(specifier) ,context);

		return next(pathToFileURL(await findFile(specifier)).href, context)
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
