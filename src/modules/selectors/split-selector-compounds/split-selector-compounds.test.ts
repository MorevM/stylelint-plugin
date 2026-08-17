import { parseSelectors, selectorNodesToString } from '#modules/selectors';
import { splitSelectorCompounds } from './split-selector-compounds';

const split = (selector: string) => {
	const [nodes] = parseSelectors(selector);

	return splitSelectorCompounds(nodes).map((compound) => selectorNodesToString(compound));
};

describe(splitSelectorCompounds, () => {
	it('Splits a selector at top-level combinators', () => {
		expect(split('.block:hover > .block__label + .block__icon')).toStrictEqual([
			'.block:hover',
			'.block__label',
			'.block__icon',
		]);
	});

	it('Keeps combinators inside functional pseudo-classes', () => {
		expect(split(':has(.foo .bar) > .block__label')).toStrictEqual([
			':has(.foo .bar)',
			'.block__label',
		]);
	});

	it('Omits empty compounds around boundary combinators', () => {
		expect(split('> .block__label >')).toStrictEqual(['.block__label']);
	});
});
