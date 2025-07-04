import rule from './no-internal-side-effects';

const { ruleName, messages } = rule;
const testRule = createTestRule({ ruleName, customSyntax: 'postcss-scss' });

testRule({
	description: 'Default options',
	config: [true],
	accept: [
		{
			description: 'No external geometry in the component',
			code: `
				.the-component {
					$b: #{&};

					&__foo {}
					&__foo:hover &__bar{}

					&__bar {}
				}
			`,
		},
	],
	reject: [
	],
});
