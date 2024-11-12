import { readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import pkgjson from '../package.json' with { type: "json" };
import { getDespByFile } from './deps';
import { FileTreeWalker } from './walker';

export const workspaceName = pkgjson.name;
export const prefix = '@';
export const workspaceDir = 'packages';

const isWindows = process.platform === 'win32';
export function isRelativePath(p: string) {
	return (
		p.charAt(0) === '.' &&
		(p.length === 1 ||
			p.charAt(1) === '/' ||
			(isWindows && p.charAt(1) === '\\') ||
			(p.charAt(1) === '.' &&
				(p.length === 2 ||
					p.charAt(2) === '/' ||
					(isWindows && p.charAt(2) === '\\'))))
	);
}

const getDirectories = async (source: string) =>
    (await readdir(source, { withFileTypes: true }))
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

const loadProjectDeps = async (souceDir: string): Promise<string[]> => {
    const deps = new Set<string>();
    await new FileTreeWalker()
        .setAllowedFileTypes(["ts", "tsx"])
        .onFile(async (filePath: string, _filename: string, _fileExtension: string, content: string) => {
            const dependencies: string[] = (await getDespByFile(content, filePath)).map(
                d => d.referencedSpecifier,
            );
            dependencies
                .reduce((acc, d) => {
                    if (!isRelativePath(d)) {
                        return [...acc, d];
                    }

                    return acc;
                }, [] as string[])
                .forEach(d => deps.add(d));
    })
    .walk(souceDir);
    return Array.from(deps.values());
};

const getWorkspaceDeps = (deps: string[], projectName: string, projects: string[]) => {
    const otherProjects = projects.filter(p => p !== projectName);

    return otherProjects.filter(p => deps.some(d => d === `${prefix}${workspaceName}/${p}` || d.startsWith(`${prefix}${workspaceName}/${p}/`)));
}

export const packageNames = await getDirectories(resolve(import.meta.dirname, `../${workspaceDir}`))
const serverDeps = await loadProjectDeps(resolve(import.meta.dirname, '../packages/server/src'))
console.log(getWorkspaceDeps(serverDeps, 'server', packageNames));