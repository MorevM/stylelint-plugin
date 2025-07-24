import { isEmpty, rangesIntersection } from '@morev/utils';
import type { AtRule, Rule } from 'postcss';
import type { ClassName } from 'postcss-selector-parser';
import type { BemEntity, BemEntityPart, EntityType } from '#modules/bem/types';
import type { BemNode } from '#modules/bem/utils/resolve-bem-entities/resolve-bem-entities.types';
import type { Separators } from '#modules/shared';

/**
 * Parameters for parsing a BEM class node into structured entity parts.
 */
type Options = {
	/**
	 * Selector node representing the class.
	 */
	node: BemNode<ClassName>;

	/**
	 * PostCSS rule or at-rule that contains the selector.
	 */
	rule: Rule | AtRule;

	/**
	 * Custom separators used in BEM notation.
	 */
	separators: Separators;

	/**
	 * Offset applied to source ranges (e.g., in nested rules).
	 */
	sourceOffset: number;
};

/**
 * Maps `RegExp.exec()` result with named groups and indices
 * to a structured BEM entity representation.
 *
 * @param   exec   Result of `RegExp.exec()` with `d` and `groups` flags.
 *
 * @returns        Object with value and source indices for each BEM part.
 */
const execToEntityParts = (exec: RegExpExecArray) => {
	const { groups = {}, indices: { groups: groupIndices = {} } = {} } = exec;
	const keys = ['block', 'element', 'modifierName', 'modifierValue'] as const;

	type EntityParts = Record<
		EntityType,
		{ value: string; indices: [number, number] } | undefined
	>;

	return Object.fromEntries(
		keys.map((key) => [
			key,
			groups[key] !== undefined
				? { value: groups[key], indices: groupIndices[key] }
				: undefined,
		]),
	) as EntityParts;
};

/**
 * Replaces a substring within a string by pipe (`|`) characters
 * to visually and functionally "consume" that segment.
 *
 * @param   value   The original string.
 * @param   start   Start index of the segment to mask.
 * @param   end     End index (exclusive) of the segment to mask.
 *
 * @returns         New string with the specified segment replaced by `|`.
 */
const consumeSubstring = (value: string, start: number, end: number): string => {
	const length = end - start;
	return value.slice(0, start) + '|'.repeat(length) + value.slice(end);
};

/**
 * Extracts BEM entity parts from a class selector node using configured separators.
 *
 * @param   options   Parsing context, including node, rule, separators, and source offset.
 *
 * @returns           Parsed BEM entity or `null` if the class doesn't match the BEM pattern.
 */
export const parseBemEntities = (options: Options): Partial<BemEntity> | null => {
	const { node, rule, separators, sourceOffset } = options;
	const { elementSeparator, modifierSeparator, modifierValueSeparator } = separators;
	const separatorsMap: Record<EntityType, string> = {
		block: '.',
		element: elementSeparator,
		modifierName: modifierSeparator,
		modifierValue: modifierValueSeparator,
	};

	const bemRegExp = new RegExp(
		`^(?<block>.+?)(?=${elementSeparator}|${modifierSeparator}|$)`
		+ `(?:${elementSeparator}(?<element>.+?)(?=${modifierSeparator}|$))?`
		+ `(?:${modifierSeparator}(?<modifierName>.+?)(?=${modifierValueSeparator}|$))?`
		+ `(?:${modifierValueSeparator}(?<modifierValue>.+))?`,
		'd',
	);

	const exec = bemRegExp.exec(node.value);
	if (!exec) return null;

	const entityParts = execToEntityParts(exec);
	const { sourceMatches } = node;

	/**
	 * Resolves and enriches metadata for a specific BEM part.
	 *
	 * @param   type   BEM entity type.
	 *
	 * @returns        Structured representation of the part,
	 *                 including source range and selector segment.
	 */
	const resolveEntityPart = (type: EntityType): BemEntityPart | undefined => {
		if (!entityParts[type]) return;

		const { value, indices: [partStart, partEnd] } = entityParts[type];

		// Find the source match that overlaps with this part. TODO:
		const matchIndex = sourceMatches.findIndex((match) => {
			return !match.value.includes('&')
				&& !isEmpty(rangesIntersection([[partStart, partEnd], match.resolvedRange]));
		});
		const match = matchIndex === -1 ? null : sourceMatches[matchIndex];

		const sourceRange = (() => {
			if (!match) return;

			const partIndex = match.value.indexOf(value);

			// Partial match: value not found directly,
			// use previous match for offset fallback
			if (partIndex === -1) {
				const prevMatch = sourceMatches[matchIndex - 1]?.value.includes('&')
					? sourceMatches[matchIndex - 1]
					: null;

				const start = prevMatch?.sourceRange[0] ?? match.sourceRange[0];
				const end = Math.min(match.sourceRange[1], partEnd - match.resolvedRange[0] + match.sourceRange[0]);

				// Intentionally mutate `match.value` to mask used characters
				// in cases like `.block__foo--foo`
				match.value = consumeSubstring(match.value, 0, end);

				return [start + match.offset, end + match.offset] as [number, number];
			}

			// Full match: straightforward offset calculation
			const start = match.sourceRange[0] + partIndex;
			const end = start + value.length;
			match.value = consumeSubstring(match.value, partIndex, partIndex + value.length);

			return [
				start + sourceOffset + match.offset,
				end + sourceOffset + match.offset,
			] as [number, number];
		})();

		const separator = separatorsMap[type];
		const selector = `${separator}${value}`;

		return { type, value, separator, selector, sourceRange };
	};

	const block = resolveEntityPart('block')!;
	const element = resolveEntityPart('element');
	const modifierName = resolveEntityPart('modifierName');
	const modifierValue = resolveEntityPart('modifierValue');

	// Reconstruct full BEM selector in canonical order:
	// block > [element] > [modifier(s)]
	const bemSelector = [block, element, modifierName, modifierValue]
		.filter(Boolean).map((part) => part.selector).join('');

	return { rule, bemSelector, block, element, modifierName, modifierValue };
};
