import parser from 'postcss-selector-parser';
import { selectorNodesToString } from '#modules/selectors/selector-nodes-to-string/selector-nodes-to-string';

/**
 * Adds a custom `.toString()` implementation to an array of selector nodes.
 *
 * By default, an array of PostCSS selector nodes does not produce a useful string
 * when converted via `.toString()`. This helper attaches a method that joins
 * the string representations of each node for easier use in comparisons and testing.
 *
 * @param   nodes   Array of `Node` objects.
 *
 * @returns         The same array with an overridden `.toString()` method.
 */
const setCustomToString = (nodes: parser.Node[]) => {
	nodes.toString = function () {
		return selectorNodesToString(this, { trim: false });
	};

	return nodes;
};

/**
 * Replaces SASS interpolations with unique valid identifier fragments of the same length.
 *
 * `postcss-selector-parser` treats interpolation syntax as CSS tokens and consequently
 * calculates incorrect source positions for the interpolated node and all following nodes.
 * Length-preserving placeholders let the parser build the right tree and source metadata.
 *
 * @param   selector   Raw selector string.
 *
 * @returns            Masked selector and the placeholder substitutions required to restore it.
 */
const maskSassInterpolations = (selector: string) => {
	const substitutions = new Map<string, string>();
	let placeholderCodePoint = 0xE000;

	const maskedSelector = selector.replaceAll(/#{[^{}]*}/g, (interpolation) => {
		let placeholderCharacter = String.fromCodePoint(placeholderCodePoint++);

		// Private-use characters are valid CSS identifier characters. Avoid the unlikely
		// collision with a character that is already present in the source selector.
		while (selector.includes(placeholderCharacter)) {
			placeholderCharacter = String.fromCodePoint(placeholderCodePoint++);
		}

		const placeholder = placeholderCharacter.repeat(interpolation.length);
		substitutions.set(placeholder, interpolation);

		return placeholder;
	});

	return { maskedSelector, substitutions };
};

/**
 * Collects the absolute index at which each source line starts.
 *
 * @param   value   Selector source.
 *
 * @returns         Zero-based line start indices.
 */
const getLineStartIndices = (value: string) => {
	const result = [0];

	for (const match of value.matchAll(/\r\n|[\n\f\r]/g)) {
		result.push(match.index + match[0].length);
	}

	return result;
};

/**
 * Converts an absolute source index into a one-based line and column pair.
 *
 * @param   sourceIndex        Absolute source index.
 * @param   lineStartIndices   Zero-based line start indices.
 *
 * @returns                    One-based source position.
 */
const getSourcePosition = (sourceIndex: number, lineStartIndices: number[]) => {
	let lineIndex = 0;

	for (let index = 1; index < lineStartIndices.length; index++) {
		if (lineStartIndices[index] > sourceIndex) break;
		lineIndex = index;
	}

	return {
		line: lineIndex + 1,
		column: sourceIndex - lineStartIndices[lineIndex] + 1,
	};
};

/**
 * Maps parser positions from the masked selector back to the original source.
 *
 * The mask preserves absolute string indices, but a multiline interpolation is
 * temporarily flattened and therefore changes the parser's line and column values.
 *
 * @param   root             Parsed selector tree.
 * @param   maskedSelector   Selector passed to the parser.
 * @param   selector         Original selector source.
 */
const restoreSourcePositions = (
	root: parser.Root,
	maskedSelector: string,
	selector: string,
) => {
	const maskedLineStartIndices = getLineStartIndices(maskedSelector);
	const sourceLineStartIndices = getLineStartIndices(selector);

	root.walk((node) => {
		if (!node.source) return;

		node.source.start &&= getSourcePosition(node.sourceIndex, sourceLineStartIndices);

		if (node.source.end) {
			const maskedEndLineStart = maskedLineStartIndices[node.source.end.line - 1] ?? 0;
			const endSourceIndex = maskedEndLineStart + node.source.end.column - 1;

			node.source.end = getSourcePosition(endSourceIndex, sourceLineStartIndices);
		}
	});
};

/**
 * Restores masked SASS interpolations without invoking the parser's CSS escaping logic.
 *
 * @param   root            Parsed selector tree.
 * @param   substitutions   Placeholder-to-interpolation map created before parsing.
 */
