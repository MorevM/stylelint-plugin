import { camelCase, kebabCase, pascalCase, snakeCase } from '@morev/utils';

type Case = 'kebab-case' | 'camelCase' | 'PascalCase' | 'snake_case';

const mappings: Record<Case, Function> = {
	camelCase,
	'kebab-case': kebabCase,
	'PascalCase': pascalCase,
	'snake_case': snakeCase,
};

export const toCase = (input: string, neededCase: Case) =>
	mappings[neededCase](input);
