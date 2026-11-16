import type { OrderSequence, WithinSequence } from './order.types';

export const DEFAULT_ROOT_ORDER: OrderSequence = [
	[
		'dollar-variables',
		{ type: 'at-rule', name: 'function' },
		{ type: 'at-rule', name: 'mixin' },
		{ type: 'rule', selector: /^%/u },
		{ type: 'at-rule', name: 'include' },
		{ type: 'at-rule', name: 'extend' },
		{ type: 'at-rule', name: 'debug' },
		{ type: 'at-rule', name: 'warn' },
		{ type: 'at-rule', name: 'error' },
	],
	'custom-properties',
	'rules',
	'at-rules',
	'*',
];

export const DEFAULT_ORDER: OrderSequence = [
	'dollar-variables',
	'custom-properties',
	{ type: 'at-rule', name: 'include', hasBlock: false },
	'declarations',
	'base',
	'at-rules',
	'pseudo-classes',
	'modifiers',
	'qualifiers:class',
	'qualifiers:attribute',
	'context:internal',
	'context:external',
	'pseudo-elements',
	'elements',
	'rules',
	'*',
];

export const DEFAULT_WITHIN: Readonly<Record<string, WithinSequence>> = {
	'pseudo-classes': Object.freeze([
		':link', ':visited', ':hover', Object.freeze([':focus', ':focus-visible']), ':active', '*',
	]),
	'pseudo-elements': Object.freeze(['::before', '::after', '*']),
};

export const REMAINDER: WithinSequence = Object.freeze(['*']);
