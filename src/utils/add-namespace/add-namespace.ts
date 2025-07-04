import { NAMESPACE } from '#constants';

export const addNamespace = (ruleName: string) =>
	(ruleName.startsWith(NAMESPACE) ? ruleName : `${NAMESPACE}/${ruleName}`);
