import { getRuleBySelector } from '#modules/test-utils';
import { resolveSelectorNodes } from '../resolve-selector-nodes';
import { getResolvedNodesSourceRange } from './get-resolved-nodes-source-range';

describe(getResolvedNodesSourceRange, () => {
	it('Returns `null` for an empty fragment', () => {
		expect(getResolvedNodesSourceRange([])).toBeNull();
	});

	it('Uses the source matches of a non-first selector-list branch', () => {
		const node = getRuleBySelector(
			'.block { &:hover, & .block__element {} }',
			'&:hover, & .block__element',
		);
		const [, { resolved }] = resolveSelectorNodes({ node });

		expect(getResolvedNodesSourceRange(resolved)).toStrictEqual({
			index: 9,
			endIndex: 26,
		});
	});
});
