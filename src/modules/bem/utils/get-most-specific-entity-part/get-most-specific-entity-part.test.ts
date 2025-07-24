import { DEFAULT_SEPARATORS, resolveBemEntities } from '#modules/bem';
import { getMostSpecificEntityPart } from './get-most-specific-entity-part';

const separators = DEFAULT_SEPARATORS;

describe(getMostSpecificEntityPart, () => {
	it('Returns `modifierValue` data when present at the block level', () => {
		const entity = resolveBemEntities({ source: '.block--modifier--value', separators })[0];
		const result = getMostSpecificEntityPart(entity);

		expect(result).toStrictEqual([entity.modifierValue, 'modifierValue']);
	});

	it('Returns `modifierValue` data when present at the element level', () => {
		const entity = resolveBemEntities({ source: '.block__element--modifier--value', separators })[0];
		const result = getMostSpecificEntityPart(entity);

		expect(result).toStrictEqual([entity.modifierValue, 'modifierValue']);
	});

	it('Returns `modifierName` data when `modifierValue` is missing at the block level', () => {
		const entity = resolveBemEntities({ source: '.block--modifier', separators })[0];
		const result = getMostSpecificEntityPart(entity);

		expect(result).toStrictEqual([entity.modifierName, 'modifierName']);
	});

	it('Returns `modifierName` data when `modifierValue` is missing at the element level', () => {
		const entity = resolveBemEntities({ source: '.block__element--modifier', separators })[0];
		const result = getMostSpecificEntityPart(entity);

		expect(result).toStrictEqual([entity.modifierName, 'modifierName']);
	});

	it('Returns `element` data when no `modifierName` or `modifierValue`', () => {
		const entity = resolveBemEntities({ source: '.block__element', separators })[0];
		const result = getMostSpecificEntityPart(entity);

		expect(result).toStrictEqual([entity.element, 'element']);
	});

	it('Returns `block` data when no `modifierName` or `modifierValue`', () => {
		const entity = resolveBemEntities({ source: '.block', separators })[0];
		const result = getMostSpecificEntityPart(entity);

		expect(result).toStrictEqual([entity.block, 'block']);
	});
});
