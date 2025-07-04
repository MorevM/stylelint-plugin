import resolveNestedSelector from 'postcss-resolve-nested-selector';
import * as v from 'valibot';
import { addNamespace, createRule, getBemBlock, getFirstRule, getRuleUrl, isCssFile, isKeyframesRule, parseSelectors, toRegExp } from '#utils';
import { stringOrRegExpSchema } from '#valibot';

const RULE_NAME = 'no-internal-side-effects';

export default createRule({
	name: addNamespace(RULE_NAME),
	meta: {
		url: getRuleUrl(RULE_NAME),
		deprecated: false,
		fixable: false,
	},
	messages: {
		// TODO: Better message
		rejected: (selector: string) => `Unexpected side-effect to another element: "${selector}"`,
	},
	schema: {
		primary: v.literal(true),
		secondary: v.optional(
			v.strictObject({
				allow: v.optional(v.array(v.picklist(['<TAG>', '<ID>'])), []),
				ignore: v.optional(v.array(stringOrRegExpSchema), []),
			}),
		),
	},
}, (primary, secondary, { report, messages, root }) => {
	// The rule only applicable to SCSS files.
	if (isCssFile(root)) return;

	const bemBlock = getBemBlock(root);
	if (!bemBlock) return;

	root.walkRules((rule) => {
		const resolvedSelector = resolveNestedSelector(rule.selector, rule as any)[0];
	});
});
