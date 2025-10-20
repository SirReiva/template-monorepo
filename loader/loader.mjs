//@ts-check
import figlet from "figlet";
import { rainbow } from 'gradient-string';
import { lstat, readFile } from "node:fs/promises";
import { isBuiltin } from "node:module";
import { dirname, extname, resolve as fsResolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import packageJson from "../package.json" with { type: "json" };

const workspaceName = `@${packageJson.name}`;
const version = packageJson.version;

const packagesFolder = fsResolve(import.meta.dirname, '../packages');
const nodeModulesFolder = fsResolve(import.meta.dirname, '../node_modules');

const baseURL = pathToFileURL(packagesFolder).href;

const cacheDir = fsResolve(import.meta.dirname, '../.cache')

/**
 * @param {{ packageName: String; }} context
 */
export async function initialize({ packageName }) {
	figlet(`${workspaceName}/${packageName}#${version}`, (_, text = '') => console.log(rainbow.multiline(text)));
	console.log(`NodeJS${process.version}`);
}

/**
 * @param {String} filePath
 * @returns {Promise<String>}
 */
const findByExtension = async (filePath) => {
	const fileStat = await lstat(`${filePath}.tsx`).catch((err) =>{
		if (err.code === 'ENOENT') return null;
		throw err;
	});

	if(fileStat) return `${filePath}.tsx`;

	return `${filePath}.ts`;
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

	if (dirStat?.isDirectory()) return await findByExtension(`${basePath}${sep}index`);

	return await findByExtension(basePath)
}

/**
 * @param {String} specifier
 * @returns {Promise<String>}
 */
const resolveAliasImport = async(specifier) => {
	const parts = specifier.replace(`${workspaceName}${sep}`,'').split(sep)
	const packageName = parts.shift();
	const fileOrFolder = fsResolve(packagesFolder, `./${packageName}${sep}src`, ...parts);
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

		const filefullName = fsResolve(dirname(fileURLToPath(parentURL)), specifier);
		return next(pathToFileURL(await findFile(filefullName)).href, context);
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


/**
 * @param {Parameters<import("node:module").LoadHook>[0]} url
 * @param {Parameters<import("node:module").LoadHook>[1]} context
 * @param {Parameters<import("node:module").LoadHook>[2]} defaultLoad
 * @returns {Promise<import("node:module").LoadFnOutput>}
 */
export async function load(url, context, defaultLoad) {
	try {
		const fileFullPath = fileURLToPath(url);
		const ext = extname(fileFullPath);
		if (ext === '.tsx') {
			const parts = fileFullPath.split(`${sep}packages${sep}`).pop()?.split(sep);
			const packageName = parts?.shift() ?? '';
			parts?.shift();
			const pathRelative = parts?.join(sep) ?? '';
			const cacheFile = fsResolve(cacheDir, packageName, pathRelative);
			return {
				shortCircuit: true,
				format: 'module',
				source: await readFile(cacheFile.replace(/\.tsx$/, '.js'), 'utf-8')
			}
		}
	} catch (error) { }

	return defaultLoad(url, context);
}
