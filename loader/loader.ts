
import { lstat, readFile } from "node:fs/promises";
import { isBuiltin, type LoadHook, type ResolveHook } from "node:module";
import { dirname, extname, resolve as fsResolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import packageJson from "../package.json" with { type: "json" };

const workspaceName = `@${packageJson.name}`;

const packagesFolder = fsResolve(import.meta.dirname, '../packages');
const nodeModulesFolder = fsResolve(import.meta.dirname, '../node_modules');

const baseURL = pathToFileURL(packagesFolder).href;

const cacheDir = fsResolve(import.meta.dirname, '../.cache')


const findByExtension = async (filePath: string) => {
	const fileStat = await lstat(`${filePath}.tsx`).catch((err) =>{
		if (err.code === 'ENOENT') return null;
		throw err;
	});

	if(fileStat) return `${filePath}.tsx`;

	return `${filePath}.ts`;
}


const findFile = async(basePath: string) => {

	const dirStat = await lstat(basePath).catch((err) =>{
		if (err.code === 'ENOENT') return null;
		throw err;
	});

	if (dirStat?.isDirectory()) return await findByExtension(`${basePath}${sep}index`);

	const extension = extname(basePath);
	if (extension) {
		return basePath;
	}

	return await findByExtension(basePath)
}

const resolveAliasImport = async(specifier: string) => {
	const parts = specifier.replace(`${workspaceName}/`,'').split('/');
	const packageName = parts.shift();
	const fileOrFolder = fsResolve(packagesFolder, `./${packageName}${sep}src`, ...parts);
	const targetFile = await findFile(fileOrFolder);
	const targetSpecifier = pathToFileURL(targetFile).href;
	return targetSpecifier;
}

// export const initialize:InitializeHook<{packageName: string;}> = async ({ packageName }) => {
// 	console.log(`NodeJS${process.version}`);
// 	console.log(typeGradientFn.multiline((await figlet(`${workspaceName}/${packageName}#${version}`,{}) ?? '')))
// };

export const resolve: ResolveHook = async (specifier, context, next) => {
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
	} catch (error: any) {
		if (error.code === "MODULE_NOT_FOUND") {
			error.code = "ERR_MODULE_NOT_FOUND";
		}
		error.specifier = specifier;
		error.base = initial;
		throw error;
	}
}

export const load: LoadHook = async (url, context, defaultLoad) => {
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
