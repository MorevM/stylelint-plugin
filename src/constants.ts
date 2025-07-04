import * as v from 'valibot';

export const NAMESPACE = '@morev/bem';
export const REPOSITORY_URL = 'https://github.com/MorevM/stylelint-plugin';
export const MASTER_BRANCH_TREE = 'tree/master';
export const stringOrRegExpSchema = v.union([v.string(), v.instance(RegExp)]);

export const KEBAB_CASE_REGEXP = /^([a-z][\da-z]*)(-[\da-z]+)*$/;
