import { MASTER_BRANCH_TREE, REPOSITORY_URL } from '#modules/shared';

export const getRuleUrl = (ruleName: string) => {
	return `${REPOSITORY_URL}/${MASTER_BRANCH_TREE}/src/rules/${ruleName}/README.md`;
};
