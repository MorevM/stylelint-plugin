import type { AtRule, Document, Node, Rule } from 'postcss';
import type { BemEntity, BemEntityPart, EntityType } from '#modules/bem';

type Violation = {
	rule: Rule | AtRule;
	entityPart: BemEntityPart;
	selector: string;
	value: string;
	message: string;
	messageArgs: [string, ...any[]];
};

export const createViolationsRegistry = () => {
	const violations: Violation[] = [];

	const hasParentViolation = (
		bemEntity: BemEntity,
		entityType: EntityType,
		entityPart: BemEntityPart,
	) => {
		let current: Document | Node | undefined = bemEntity.rule;
		while (current) {
			// eslint-disable-next-line @typescript-eslint/no-loop-func -- Trust me it's safe here
			if (violations.some((violation) => {
				return violation.rule === current
					&& entityType === violation.entityPart.type
					&& entityPart.value === violation.value
					&& bemEntity.bemSelector.startsWith(violation.selector);
			})
			) {
				return true;
			}

			current = current.parent;
		}
		return false;
	};

	return { violations, hasParentViolation };
};
