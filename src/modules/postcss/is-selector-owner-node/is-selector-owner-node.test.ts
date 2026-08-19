import { AtRule, Declaration, Rule } from 'postcss';
import { isSelectorOwnerNode } from './is-selector-owner-node';

describe(isSelectorOwnerNode, () => {
	it('Accepts ordinary CSS rules', () => {
		expect(isSelectorOwnerNode(new Rule({ selector: '.block' }))).toBe(true);
	});

	it.each(['nest', 'at-root'])('Accepts @%s rules', (name) => {
		expect(isSelectorOwnerNode(new AtRule({ name }))).toBe(true);
	});

	it('Rejects unrelated at-rules and declarations', () => {
		expect(isSelectorOwnerNode(new AtRule({ name: 'media' }))).toBe(false);
		expect(isSelectorOwnerNode(new Declaration({ prop: 'color', value: 'red' }))).toBe(false);
	});

	it('Rejects keyframe steps', () => {
		const keyframes = new AtRule({ name: 'keyframes' });
		const step = new Rule({ selector: 'from' });
		keyframes.append(step);

		expect(isSelectorOwnerNode(step)).toBe(false);
	});
});
