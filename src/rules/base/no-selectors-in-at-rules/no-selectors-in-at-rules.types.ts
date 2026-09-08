import type * as v from 'valibot';
import type { schema } from './no-selectors-in-at-rules.schema';
/**
 * Primary option of the rule.
 */
export type PrimaryOption = v.InferInput<typeof schema.primary>;

/**
 * Secondary options for the rule.
 */
export type SecondaryOption = Exclude<v.InferInput<typeof schema.secondary>, undefined>;
