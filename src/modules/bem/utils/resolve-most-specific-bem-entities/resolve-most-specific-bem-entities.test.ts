import { DEFAULT_SEPARATORS } from '#modules/bem';
import { parseSelectors } from '#modules/selectors';
import { resolveMostSpecificBemEntities } from './resolve-most-specific-bem-entities';

const resolve = (selector: string, blockName?: string) => {
	const [nodes] = parseSelectors(selector);

	return resolveMostSpecificBemEntities({
		blockName,
		nodes,
		separators: DEFAULT_SEPARATORS,
	}).map((entity) => entity.bemSelector);
};

describe(resolveMostSpecificBemEntities, () => {
	it('Returns the deepest direct BEM entity', () => {
		expect(resolve('.block__item.block__item--active:hover'))
			.toStrictEqual(['.block__item--active']);
	});

	it('Returns distinct entities at the same depth', () => {
		expect(resolve('.block__item.other__item'))
			.toStrictEqual(['.block__item', '.other__item']);
	});

	it('Deduplicates equivalent BEM entities', () => {
		expect(resolve('.block__item.block__item'))
			.toStrictEqual(['.block__item']);
	});

	it('Excludes BEM entities nested inside functional pseudo-classes', () => {
		expect(resolve('.block:is(.block__item)'))
			.toStrictEqual(['.block']);
	});

	it('Applies the block filter before comparing entity depth', () => {
		expect(resolve('.other__item--active.block__item', 'block'))
			.toStrictEqual(['.block__item']);
	});

	it('Returns an empty list when the compound has no matching BEM entity', () => {
		expect(resolve('.other__item', 'block')).toStrictEqual([]);
	});
});
