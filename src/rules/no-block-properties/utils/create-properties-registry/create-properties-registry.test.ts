import { createPropertiesRegistry } from './create-properties-registry';

describe(createPropertiesRegistry, () => {
	it('Merges built-in presets and property-to-preset map correctly', () => {
		const registry = createPropertiesRegistry({
			presets: ['EXTERNAL_GEOMETRY', 'CONTEXT'],
		});

		expect(registry.propertyToPresetMap.get('margin')).toBe('EXTERNAL_GEOMETRY');
		expect(registry.propertyToPresetMap.get('z-index')).toBe('CONTEXT');

		expect(registry.disallowedProperties.block.has('margin')).toBe(true);
		expect(registry.disallowedProperties.modifier.has('margin')).toBe(true);
		expect(registry.disallowedProperties.utility.has('margin')).toBe(true);

		expect(registry.disallowedProperties.block.has('z-index')).toBe(true);
		expect(registry.disallowedProperties.modifier.has('z-index')).toBe(true);
		expect(registry.disallowedProperties.utility.has('z-index')).toBe(true);
	});

	it('Merges custom presets into property-to-preset map', () => {
		const registry = createPropertiesRegistry({
			customPresets: {
				CUSTOM: ['foo', 'bar'],
			},
			presets: ['EXTERNAL_GEOMETRY'],
		});

		expect(registry.propertyToPresetMap.get('foo')).toBe('CUSTOM');
		expect(registry.propertyToPresetMap.get('bar')).toBe('CUSTOM');
		expect(registry.propertyToPresetMap.get('margin')).toBe('EXTERNAL_GEOMETRY');
	});

	it('Does not throw in case of unknown preset', () => {
		expect(() => {
			createPropertiesRegistry({
				presets: ['EXTERNAL_GEOMETRY', 'FOO', 'BAR'],
			});
		}).to.not.throw();
	});

	it('Removes globally allowed properties from disallowed set', () => {
		const registry = createPropertiesRegistry({
			presets: ['EXTERNAL_GEOMETRY'],
			allowProperties: ['margin'],
		});

		expect(registry.disallowedProperties.block.has('margin')).toBe(false);
	});

	it('Appends globally disallowed properties to disallowed set', () => {
		const registry = createPropertiesRegistry({
			presets: ['EXTERNAL_GEOMETRY'],
			disallowProperties: ['color'],
		});

		expect(registry.disallowedProperties.block.has('color')).toBe(true);
	});

	it('Applies `perEntity` disallow and allow properties correctly', () => {
		const registry = createPropertiesRegistry({
			presets: ['EXTERNAL_GEOMETRY'],
			perEntity: {
				block: {
					disallowProperties: ['foo', 'bar'],
					allowProperties: ['foo'],
				},
			},
		});

		expect(registry.disallowedProperties.block.has('foo')).toBe(false);
		expect(registry.disallowedProperties.block.has('bar')).toBe(true);
		expect(registry.disallowedProperties.block.has('margin')).toBe(true);
	});

	it('Handles `undefined` secondary option gracefully', () => {
		const registry = createPropertiesRegistry({});

		expect(registry.disallowedProperties.block.size).toBe(0);
		expect(registry.propertyToPresetMap).toBeInstanceOf(Map);
	});
});
