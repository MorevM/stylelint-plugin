import { isEmpty, tsObject } from '@morev/utils';
import type { SecondaryOption } from '../../no-block-properties.types';

type PresetsMap = Record<string, Set<string>>;
type RequiredPerEntity = NonNullable<SecondaryOption['perEntity']>;
type PerEntityItem = RequiredPerEntity[keyof RequiredPerEntity];

const BUILTIN_PRESETS = {
	EXTERNAL_GEOMETRY: new Set([
		'margin',
		'margin-block', 'margin-block-start', 'margin-block-end',
		'margin-inline', 'margin-inline-start', 'margin-inline-end',
		'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
	]),
	CONTEXT: new Set([
		'float', 'clear',
		'flex', 'flex-grow', 'flex-shrink', 'flex-basis',
		'grid', 'grid-area',
		'grid-row', 'grid-row-start', 'grid-row-end',
		'grid-column', 'grid-column-start', 'grid-column-end',
		'place-self', 'align-self',
		'order',
		'counter-increment',
		'z-index',
	]),
	POSITIONING: new Set([
		'position',
		'inset',
		'inset-block', 'inset-block-start', 'inset-block-end',
		'inset-inline', 'inset-inline-start', 'inset-inline-end',
		'top', 'right', 'bottom', 'left',
	]),
};

export const createPropertiesRegistry = (
	secondary: SecondaryOption,
) => {
	const allPresets: PresetsMap = { ...BUILTIN_PRESETS };

	// Merge custom user presets into `allPresets`
	if (secondary.customPresets) {
		for (const [presetName, properties] of tsObject.entries(secondary.customPresets)) {
			allPresets[presetName] = new Set(properties);
		}
	}

	// Build property-to-preset map for O(1) access
	const propertyToPresetMap = new Map<string, string>();
	for (const [presetName, properties] of tsObject.entries(allPresets)) {
		for (const property of properties) {
			propertyToPresetMap.set(property, presetName);
		}
	}

	// Global disallowed properties based on selected presets and options
	// TODO[engine:node@>=22]: Use `Set.union` and `Set.difference`
	const globalDisallowed = new Set<string>([
		...secondary.disallowProperties ?? [],
		...(secondary.presets ?? []).flatMap((presetName) => [...(allPresets[presetName] ?? [])]),
	]);

	// Explicitly allowed properties are removed
	if (!isEmpty(secondary.allowProperties)) {
		for (const allowed of secondary.allowProperties) {
			globalDisallowed.delete(allowed);
		}
	}

	const buildDisallowedSet = (entityConfig?: PerEntityItem) => {
		// TODO[engine:node@>=22]: Use `Set.union` and `Set.difference`
		const disallowedSet = new Set<string>([
			...(entityConfig?.disallowProperties ?? []),
			...(entityConfig?.presets ?? []).flatMap(
				(presetName) => [...(allPresets[presetName] ?? [])],
			),
			...globalDisallowed,
		]);

		for (const allowed of entityConfig?.allowProperties ?? []) {
			disallowedSet.delete(allowed);
		}

		return disallowedSet;
	};

	return {
		disallowedProperties: {
			block: buildDisallowedSet(secondary.perEntity?.block),
			modifier: buildDisallowedSet(secondary.perEntity?.modifier),
			utility: buildDisallowedSet(secondary.perEntity?.utility),
		},
		propertyToPresetMap,
	};
};
