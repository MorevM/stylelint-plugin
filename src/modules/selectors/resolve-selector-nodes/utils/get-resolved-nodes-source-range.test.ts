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

	it('Spans multiple source matches collapsed into one resolved node', () => {
		const node = getRuleBySelector(
			'.block { &__item { &:hover &--active {} } }',
			'&:hover &--active',
		);
		const [{ resolved }] = resolveSelectorNodes({ node });

		expect(getResolvedNodesSourceRange(resolved.slice(-1))).toStrictEqual({
			index: 8,
			endIndex: 17,
		});
	});

	it('Spans a parent interpolation and its suffix collapsed into one resolved node', () => {
		const node = getRuleBySelector(
			'.block { &__item { &:hover #{&}--active {} } }',
			'&:hover #{&}--active',
		);
		const [{ resolved }] = resolveSelectorNodes({ node });

		expect(getResolvedNodesSourceRange(resolved.slice(-1))).toStrictEqual({
			index: 8,
			endIndex: 20,
		});
	});
});
