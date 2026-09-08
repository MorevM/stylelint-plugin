import type * as v from 'valibot';
import type { schema } from './no-grouped-entities.schema';

/**
 * Primary option of the rule.
 */
export type PrimaryOption = v.InferInput<typeof schema.primary>;

/**
 * Secondary options of the rule.
 */
export type SecondaryOption = Exclude<v.InferInput<typeof schema.secondary>, undefined>;
