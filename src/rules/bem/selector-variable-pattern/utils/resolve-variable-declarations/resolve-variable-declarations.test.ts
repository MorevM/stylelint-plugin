import postcssScss from 'postcss-scss';
import { getRuleBySelector } from '#modules/test-utils';
import { resolveVariableDeclarations } from './resolve-variable-declarations';
import type { Rule } from 'postcss';

describe(resolveVariableDeclarations, () => {
	it('Represents stylesheet-root declarations as level zero without an owner', () => {
		const root = postcssScss.parse(`
			$block: '.block';
			$item: '#{$block}__item';

			.block {
				$nested: '#{&}__nested';
			}
		`);

		const resolution = resolveVariableDeclarations(root);

		expect(resolution?.owner).toBeNull();
		expect(resolution?.declarations.map(({ declaration, resolved }) => ({
			name: declaration.prop,
			value: resolved?.value ?? null,
		}))).toStrictEqual([
			{ name: '$block', value: '.block' },
			{ name: '$item', value: '.block__item' },
		]);
	});

	it('Resolves declarations with variables visible before a nested branch', () => {
		const root = postcssScss.parse(`
			$block: .block;
			.block {
				$before: #{$block}__before;
				@media (width > 0) {
					&__item {
						$visible: #{$before}--active;
						$hidden: #{$after}--active;
					}
				}
				$after: #{$block}__after;
				@media (width > 0) {
					&__later {
						$later: #{$after}--active;
					}
				}
			}
		`);
		const rule = getRuleBySelector<Rule>(root, '&__item');
		const laterRule = getRuleBySelector<Rule>(root, '&__later');

		const resolution = resolveVariableDeclarations(rule);
		const laterResolution = resolveVariableDeclarations(laterRule);

		expect(resolution?.owner).toStrictEqual({
			selector: '.block__item',
			depth: 2,
			path: ['.block', '&__item'],
		});
		expect(resolution?.declarations.map(({ declaration, resolved }) => ({
			name: declaration.prop,
			value: resolved?.value ?? null,
		}))).toStrictEqual([
			{ name: '$visible', value: '.block__before--active' },
			{ name: '$hidden', value: null },
		]);
		expect(laterResolution?.owner).toStrictEqual({
			selector: '.block__later',
			depth: 2,
			path: ['.block', '&__later'],
		});
		expect(laterResolution?.declarations[0].resolved?.value).toBe('.block__after--active');
	});

	it('Resolves root variables declared before the outer rule', () => {
		const root = postcssScss.parse(`
			$block: .block;
			.block {
				$item: #{$block}__item;
			}
		`);
		const rule = getRuleBySelector<Rule>(root, '.block');

		const resolution = resolveVariableDeclarations(rule);

		expect(resolution?.owner).toStrictEqual({
			selector: '.block',
			depth: 1,
			path: ['.block'],
		});
		expect(resolution?.declarations[0].resolved?.value).toBe('.block__item');
	});

	it('Preserves an authored selector path deeper than one nested level', () => {
		const root = postcssScss.parse(`
			.block {
				&__wrapper {
					@media (width > 0) {
						&--active {
							$item: '.block__item';
						}
					}
				}
			}
		`);
		const rule = getRuleBySelector<Rule>(root, '&--active');

		const resolution = resolveVariableDeclarations(rule);

		expect(resolution?.owner).toStrictEqual({
			selector: '.block__wrapper--active',
			depth: 3,
			path: ['.block', '&__wrapper', '&--active'],
		});
	});

	it('Returns `null` for an ambiguous selector chain', () => {
		const root = postcssScss.parse(`
			.block,
			.other {
				$item: #{&}__item;
			}
		`);
		const rule = root.first as Rule;

		expect(resolveVariableDeclarations(rule)).toBeNull();
	});
});
