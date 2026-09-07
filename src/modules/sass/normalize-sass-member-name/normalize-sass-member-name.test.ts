import { normalizeSassMemberName } from './normalize-sass-member-name';

describe(normalizeSassMemberName, () => {
	it('Replaces underscores with hyphens', () => {
		expect(normalizeSassMemberName('$menu_item_state')).toBe('$menu-item-state');
		expect(normalizeSassMemberName('reset_list')).toBe('reset-list');
	});

	it('Preserves an already canonical name', () => {
		expect(normalizeSassMemberName('$menu-item-state')).toBe('$menu-item-state');
		expect(normalizeSassMemberName('reset-list')).toBe('reset-list');
	});
});
