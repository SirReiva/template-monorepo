import ts from 'typescript';

interface FoundReference {
	typeOnly: boolean;
	relativePathReference: boolean;
	referencingPath: string;
	referencedSpecifier: string;
}

const specifierNodeModule = /^[^\.]/;

const diveDeeper = (path: string, node: ts.Node, found: FoundReference[]) =>
	Promise.all(
		node.getChildren().map(n => findAllReferencesNode(path, n, found)),
	);

const findAllReferencesNode = async (
	path: string,
	node: ts.Node,
	found: FoundReference[],
) => {
	switch (node.kind) {
		case ts.SyntaxKind.ExportDeclaration:
			const exportDeclaration = node as ts.ExportDeclaration;

			if (exportDeclaration.moduleSpecifier) {
				const specifier = (
					exportDeclaration.moduleSpecifier as ts.StringLiteral
				).text;

				if (specifier) {
					if (specifierNodeModule.test(specifier)) {
						found.push({
							typeOnly: exportDeclaration.isTypeOnly,
							relativePathReference: false,
							referencingPath: path,
							referencedSpecifier: specifier,
						});
					}
				}
			}

			break;
		case ts.SyntaxKind.ImportDeclaration:
			const importDeclaration = node as ts.ImportDeclaration;
			const importClause = importDeclaration.importClause;

			const specifier = (importDeclaration.moduleSpecifier as ts.StringLiteral)
				.text;

			if (specifier) {
				if (specifierNodeModule.test(specifier)) {
					found.push({
						typeOnly: !!importClause && !importClause.isTypeOnly,
						relativePathReference: false,
						referencingPath: path,
						referencedSpecifier: specifier,
					});
				}
			}

			break;
		case ts.SyntaxKind.CallExpression:
			const callExpression = node as ts.CallExpression;

			if (
				(callExpression.expression.kind === ts.SyntaxKind.ImportKeyword ||
					(callExpression.expression.kind === ts.SyntaxKind.Identifier &&
						callExpression.expression.getText() === 'require')) &&
				callExpression.arguments[0]?.kind === ts.SyntaxKind.StringLiteral
			) {
				const specifier = (callExpression.arguments[0] as ts.StringLiteral)
					.text;

				if (specifierNodeModule.test(specifier)) {
					found.push({
						typeOnly: false,
						relativePathReference: false,
						referencingPath: path,
						referencedSpecifier: specifier,
					});
				} else {
					await diveDeeper(path, node, found);
				}
			} else {
				await diveDeeper(path, node, found);
			}

			break;
		default:
			await diveDeeper(path, node, found);

			break;
	}
};

export const getDespByFile = async (source: string, path: string) => {
	const rootNode = ts.createSourceFile(
		path,
		source,
		ts.ScriptTarget.Latest,
		/*setParentNodes */ true,
	);

	const found: FoundReference[] = [];

	await findAllReferencesNode(path, rootNode, found);

	return found;
};
