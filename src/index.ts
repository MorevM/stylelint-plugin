import stylelint from 'stylelint';
import * as rules from './rules';

export * from './create-define-rules';

export default Object.values(rules)
	.map((rule) => stylelint.createPlugin(rule.ruleName, rule));
