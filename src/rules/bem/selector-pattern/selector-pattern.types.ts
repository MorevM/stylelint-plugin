import type * as v from 'valibot';
import type { schema, vProcessedPattern } from './selector-pattern.schema';

/**
 * A configured pattern normalized for BEM name matching.
 */
export type ProcessedPattern = v.InferInput<typeof vProcessedPattern>;

/**
 * Primary option of the rule.
 */
export type PrimaryOption = v.InferInput<typeof schema.primary>;

/**
 * Secondary options for the rule.
 */
export type SecondaryOption = Exclude<v.InferInput<typeof schema.secondary>, undefined>;
