import postcss from 'postcss';
import { isPreambleBoundary } from './is-preamble-boundary';
import type { Rule } from 'postcss';

describe(isPreambleBoundary, () => {
	it('Protects the preamble and layer-order statements', () => {
		const root = postcss.parse(`
			@CHARSET "UTF-8";
			@Import "theme.css";
			@namespace svg url(http://www.w3.org/2000/svg);
			@LaYeR base, components;
		`);
		const [charset, imported, namespace, statement] = root.nodes;

		expect(isPreambleBoundary(charset)).toBe(true);
		expect(isPreambleBoundary(imported)).toBe(true);
		expect(isPreambleBoundary(namespace)).toBe(true);
		expect(isPreambleBoundary(statement)).toBe(true);
	});

	it('Does not treat layer blocks or ordinary stylesheet content as preamble', () => {
		const root = postcss.parse(`
			@LAYER components { .card { color: red; } }
			@media screen { .card { color: red; } }
			/* Component styles */
			.card { color: red; }
		`);
		const [block, media, comment, rule] = root.nodes;

		expect(isPreambleBoundary(block)).toBe(false);
		expect(isPreambleBoundary(media)).toBe(false);
		expect(isPreambleBoundary(comment)).toBe(false);
		expect(isPreambleBoundary(rule)).toBe(false);
		expect(isPreambleBoundary((rule as Rule).first!)).toBe(false);
	});
});
