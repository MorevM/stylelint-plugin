import { isEmpty, isString, isUndefined } from '@morev/utils';
import resolveNestedSelector from 'postcss-resolve-nested-selector';
import { parseSelectors } from '../parse-selectors/parse-selectors';
import type { AtRule, Rule } from 'postcss';

type Separators = {
	elementSeparator: string;
	modifierSeparator: string;
	modifierValueSeparator: string;
};

type EntityPart = {
	value: string;
	startIndex: number;
	endIndex: number;
};

type BemEntity = {
	originalSelector: string;
	resolvedSelector: string;
	selector: EntityPart;
	block: EntityPart;
	element: EntityPart | undefined;
	modifierName: EntityPart | undefined;
	modifierValue: EntityPart | undefined;
	utility: EntityPart[] | undefined;
};

const createBemEntity = (): Partial<BemEntity> => ({
	originalSelector: undefined,
	resolvedSelector: undefined,
	selector: undefined,
	block: undefined,
	element: undefined,
	modifierName: undefined,
	modifierValue: undefined,
	utility: undefined,
});

const isValidBemEntity = (
	entityTemplate: Partial<BemEntity>,
): entityTemplate is BemEntity => {
	const requiredProperties = ['selector', 'block'] as const;
	for (const property of requiredProperties) {
		if (isUndefined(entityTemplate[property])) return false;
	}

	return true;
};

export const resolveBemEntities = (
	ruleOrResolvedSelector: Rule | AtRule | string,
	separators: Separators,
	{ source }: { source?: string } = {},
) => {
	const ruleSource = isString(ruleOrResolvedSelector)
		? ruleOrResolvedSelector
		: ruleOrResolvedSelector.type === 'rule'
			? source ?? ruleOrResolvedSelector.selector
			: source ?? ruleOrResolvedSelector.params;

	const resolvedSelector = isString(ruleOrResolvedSelector)
		? ruleOrResolvedSelector
		: resolveNestedSelector(ruleSource, ruleOrResolvedSelector as any)[0];

	const { elementSeparator, modifierSeparator, modifierValueSeparator } = separators;

	const bemRegExp = new RegExp(
		`^(?<block>.+?)(?=${elementSeparator}|${modifierSeparator}|$)`
		+ `(?:${elementSeparator}(?<element>.+?)(?=${modifierSeparator}|$))?`
		+ `(?:${modifierSeparator}(?<modifierName>.+?)(?=${modifierValueSeparator}|$))?`
		+ `(?:${modifierValueSeparator}(?<modifierValue>.+))?`,
		'd',
	);

	const selectors = parseSelectors(resolvedSelector);

	return selectors.reduce<BemEntity[]>((acc, selectorNodes) => {
		let bemEntity: Partial<BemEntity> = createBemEntity();

		for (let i = 0, l = selectorNodes.length; i < l; i++) {
			const node = selectorNodes[i];
			if (node.type === 'combinator' && bemEntity?.block) {
				isValidBemEntity(bemEntity) && acc.push(bemEntity);
				bemEntity = createBemEntity();
				continue;
			}
			if (node.type !== 'class') continue;
			// div.class, #id.class, [href="/"].class, :hover.class, ::placeholder.class
			if (['tag', 'id', 'attribute', 'pseudo'].includes(selectorNodes[i - 1]?.type)) continue;

			bemEntity.originalSelector ??= ruleSource;
			bemEntity.resolvedSelector ??= resolvedSelector;

			bemEntity.selector ??= {
				value: '',
				startIndex: node.sourceIndex,
				endIndex: node.sourceIndex,
			};

			const cleanNodeValue = node.toString().trim();

			bemEntity.selector.value ??= '';
			bemEntity.selector.value += cleanNodeValue;

			bemEntity.selector.endIndex += cleanNodeValue.length;

			const match = bemRegExp.exec(node.value);
			if (!match) return acc;

			const { groups, indices } = match;
			if (isEmpty(indices) || isEmpty(indices.groups) || isEmpty(groups)) return acc;

			// eslint-disable-next-line unicorn/consistent-function-scoping -- false positive
			const getPart = (type: Exclude<keyof BemEntity, 'utilities' | 'selector'>) => {
				if (!groups[type] || !indices.groups?.[type]) return;
				const [start, end] = indices.groups[type];

				// +1 to consider leading dot in class declaration
				return {
					value: groups[type],
					startIndex: start + 1,
					endIndex: end + 1,
				};
			};

			if (!bemEntity.block) {
				if (groups.block) bemEntity.block = getPart('block');
				if (groups.element) bemEntity.element = getPart('element');
				if (groups.modifierName) bemEntity.modifierName = getPart('modifierName');
				if (groups.modifierValue) bemEntity.modifierValue = getPart('modifierValue');
			} else {
				bemEntity.utility ??= [];
				bemEntity.utility.push({
					value: node.value,
					startIndex: bemEntity.selector.value.length - node.value.length,
					endIndex: bemEntity.selector.value.length - node.value.length + node.value.length,
				});
			}
		}

		isValidBemEntity(bemEntity) && acc.push(bemEntity);
		return acc;
	}, []);
};
