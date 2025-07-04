import resolveNestedSelector from 'postcss-resolve-nested-selector';
import * as v from 'valibot';
import { addNamespace, createRule, findRuleDeclarations, getRuleUrl } from '#utils';

const RULE_NAME = 'no-block-properties';

const EXTERNAL_GEOMETRY_PROPERTIES = [
	'inset',
	'inset-block', 'inset-block-start', 'inset-block-end',
	'inset-inline', 'inset-inline-start', 'inset-inline-end',
	'top', 'right', 'bottom', 'left',

	'margin',
	'margin-block', 'margin-block-start', 'margin-block-end',
	'margin-inline', 'margin-inline-start', 'margin-inline-end',
	'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
];

const CONTEXTUAL_PROPERTIES = [
	'float', 'clear',

	'flex', 'flex-grow', 'flex-shrink', 'flex-basis',

	'grid', 'grid-area',
	'grid-row', 'grid-row-start', 'grid-row-end',
	'grid-column', 'grid-column-start', 'grid-column-end',

	'place-self',
	'justify-content', 'justify-items', 'justify-self',
	'align-self',
	'order',

	'counter-increment',
	'z-index',
];

// const q = {
// 	'no-top-level-properties': [true, {
// 		disallow: ['{GEOMETRY}', '{CONTEXTUAL}'],
// 	}],
// };

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
		deprecated: false,
		fixable: false,
	},
	messages: {
		unexpected: (propertyName: string) =>
			`Unexpected external geometry property "${propertyName}" within a BEM block declaration.`,
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				extraProperties: v.optional(v.array(v.string()), []),
			}),
		),
	},
}, (primary, secondary, { report, messages, root }) => {
	root.walkRules((rule) => {
		const resolvedSelector = resolveNestedSelector(rule.selector, rule)[0];

		// Do not check not BEM-related rules.
		if (!resolvedSelector.startsWith('.')) return;
		// Do not check elements and all its contents.
		if (resolvedSelector.includes('__')) return;
		// Do not check side-effects like `.the-component .foo`, `.the-component span`
		if (resolvedSelector.includes(' ')) return;

		const nodeChildDeclarations = findRuleDeclarations(rule, {
			onlyDirectChildren: true,
		});

		nodeChildDeclarations.forEach((declaration) => {
			if (EXTERNAL_GEOMETRY_PROPERTIES.includes(declaration.prop)) {
				report({
					message: messages.unexpected(declaration.prop),
					node: declaration,
					word: declaration.prop,
				});
			}
		});
	});
});
