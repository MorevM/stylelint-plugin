import type * as v from 'valibot';
import type { schema } from './no-detached-entities.schema';

/**
 * Structural policies after omitted categories have received their defaults.
 */
export type Nesting = Exclude<v.InferOutput<typeof schema.secondary>, undefined>['nesting'];

/**
 * Structural entity category selected by its most specific BEM part.
 */
export type EntityKind = 'block' | keyof Nesting;

/**
 * Configurable BEM owner category.
 */
export type NestingOwner = 'block' | 'element' | 'blockModifier' | 'elementModifier';

/**
 * Canonical owner or nesting-path entry with a compatible declaration location.
 */
export type Owner = {
	/**
	 * Canonical BEM selector of an owner.
	 */
	readonly selector: string;

	/**
	 * Nearest compatible declaration line; absent when no suitable declaration exists.
	 */
	readonly line?: number;
};

/**
 * Primary option of the rule.
 */
export type PrimaryOption = v.InferInput<typeof schema.primary>;

/**
 * Secondary options of the rule.
 */
export type SecondaryOption = Exclude<v.InferInput<typeof schema.secondary>, undefined>;
