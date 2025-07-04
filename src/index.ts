import { tsObject } from '@morev/utils';
import stylelint from 'stylelint';
import { NAMESPACE } from './constants';
import * as rules from './rules';
import type { PartialDeep } from '@morev/utils';

export default tsObject.keys(rules)
	.map((name) => stylelint.createPlugin(rules[name].ruleName, rules[name]));

// type Rules = {
// 	'@morev/bem/block-variable': [true, {}] | null;
// };

// export const morevStylelintPlugin = (overrides: PartialDeep<Rules>) => {
// 	return;
// };

// morevStylelintPlugin({
// 	'@morev/bem/block-variable': [true, {}],
// });
