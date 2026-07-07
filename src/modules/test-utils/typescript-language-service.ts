import ts from 'typescript';

const virtualCompletionFileName = `${process.cwd()}/typescript-language-service.completions.ts`;

const typeScriptCompletionMarker = '/* completion */';

const loadTypeScriptCompilerOptions = () => {
	const configPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');

	if (configPath === undefined) {
		throw new Error('Cannot find tsconfig.json for TypeScript language service tests.');
	}

	const config = ts.readConfigFile(configPath, ts.sys.readFile);

	if (config.error !== undefined) {
		throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
	}

	return ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd()).options;
};

const typeScriptCompilerOptions = loadTypeScriptCompilerOptions();

const getTypeScriptCompletionNames = (source: string) => {
	const position = source.indexOf(typeScriptCompletionMarker);

	if (position === -1) {
		throw new Error('Cannot find TypeScript completion marker.');
	}

	const files = new Map([[virtualCompletionFileName, source]]);
	const host: ts.LanguageServiceHost = {
		directoryExists: ts.sys.directoryExists,
		fileExists: ts.sys.fileExists,
		getCompilationSettings: () => typeScriptCompilerOptions,
		getCurrentDirectory: () => process.cwd(),
		getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
		getDirectories: ts.sys.getDirectories,
		getScriptFileNames: () => [virtualCompletionFileName],
		getScriptSnapshot: (fileName) => {
			const fileContent = files.get(fileName) ?? ts.sys.readFile(fileName);

			return fileContent === undefined ? undefined : ts.ScriptSnapshot.fromString(fileContent);
		},
		getScriptVersion: () => '0',
		readDirectory: ts.sys.readDirectory,
		readFile: ts.sys.readFile,
		realpath: ts.sys.realpath,
	};

	const service = ts.createLanguageService(host, ts.createDocumentRegistry());
	const completions = service.getCompletionsAtPosition(virtualCompletionFileName, position, {
		includeCompletionsForModuleExports: false,
		includeCompletionsWithInsertText: true,
	});

	service.dispose();

	return completions?.entries.map((entry) => entry.name) ?? [];
};

export {
	getTypeScriptCompletionNames,
	typeScriptCompletionMarker,
};
