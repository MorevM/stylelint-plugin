import { resolveBemEntities } from '#utils';
import { resolveMostSpecificEntity } from './resolve-most-specific-entity';

// TODO: Move to global level? Expose from the package (with popular styles)?
const SEPARATORS = {
	elementSeparator: '__',
	modifierSeparator: '--',
	modifierValueSeparator: '--',
};

describe(resolveMostSpecificEntity, () => {
	it('Returns `modifierValue` data when present at the block level', () => {
		const entity = resolveBemEntities('.block--modifier--value', SEPARATORS)[0];
		const result = resolveMostSpecificEntity(entity);

		expect(result).toStrictEqual(['&--value', 'modifierValue']);
	});

	it('Returns `modifierValue` data when present at the element level', () => {
		const entity = resolveBemEntities('.block__element--modifier--value', SEPARATORS)[0];
		const result = resolveMostSpecificEntity(entity);

		expect(result).toStrictEqual(['&--value', 'modifierValue']);
	});

	it('Returns `modifierName` data when `modifierValue` is missing at the block level', () => {
		const entity = resolveBemEntities('.block--modifier', SEPARATORS)[0];
		const result = resolveMostSpecificEntity(entity);

		expect(result).toStrictEqual(['&--modifier', 'modifierName']);
	});

	it('Returns `modifierName` data when `modifierValue` is missing at the element level', () => {
		const entity = resolveBemEntities('.block__element--modifier', SEPARATORS)[0];
		const result = resolveMostSpecificEntity(entity);

		expect(result).toStrictEqual(['&--modifier', 'modifierName']);
	});

	it('Returns `element` data when no `modifierName` or `modifierValue`', () => {
		const entity = resolveBemEntities('.block__element', SEPARATORS)[0];
		const result = resolveMostSpecificEntity(entity);

		expect(result).toStrictEqual(['&__element', 'element']);
	});

	it('Returns `block` data when no `modifierName` or `modifierValue`', () => {
		const entity = resolveBemEntities('.block', SEPARATORS)[0];
		const result = resolveMostSpecificEntity(entity);

		expect(result).toStrictEqual(['.block', 'block']);
	});
});
