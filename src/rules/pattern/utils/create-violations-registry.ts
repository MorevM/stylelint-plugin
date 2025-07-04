import type { AtRule, Document, Node, Rule } from 'postcss';

type EntityName = 'block' | 'element' | 'modifierName' | 'modifierValue' | 'utility';

type Violation = {
	rule: Rule | AtRule;
	entity: EntityName;
	startIndex: number;
	endIndex: number;
	value: string;
	message: string;
};

const getViolationIndexes = (rule: Rule | AtRule, searchString: string) => {
	const ruleSource = rule.type === 'rule' ? rule.selector : rule.params;
	const atRuleOffset = rule.type === 'rule' ? 0 : 2 + rule.name.length;

	const firstIndex = ruleSource.indexOf(searchString);
	const lastIndex = ruleSource.lastIndexOf(searchString);

	// Case where the selector doesn't contain the full entity
	// or the entity occurs more than once (edge case).
	// Highlight the entire selector in both situations.
	if (firstIndex === -1 || firstIndex !== lastIndex) {
		return { startIndex: atRuleOffset, endIndex: atRuleOffset + ruleSource.length };
	}

	// Case where the selector includes the complete entity
	return {
		startIndex: atRuleOffset + firstIndex,
		endIndex: atRuleOffset + firstIndex + searchString.length,
	};
};

export const createViolationsRegistry = (entities: readonly string[]) => {
	const violations: Violation[] = [];

	const hasParentViolation = (
		rule: Rule | AtRule,
		entityName: EntityName,
		entity: { startIndex: number; endIndex: number; value: string },
	) => {
		let current: Document | Node | undefined = rule.parent;
		while (current) {
			// eslint-disable-next-line @typescript-eslint/no-loop-func -- Trust me it's safe here
			if (violations.some((violation) => {
				return violation.rule === current
					&& entities.indexOf(violation.entity) === entities.indexOf(entityName)
					&& entity.value === violation.value;
			})
			) {
				return true;
			}

			current = current.parent;
		}
		return false;
	};

	return {
		violations,
		getViolationIndexes,
		hasParentViolation,
	};
};
