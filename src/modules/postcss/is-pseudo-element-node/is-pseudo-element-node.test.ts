import { isPseudoElementNode } from './is-pseudo-element-node';
import type { Node } from 'postcss-selector-parser';

const createPseudoNode = (value: string): Node =>
	({ type: 'pseudo', value } as Node);

describe(isPseudoElementNode, () => {
	it('Returns `true` for standard double-colon pseudo-elements', () => {
		expect(isPseudoElementNode(createPseudoNode('::before'))).toBe(true);
		expect(isPseudoElementNode(createPseudoNode('::after'))).toBe(true);
		expect(isPseudoElementNode(createPseudoNode('::slotted(something)'))).toBe(true);
		// Accepted even if unknown, relies on browser behavior
		expect(isPseudoElementNode(createPseudoNode('::nonexistent'))).toBe(true);
	});

	it('Returns `true` for legacy single-colon pseudo-elements', () => {
		expect(isPseudoElementNode(createPseudoNode(':before'))).toBe(true);
		expect(isPseudoElementNode(createPseudoNode(':after'))).toBe(true);
		expect(isPseudoElementNode(createPseudoNode(':first-letter'))).toBe(true);
		expect(isPseudoElementNode(createPseudoNode(':slotted(something)'))).toBe(true);
	});

	it('Returns `false` for pseudo-classes', () => {
		expect(isPseudoElementNode(createPseudoNode(':hover'))).toBe(false);
		expect(isPseudoElementNode(createPseudoNode(':focus'))).toBe(false);
		expect(isPseudoElementNode(createPseudoNode(':nth-child(2)'))).toBe(false);
	});

	it('Returns `false` for non-pseudo nodes', () => {
		expect(isPseudoElementNode({ type: 'class', value: 'div' } as Node)).toBe(false);
		expect(isPseudoElementNode({ type: 'tag', value: 'div' } as Node)).toBe(false);
	});

	it('Handles edge cases safely', () => {
		expect(isPseudoElementNode({ type: 'pseudo', value: '' } as Node)).toBe(false);
		expect(isPseudoElementNode({ type: 'pseudo', value: ':' } as Node)).toBe(false);
		expect(isPseudoElementNode({ type: 'pseudo', value: '::' } as Node)).toBe(false);
	});
});
