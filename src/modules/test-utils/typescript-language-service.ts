import ts from 'typescript';

const currentDirectory = process.cwd();
const virtualCompletionFileName = `${currentDirectory}/typescript-language-service.completions.ts`;

const typeScriptCompletionMarker = '/* completion */';

const loadTypeScriptCompilerOptions = () => {
	const configPath = ts.findConfigFile(currentDirectory, ts.sys.fileExists, 'tsconfig.json');

	if (configPath === undefined) {
		throw new Error('Cannot find tsconfig.json for TypeScript language service tests.');
	}

	const config = ts.readConfigFile(configPath, ts.sys.readFile);

	if (config.error !== undefined) {
		throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'));
	}

	const compilerOptions = ts.convertCompilerOptionsFromJson(
		config.config.compilerOptions ?? {},
		currentDirectory,
		configPath,
	);

	if (compilerOptions.errors.length > 0) {
		throw new Error(compilerOptions.errors
			.map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n'))
			.join('\n'));
	}

	return compilerOptions.options;
};

const typeScriptCompilerOptions = loadTypeScriptCompilerOptions();

let virtualSource = '';
let virtualSourceVersion = 0;

const host: ts.LanguageServiceHost = {
	directoryExists: ts.sys.directoryExists,
	fileExists: ts.sys.fileExists,
	getCompilationSettings: () => typeScriptCompilerOptions,
	getCurrentDirectory: () => currentDirectory,
	getDefaultLibFileName: (options) => ts.getDefaultLibFilePath(options),
	getDirectories: ts.sys.getDirectories,
	getScriptFileNames: () => [virtualCompletionFileName],
	getScriptSnapshot: (fileName) => {
		const fileContent = fileName === virtualCompletionFileName
			? virtualSource
			: ts.sys.readFile(fileName);

		return fileContent === undefined ? undefined : ts.ScriptSnapshot.fromString(fileContent);
	},
	getScriptVersion: (fileName) => {
		return fileName === virtualCompletionFileName ? String(virtualSourceVersion) : '0';
	},
	readDirectory: ts.sys.readDirectory,
	readFile: ts.sys.readFile,
	realpath: ts.sys.realpath,
};

const service = ts.createLanguageService(host, ts.createDocumentRegistry());

const getTypeScriptCompletionNames = (source: string) => {
	const position = source.indexOf(typeScriptCompletionMarker);

	if (position === -1) {
		throw new Error('Cannot find TypeScript completion marker.');
	}

	virtualSource = source;
	virtualSourceVersion++;

	const completions = service.getCompletionsAtPosition(virtualCompletionFileName, position, {
		includeCompletionsForModuleExports: false,
		includeCompletionsWithInsertText: true,
	});

	return completions?.entries.map((entry) => entry.name) ?? [];
};

export {
	getTypeScriptCompletionNames,
	typeScriptCompletionMarker,
};
