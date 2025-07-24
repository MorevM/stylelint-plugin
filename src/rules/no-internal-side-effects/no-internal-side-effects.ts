import * as v from 'valibot';
import { getBemBlock } from '#modules/bem';
import { addNamespace, createRule, getRuleUrl, isCssFile, vStringOrRegExpSchema } from '#modules/rule-utils';
import { resolveNestedSelector } from '#modules/selectors';

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
				ignore: v.optional(v.array(vStringOrRegExpSchema), []),
			}),
		),
	},
}, (primary, secondary, { report, messages, root }) => {
	// The rule only applicable to SCSS files.
	if (isCssFile(root)) return;

	const bemBlock = getBemBlock(root);
	if (!bemBlock) return;

	root.walkRules((rule) => {
		const resolvedSelector = resolveNestedSelector({ node: rule })[0].resolved;
	});
});
