import { parseSelectors } from '#utils';
import { getBemCandidateSegments } from './get-bem-candidate-segments';

const parseSelector = (selector: string) => parseSelectors(selector)[0];

/**
 * Utility to convert array of Node[] to array of string[] for easier comparison in tests.
 *
 * @param   segments   Result of `getBemCandidateSegments`.
 *
 * @returns            An array of string arrays representing selector fragments.
 */
const segmentsToStrings = (segments: ReturnType<typeof getBemCandidateSegments>) =>
	segments.map((segment) => segment.map((node) => node.toString()));

describe(getBemCandidateSegments, () => {
	it('Returns empty array for empty input', () => {
		const segments = getBemCandidateSegments([]);

		expect(segments).toStrictEqual([]);
	});

	it('Ignores segments without any class', () => {
		const nodes = parseSelector('h1 > header nav span');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([]);
	});

	it('Ignores segments without any class placed in pseudo-class', () => {
		const nodes = parseSelector('h1 > header nav span:not(h1 > header nav span)');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([]);
	});

	it('Includes nesting selector with pseudo-element and class', () => {
		const nodes = parseSelector('&__element::after');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['&', '__element', '::after'],
		]);
	});

	it('Includes nesting selector with only class', () => {
		const nodes = parseSelector('&.is-active');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['&', '.is-active'],
		]);
	});

	it('Handles complex selector with multiple combinators', () => {
		const nodes = parseSelector('.block > #id .element + .modifier ~ span.label');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['.block'],
			['.element'],
			['.modifier'],
			['span', '.label'],
		]);
	});

	it('Extracts a single segment with class candidates after a tag', () => {
		const nodes = parseSelector('h3.section-title');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['h3', '.section-title'],
		]);
	});

	it('Extracts multiple segments separated by combinators', () => {
		const nodes = parseSelector('.block--element.is-active section + section h3.section-title');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['.block--element', '.is-active'],
			['h3', '.section-title'],
		]);
	});

	it('Includes attribute selectors in the same segment with class', () => {
		const nodes = parseSelector('input[type="text"].field');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['input', '[type="text"]', '.field'],
		]);
	});

	it('Extracts segment from inside functional pseudo-class like :not()', () => {
		const nodes = parseSelector(':not(.is-disabled)');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['.is-disabled'],
		]);
	});

	it('Extracts multiple segments from inside functional pseudo-class', () => {
		const nodes = parseSelector('div:has(.is-disabled, .foo, header, header.foo)');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['.is-disabled'],
			[' .foo'],
			[' header', '.foo'],
		]);
	});

	it('Extracts segments from inside `:has()` with complex selector', () => {
		const nodes = parseSelector('.card:has(header .card__title.is-active).is-active');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['.card', ':has(header .card__title.is-active)', '.is-active'],
			['.card__title', '.is-active'],
		]);
	});

	it('Extracts both main segment and segment from inside :not()', () => {
		const nodes = parseSelector('.button:not(.is-disabled).is-active');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['.button', ':not(.is-disabled)', '.is-active'],
			['.is-disabled'],
		]);
	});

	it('Extracts both main segment and segment from inside pseudo-elements using nesting', () => {
		const nodes = parseSelector('&__item:not(.is-disabled:not(&__foo.is-active)).is-active');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['&', '__item', ':not(.is-disabled:not(&__foo.is-active))', '.is-active'],
			['.is-disabled', ':not(&__foo.is-active)'],
			['&', '__foo', '.is-active'],
		]);
	});

	it('Extracts segments from deeply nested pseudo-class structure', () => {
		const nodes = parseSelector('.card:not(:has(section .card__title.is-active)).is-active');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['.card', ':not(:has(section .card__title.is-active))', '.is-active'],
			['.card__title', '.is-active'],
		]);
	});

	it('Handles multiple nesting selectors in a compound selector', () => {
		const nodes = parseSelector('&--type#{&}--size#{&}--theme');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['&', '--type', '#{&}', '--size', '#{&}', '--theme'],
		]);
	});

	it('Extracts class segment inside `@at-root`', () => {
		const nodes = parseSelector('@at-root .block__element.is-active');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['.block__element', '.is-active'],
		]);
	});

	it('Extracts segments from inside `@nest` rule', () => {
		const nodes = parseSelector('@nest .block__element.is-active');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['.block__element', '.is-active'],
		]);
	});

	it('Handles interpolated & inside a class selector', () => {
		const nodes = parseSelector('.foo#{&}');
		const segments = getBemCandidateSegments(nodes);

		expect(segmentsToStrings(segments)).toStrictEqual([
			['.foo'],
			['#{&}'],
		]);
	});
});
