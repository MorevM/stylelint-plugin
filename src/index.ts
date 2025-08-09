import { tsObject } from '@morev/utils';
import stylelint from 'stylelint';
import * as rules from './rules';

export default tsObject.keys(rules)
	.map((name) => stylelint.createPlugin(rules[name].ruleName, rules[name]));
