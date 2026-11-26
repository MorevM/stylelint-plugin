import { doPropertiesOverlap } from './do-properties-overlap';

describe(doPropertiesOverlap, () => {
	it('Recognizes shorthand resets including properties outside their serialized values', () => {
		expect(doPropertiesOverlap('white-space-collapse', 'white-space')).toBe(true);
		expect(doPropertiesOverlap('text-wrap-style', 'text-wrap')).toBe(true);
		expect(doPropertiesOverlap('mask-border-source', 'mask')).toBe(true);
		expect(doPropertiesOverlap('animation-composition', 'animation')).toBe(true);
		expect(doPropertiesOverlap('font-synthesis-position', 'font-synthesis')).toBe(true);
	});

	it('Recognizes normalized identities and nested shorthand dependencies in either direction', () => {
		expect(doPropertiesOverlap('-webkit-transform', 'transform')).toBe(true);
		expect(doPropertiesOverlap('grid-gap', 'gap')).toBe(true);
		expect(doPropertiesOverlap('border', 'border-top-width')).toBe(true);
		expect(doPropertiesOverlap('border-top-width', 'border')).toBe(true);
		expect(doPropertiesOverlap('--Color', '--Color')).toBe(true);
		expect(doPropertiesOverlap('$color', '$color')).toBe(true);
	});

	it('Recognizes physical and logical overlap in either direction', () => {
		expect(doPropertiesOverlap('margin-inline', 'margin-top')).toBe(true);
		expect(doPropertiesOverlap('margin-top', 'margin-inline')).toBe(true);
		expect(doPropertiesOverlap('border-block', 'border-left-color')).toBe(true);
		expect(doPropertiesOverlap('inline-size', 'height')).toBe(true);
	});

	it('Does not couple independent properties, logical edges or differently named variables', () => {
		expect(doPropertiesOverlap('color', 'display')).toBe(false);
		expect(doPropertiesOverlap('margin-inline-start', 'margin-inline-end')).toBe(false);
		expect(doPropertiesOverlap('--Color', '--color')).toBe(false);
		expect(doPropertiesOverlap('$Color', '$color')).toBe(false);
		expect(doPropertiesOverlap('--color', 'color')).toBe(false);
		expect(doPropertiesOverlap('constructor', 'color')).toBe(false);
	});

	it('Applies all to ordinary properties while respecting reset exceptions', () => {
		expect(doPropertiesOverlap('all', 'margin')).toBe(true);
		expect(doPropertiesOverlap('margin', 'all')).toBe(true);
		expect(doPropertiesOverlap('all', '--color')).toBe(false);
		expect(doPropertiesOverlap('$color', 'all')).toBe(false);
		expect(doPropertiesOverlap('all', 'direction')).toBe(false);
		expect(doPropertiesOverlap('unicode-bidi', 'all')).toBe(false);
	});
});
