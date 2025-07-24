import type { AtRule, Document, Node, Rule } from 'postcss';
import type { BemEntityPart, EntityType } from '#modules/bem';

type Violation = {
	rule: Rule | AtRule;
	entityPart: BemEntityPart;
	value: string;
	message: string;
};

export const createViolationsRegistry = (entities: readonly string[]) => {
	const violations: Violation[] = [];

	const hasParentViolation = (
		rule: Rule | AtRule,
		entityType: EntityType,
		entityPart: BemEntityPart,
	) => {
		let current: Document | Node | undefined = rule.parent;
		while (current) {
			// eslint-disable-next-line @typescript-eslint/no-loop-func -- Trust me it's safe here
			if (violations.some((violation) => {
				return violation.rule === current
					&& entities.indexOf(violation.entityPart.type) === entities.indexOf(entityType)
					&& entityPart.value === violation.value;
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
