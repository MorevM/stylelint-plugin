import type * as v from 'valibot';
import type { schema } from './block-variable.schema';

/**
 * Primary option of the rule.
 *
 * Enables the rule.
 */
export type PrimaryOption = v.InferInput<typeof schema.primary>;


export type SecondaryOption = Exclude<v.InferInput<typeof schema.secondary>, undefined>;
