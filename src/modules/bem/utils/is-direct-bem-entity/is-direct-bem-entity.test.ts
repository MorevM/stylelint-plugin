import { DEFAULT_SEPARATORS, resolveBemEntities } from '#modules/bem';
import { isDirectBemEntity } from './is-direct-bem-entity';

describe(isDirectBemEntity, () => {
	it('Recognizes entities in the direct compound context', () => {
		const entities = resolveBemEntities({
			source: '.foo:is(.bar:not(.baz)).foo--mod.component',
			separators: DEFAULT_SEPARATORS,
		});

		const result = entities.map((entity) => ({
			block: entity.block.value,
			context: entity.sourceContext,
			isDirect: isDirectBemEntity(entity),
		}));

		expect(result).toStrictEqual([
			{ block: 'foo', context: null, isDirect: true },
			{ block: 'component', context: 'entity', isDirect: true },
			{ block: 'bar', context: ':is', isDirect: false },
			{ block: 'foo', context: 'modifier', isDirect: true },
			{ block: 'baz', context: ':not', isDirect: false },
		]);
	});
});
