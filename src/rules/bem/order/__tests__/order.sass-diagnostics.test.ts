import rule from '../order';
import type { SecondaryOption } from '../order.types';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Sass diagnostic statements',
	config: [true, {
		root: { order: ['at-rules', 'sass:diagnostics'] },
		order: ['sass:diagnostics', 'declarations', { type: 'at-rule', name: 'error' }],
		categories: { 'sass:diagnostics': ['debug', '*'] },
	} satisfies SecondaryOption],
	reject: [{
		description: 'Places generic at-rules before all three Sass diagnostics at the root',
		code: `
			@debug $theme;
			@warn "Empty theme";
			@error "Unknown theme";
			@custom-media --print print;
		`,
		fixed: `
			@custom-media --print print;
			@debug $theme;
			@warn "Empty theme";
			@error "Unknown theme";
		`,
		warnings: [{ message: messages.expectedBefore('@custom-media --print print', '@debug $theme') }],
	}, {
		description: 'Orders diagnostics by directive name and gives an explicit error matcher its own position',
		code: `
			.card {
				@warn "Empty theme";
				@debug $theme;
				color: red;
				@error "Unknown theme";
			}
		`,
		fixed: `
			.card {
				@debug $theme;
				@warn "Empty theme";
				color: red;
				@error "Unknown theme";
			}
		`,
		warnings: [{ message: messages.expectedBefore('@debug $theme', '@warn "Empty theme"') }],
	}],
});
