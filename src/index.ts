import { tsObject } from '@morev/utils';
import stylelint from 'stylelint';
import * as rules from './rules';

export * from './create-define-rules';

export default tsObject.keys(rules)
	// eslint-disable-next-line import-x/namespace
	.map((name) => stylelint.createPlugin(rules[name].ruleName, rules[name]));
