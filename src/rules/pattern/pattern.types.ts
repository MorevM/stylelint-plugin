import type { Arrayable } from '@morev/utils';

export type PrimaryOptionSchema = boolean;

export type SecondaryOptionSchema = {
	blockPattern?: Arrayable<string | RegExp>;
};

const defaults: SecondaryOptionSchema = {
	blockPattern: ['KEBAB_CASE', 'foo-*'],
};
