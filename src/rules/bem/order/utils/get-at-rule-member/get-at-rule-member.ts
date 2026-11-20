import selectorParser from 'postcss-selector-parser';
import type { ChildNode } from 'postcss';
import type { OrderItem } from '../../order.internal-types';

// A hexadecimal escape can consume whitespace inside an identifier.
const identifier = /^(?:[\w\P{ASCII}-]|\\(?:[\da-f]{1,6}\s?|[^\d\n\f\ra-f]))+/iu;

/**
 * Extracts one static identifier and its authored length, including any CSS escapes.
 *
 * @param   source   The beginning of a name or the part after a namespace separator.
 *
 * @returns          The decoded name and where it ends, unless it contains interpolation.
 */
const readIdentifier = (source: string) => {
	const raw = identifier.exec(source)?.[0];
	if (!raw || source.startsWith('#{', raw.length)) return undefined;

	const name = raw.includes('\\') ? selectorParser().astSync(`.${raw}`).first.first.value : raw;
	return name ? { name, length: raw.length } : undefined;
};

/**
 * Reads the static name from a CSS or Sass definition or a Sass mixin call.
 *
 * @param   node   Authored node being classified.
 *
 * @returns        The member and its ordering category, when the name is known.
 */
export const getAtRuleMember = (node: ChildNode): OrderItem['atRuleMember'] => {
	if (node.type !== 'atrule') return undefined;
	const directive = node.name.toLowerCase();
	const isInclude = node.name === 'include';
	if (!isInclude && (!node.nodes || (directive !== 'function' && directive !== 'mixin'))) return undefined;

	const first = readIdentifier(node.params);
	if (!first) return undefined;
	const { name, length } = first;

	if (isInclude) {
		if (node.params[length] !== '.') return { category: 'sass:includes', name };
		const member = readIdentifier(node.params.slice(length + 1));
		return member ? { category: 'sass:includes', name: `${name}.${member.name}` } : undefined;
	}

	if (name.startsWith('--')) return { category: directive === 'function' ? 'css:functions' : 'css:mixins', name };
	if (node.name === 'function') return { category: 'sass:functions', name };
	if (node.name === 'mixin') return { category: 'sass:mixins', name };
	return undefined;
};
