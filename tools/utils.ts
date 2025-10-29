import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import pkgjson from "../package.json" assert { type: "json" };
import { getDespByFile } from "./deps";
import { FileTreeWalker } from "./walker";

const workspaceName = pkgjson.name;
const prefix = "@";
export const workspaceDir = "packages";
const projectTsConfigName = "tsconfig.package.json";

export const isWindows = process.platform === "win32";
function isRelativePath(p: string) {
	return (
		p.charAt(0) === "." &&
		(p.length === 1 ||
			p.charAt(1) === "/" ||
			(isWindows && p.charAt(1) === "\\") ||
			(p.charAt(1) === "." &&
				(p.length === 2 ||
					p.charAt(2) === "/" ||
					(isWindows && p.charAt(2) === "\\"))))
	);
}

export const getDirectories = async (source: string) =>
	(await readdir(source, { withFileTypes: true }))
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => dirent.name);

const loadProjectDeps = async (souceDir: string): Promise<string[]> => {
	const deps = new Set<string>();
	await new FileTreeWalker()
		.setAllowedFileTypes(["ts", "tsx"])
		.onFile(
			async (
				filePath: string,
				_filename: string,
				_fileExtension: string,
				content: string
			) => {
				const dependencies: string[] = (
					await getDespByFile(content, filePath)
				).map((d) => d.referencedSpecifier);
				dependencies
					.reduce((acc, d) => {
						if (!isRelativePath(d)) {
							return [...acc, d];
						}

						return acc;
					}, [] as string[])
					.forEach((d) => deps.add(d));
			}
		)
		.walk(souceDir);
	return Array.from(deps.values());
};

const getWorkspaceDeps = (
	deps: string[],
	projectName: string,
	projects: string[]
) => {
	const otherProjects = projects.filter((p) => p !== projectName);

	return otherProjects.filter((p) =>
		deps.some(
			(d) =>
				d === `${prefix}${workspaceName}/${p}` ||
				d.startsWith(`${prefix}${workspaceName}/${p}/`)
		)
	);
};

const updateProjectReferences = async (
	projectName: string,
	projectDeps: string[]
) => {
	const projectTsConfigPath = resolve(
		import.meta.dirname,
		`..${sep}${workspaceDir}${sep}${projectName}${sep}tsconfig.package.json`
	);
	const projectTsConfig = JSON.parse(
		await readFile(projectTsConfigPath, { encoding: "utf-8" })
	);
	const newReferences = projectDeps
		.map((dep) => `..${sep}${dep}${sep}${projectTsConfigName}`)
		.toSorted();
	const oldReferences = (projectTsConfig.references ?? [])
		.map((dep: any) => dep.path)
		.toSorted();
	if (newReferences.toString() !== oldReferences.toString()) {
		projectTsConfig.references = newReferences.map((path) => ({ path }));
		await writeFile(
			projectTsConfigPath,
			JSON.stringify(projectTsConfig, null, 4)
		);
	}
};

export const getPackageScripts = async (projectName: string) => {
	const projectTsConfigPath = resolve(
		import.meta.dirname,
		`..${sep}${workspaceDir}${sep}${projectName}${sep}tsconfig.package.json`
	);
	const projectTsConfig = JSON.parse(
		await readFile(projectTsConfigPath, { encoding: "utf-8" })
	);
	return projectTsConfig.scripts ?? {};
};

export const getProjectsWorskapceDeps = async () => {
	const packageNames = await getDirectories(
		resolve(import.meta.dirname, `..${sep}${workspaceDir}`)
	);
	return await Promise.all(
		packageNames.map(async (pkgName) => ({
			name: pkgName,
			deps: await getProjectWorkspaceDeps(pkgName, packageNames),
		}))
	);
};

export const getProjectWorskspaceDeps = async (projectName: string) => {
	const packageNames = await getDirectories(
		resolve(import.meta.dirname, `..${sep}${workspaceDir}`)
	);
	return await getProjectWorkspaceDeps(projectName, packageNames);
};

export const getProjectWorkspaceDeps = async (
	pkgName: string,
	packageNames: string[]
) => {
	const innerDeps = await loadProjectDeps(
		resolve(
			import.meta.dirname,
			`..${sep}packages${sep}${pkgName}${sep}src`
		)
	);
	const innerWorksapceDeps = getWorkspaceDeps(
		innerDeps,
		pkgName,
		packageNames
	);
	return innerWorksapceDeps;
};

export const updateReferences = async () => {
	const packageNames = await getDirectories(
		resolve(import.meta.dirname, `..${sep}${workspaceDir}`)
	);

	const deps = await Promise.all(
		packageNames.map(async (pkgName) => {
			const innerDeps = await loadProjectDeps(
				resolve(
					import.meta.dirname,
					`..${sep}packages${sep}${pkgName}${sep}src`
				)
			);
			const innerWorksapceDeps = getWorkspaceDeps(
				innerDeps,
				pkgName,
				packageNames
			);
			await updateProjectReferences(pkgName, innerWorksapceDeps);
			return innerWorksapceDeps;
		})
	);
	return Array.from(new Set(deps.flat()));
};

export const updateProjectReferencesDeep = async (projectName: string) => {
	const packageNames = await getDirectories(
		resolve(import.meta.dirname, `..${sep}${workspaceDir}`)
	);

	return await internalUpdateReferencesDeep(projectName, packageNames);
};

const internalUpdateReferencesDeep = async (
	projectName: string,
	packageNames: string[],
	alreadyUpdated: string[] = []
): Promise<any> => {
	const innerDeps = await loadProjectDeps(
		resolve(
			import.meta.dirname,
			`..${sep}packages${sep}${projectName}${sep}src`
		)
	);
	const innerWorksapceDeps = getWorkspaceDeps(
		innerDeps,
		projectName,
		packageNames
	);
	if (!alreadyUpdated.includes(projectName))
		await updateProjectReferences(projectName, innerWorksapceDeps);
	const nested = await Promise.all(
		innerWorksapceDeps.map(async (dep) => {
			alreadyUpdated.push(projectName);
			return await internalUpdateReferencesDeep(
				dep,
				packageNames,
				alreadyUpdated
			);
		})
	);

	return {
		[projectName]: innerWorksapceDeps,
		...nested.reduce((acc, curr) => ({ ...acc, ...curr }), {}),
	};
};
