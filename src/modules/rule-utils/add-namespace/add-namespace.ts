import { NAMESPACE } from '#modules/shared';

export const addNamespace = (ruleName: string) =>
	(ruleName.startsWith(NAMESPACE) ? ruleName : `${NAMESPACE}/${ruleName}`);
