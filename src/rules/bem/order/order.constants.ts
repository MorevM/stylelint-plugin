import type { CategorySequence, OrderSequence } from './order.types';

export const DEFAULT_ROOT_ORDER: OrderSequence = [
	[
		'sass:variables',
		'sass:functions',
		'sass:mixins',
		'css:functions',
		'css:mixins',
		'sass:placeholders',
		'sass:includes',
		'sass:diagnostics',
	],
	'custom-properties',
	'rules',
	'css:media',
	'css:container',
	'at-rules',
];

export const DEFAULT_ORDER: OrderSequence = [
	'sass:variables',
	'custom-properties',
	'sass:include-statements',
	'declarations',
	'base',
	'sass:include-blocks',
	'css:media',
	'css:container',
	'at-rules',
	'pseudo-classes',
	'modifiers',
	'qualifiers:class',
	'qualifiers:attribute',
	'context:internal',
	'context:external',
	'pseudo-elements',
	'elements',
	['sass:placeholders', 'rules'],
];

export const DEFAULT_CATEGORY_ORDERS: Readonly<Record<string, CategorySequence>> = {
	'pseudo-classes': Object.freeze([
		':link', ':visited', ':hover', Object.freeze([':focus', ':focus-visible']), ':active', '*',
	]),
	'pseudo-elements': Object.freeze(['::before', '::after', '*']),
};

export const REMAINDER = Object.freeze(['*'] as const);
