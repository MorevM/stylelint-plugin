import { assert, describe, expect, it } from 'vitest';
import { createTestUtils } from '@morev/stylelint-testing-library';
import plugins from './src/index';
import type { CreateTestRule, CreateTestRuleConfig } from '@morev/stylelint-testing-library';

const { createTestRule, createTestRuleConfig } = createTestUtils({
	testFunctions: { assert, describe, expect, it },
	plugins,
	autoStripIndent: true,
	testCaseWithoutDescriptionAppearance: 'case-index',
	testGroupWithoutDescriptionAppearance: 'line-in-file',
});

global.createTestRule = createTestRule;
global.createTestRuleConfig = createTestRuleConfig;

declare global {
	// eslint-disable-next-line vars-on-top, no-var
	var createTestRule: CreateTestRule;
	// eslint-disable-next-line vars-on-top, no-var
	var createTestRuleConfig: CreateTestRuleConfig;
}

// TODO: Move to separate file
expect.extend({
	toShallowEqualArray(actual, expected) {
		const { isNot, equals } = this;
		return {
			actual,
			expected,
			// eslint-disable-next-line @typescript-eslint/require-array-sort-compare -- It's safe here
			pass: equals([...actual].toSorted(), expected.toSorted()),
			message: () => `Expected arrays ${isNot ? 'not ' : ''}to be equal (shallow)`,
		};
	},
});
