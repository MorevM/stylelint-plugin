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
	// eslint-disable-next-line vars-on-top
	var createTestRule: CreateTestRule;
	// eslint-disable-next-line vars-on-top
	var createTestRuleConfig: CreateTestRuleConfig;
}