const restoreSassInterpolations = (
	root: parser.Root,
	substitutions: Map<string, string>,
) => {
	const restore = (value: string) => {
		let result = value;

		for (const [placeholder, interpolation] of substitutions) {
			result = result.replaceAll(placeholder, () => interpolation);
		}

		return result;
	};

	root.walk((node) => {
		// Most selector content is stored in `value`, e.g. `.button-#{$state}`.
		if (typeof node.value === 'string') {
			const restoredValue = restore(node.value);

			if (restoredValue !== node.value) {
				const rawValue = node.type === 'attribute' && node.raws.value
					? restore(node.raws.value)
					: restoredValue;

				node.setPropertyAndEscape('value', restoredValue, rawValue);
			}
		}

		// An attribute name is stored separately, e.g. `[data-#{$state}]`.
		if (node.type === 'attribute') {
			const restoredAttribute = restore(node.attribute);

			if (restoredAttribute !== node.attribute) {
				const rawAttribute = node.raws.attribute
					? restore(node.raws.attribute)
					: restoredAttribute;

				node.setPropertyAndEscape('attribute', restoredAttribute, rawAttribute);
			}
		}

		// A namespace is also stored separately, e.g. `#{$namespace}|button`.
		if ('namespace' in node && typeof node.namespace === 'string') {
			const restoredNamespace = restore(node.namespace);

			if (restoredNamespace !== node.namespace) {
				node.setPropertyAndEscape('namespace', restoredNamespace, restoredNamespace);
			}
		}
	});
};

/**
 * Keeps `#{&}` as a standalone tag node to distinguish it from a raw nesting node.
 *
 * @param   nodes   Selector nodes with restored interpolation values.
 *
 * @returns         The same node array with embedded `#{&}` values split into separate tags.
 */
const splitInterpolatedNestingNodes = (nodes: parser.Node[]) => {
	[...nodes].forEach((node) => {
		if ('nodes' in node) {
			splitInterpolatedNestingNodes(node.nodes);
		}

		if (
			!['class', 'id', 'tag'].includes(node.type)
			|| typeof node.value !== 'string'
			|| node.value === '#{&}'
			|| !node.value.includes('#{&}')
		) {
			return;
		}

		const parts = node.value.split(/(#{&})/).filter(Boolean);
		const identifierPrefixLength = node.type === 'tag' ? 0 : 1;
		let valueOffset = 0;

		const replacementNodes = parts.map((value, index) => {
			const canPreserveNodeType = index === 0 && value !== '#{&}';
			const sourceOffset = canPreserveNodeType
				? 0
				: identifierPrefixLength + valueOffset;
			const startColumn = (node.source?.start?.column ?? 1) + sourceOffset;
			const options = {
				value,
				sourceIndex: node.sourceIndex + sourceOffset,
				source: node.source && {
					start: { line: node.source.start?.line ?? 1, column: startColumn },
					end: {
						line: node.source.end?.line ?? 1,
						column: startColumn + value.length + (canPreserveNodeType ? identifierPrefixLength : 0) - 1,
					},
				},
				spaces: {
					before: index === 0 ? node.spaces.before : '',
					after: index === parts.length - 1 ? node.spaces.after : '',
				},
			};
			let replacementNode: parser.Node = parser.tag(options);

			if (canPreserveNodeType && node.type === 'class') {
				replacementNode = parser.className(options);
			}
			if (canPreserveNodeType && node.type === 'id') {
				replacementNode = parser.id(options);
			}

			valueOffset += value.length;
			return replacementNode;
		});

		node.replaceWith(...replacementNodes);
	});

	return nodes;
};

/**
 * Parses a CSS selector string into an array of selector node arrays.
 *
 * Each top-level selector (e.g. `.foo, .bar`) becomes a separate array of nodes.
 * Also protects source metadata from SASS interpolation parser bugs, keeps `#{&}`
 * distinguishable from raw nesting, and attaches `.toString()` to each selector part.
 *
 * If the selector is invalid, returns an empty array.
 *
 * @param   selector   Raw selector string to parse.
 *
 * @returns            Array of selector parts, each represented as an array of `Node`s.
 */
export const parseSelectors = (selector: string): parser.Node[][] => {
	try {
		let nodes: parser.Node[][] = [];
		const { maskedSelector, substitutions } = maskSassInterpolations(selector);

		parser((root: parser.Root) => {
			if (maskedSelector !== selector) {
				restoreSourcePositions(root, maskedSelector, selector);
			}
			restoreSassInterpolations(root, substitutions);
			nodes = root.nodes.map((selectorNode: parser.Selector) =>
				setCustomToString(splitInterpolatedNestingNodes(selectorNode.nodes)));
		}).processSync(maskedSelector);

		return nodes;
	} catch {
		// It crashes on invalid syntax while writing,
		// e.g. for `*::` - Error: Pseudo-class or pseudo-element expected
		return [];
	}
};
