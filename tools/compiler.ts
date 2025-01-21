import { resolve } from "path";
import { cwd } from "process";
import ts from "typescript";

export function build(packageName: string) {
	const currentDir = resolve(cwd(), "packages", packageName);
	const configFile = ts.findConfigFile(
		currentDir,
		ts.sys.fileExists,
		"tsconfig.package.json"
	);

	if (!configFile) throw Error("tsconfig.package.json not found");
	const { config } = ts.readConfigFile(configFile, ts.sys.readFile);

	const { options, fileNames, errors, projectReferences } =
		ts.parseJsonConfigFileContent(config, ts.sys, currentDir);

	const program = ts.createProgram({
		options,
		rootNames: fileNames,
		configFileParsingDiagnostics: errors,
		projectReferences,
	});

	const { diagnostics, emitSkipped } = program.emit();

	const allDiagnostics = ts
		.getPreEmitDiagnostics(program)
		.concat(diagnostics, errors);

	if (allDiagnostics.length) {
		const formatHost: ts.FormatDiagnosticsHost = {
			getCanonicalFileName: (path) => path,
			getCurrentDirectory: ts.sys.getCurrentDirectory,
			getNewLine: () => ts.sys.newLine,
		};
		const message = ts.formatDiagnosticsWithColorAndContext(
			allDiagnostics,
			formatHost
		);
		console.log(message);
	}

	return !allDiagnostics.length && !emitSkipped;
}
