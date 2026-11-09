import { arrayUnique, isEmpty, isString, isUndefined, toArray } from '@morev/utils';
import type { BemEntity } from '#modules/bem';
import type { EntityKind, Nesting, NestingOwner, Owner } from '../no-detached-entities.types';

/**
 * Canonical entity or implicit ancestor in the file's structural hierarchy.
 */
type EntityNode = {
	/**
	 * Most specific BEM category represented by this node.
	 */
	kind: EntityKind;

	/**
	 * Canonical class selector, including all entity parts.
	 */
	selector: string;

	/**
	 * Immediate semantic ancestor, independently of authored nesting.
	 */
	parent: EntityNode | undefined;

	/**
	 * Immediate semantic descendants, including undeclared intermediate entities.
	 */
	children: Set<EntityNode>;

	/**
	 * First explicit declaration line; states and context-only classes do not supply it.
	 */
	line: number | undefined;

	/**
	 * Whether a standalone compound explicitly declares this structural entity.
	 */
	isStructural: boolean;
};

/**
 * Collects declaration evidence and resolves configured owners without reparsing selectors.
 * Registration finishes before ownership queries so later declarations participate equally.
 *
 * @param   nesting     Structural policies with defaults applied.
 * @param   isIgnored   Whether a canonical entity is exempt from ownership requirements.
 *
 * @returns             Declaration registration, owner lookup, and missing-owner diagnostics.
 */
export const createNestingContext = (nesting: Nesting, isIgnored: (selector: string) => boolean) => {
	const entities = new Map<string, EntityNode>();
	const branchCounts = new Map<EntityNode, number>();
	const ownerCache = new Map<string, string[]>();
	const chainCache = new Map<string, readonly Owner[]>();

	const register = (entity: BemEntity, line: number | undefined, isStructural: boolean) => {
		const parts: Array<[EntityKind, string]> = [['block', entity.block.selector]];
		if (entity.element) parts.push(['element', entity.element.selector]);
		if (entity.modifierName) {
			parts.push([entity.element ? 'elementModifier' : 'blockModifier', entity.modifierName.selector]);
		}
		if (entity.modifierValue) {
			parts.push([entity.element ? 'elementModifierValue' : 'blockModifierValue', entity.modifierValue.selector]);
		}

		let selector = '';
		let parent: EntityNode | undefined;
		for (const [kind, part] of parts) {
			selector += part;
			let node = entities.get(selector);
			if (!node) {
				node = { kind, selector, parent, children: new Set(), line: undefined, isStructural: false };
				entities.set(selector, node);
				parent?.children.add(node);
			}
			parent = node;
		}
		parent!.line ??= line;
		parent!.isStructural ||= isStructural;
	};

	const getParent = (entity: EntityNode, kind: Exclude<NestingOwner, 'root'>): EntityNode => {
		let { parent } = entity;
		while (parent) {
			if (parent.kind === kind) return parent;
			parent = parent.parent;
		}
		// Incomplete modifier values can lack a modifier name; their base is still usable.
		return entity.parent!;
	};

	const getBranchWeight = (entity: EntityNode, children: number, assumed: ReadonlySet<EntityNode>): number => {
		if (entity.isStructural || assumed.has(entity)) return 1;
		if (children === 0) return 0;
		// Elements are distinct block branches; explicit modifier groups absorb their values.
		if (entity.kind === 'element' || !isUndefined(entity.line)) return 1;
		return children;
	};
	const emptyAssumptions = new Set<EntityNode>();
	const getBranchCount = (entity: EntityNode): number => {
		if (branchCounts.has(entity)) return branchCounts.get(entity)!;
		let count = 0;
		for (const child of entity.children) {
			count += getBranchWeight(child, getBranchCount(child), emptyAssumptions);
		}
		branchCounts.set(entity, count);
		return count;
	};

	/**
	 * Projects only the ancestors affected by declarations proposed in a diagnostic.
	 * This prevents a new modifier group from also requiring a redundant element wrapper.
	 *
	 * @param   declarations   Missing declarations included in the candidate repair path.
	 *
	 * @returns                Structural branch counts after creating those declarations.
	 */
	const projectBranches = (declarations: EntityNode[]) => {
		const counts = new Map<EntityNode, number>();
		const assumed = new Set<EntityNode>();
		const getCount = (entity: EntityNode) => counts.get(entity) ?? getBranchCount(entity);
		for (const entity of declarations) {
			let difference = 1 - getBranchWeight(entity, getCount(entity), assumed);
			assumed.add(entity);
			let { parent } = entity;
			while (parent && difference !== 0) {
				const previous = getCount(parent);
				const next = previous + difference;
				difference = getBranchWeight(parent, next, assumed) - getBranchWeight(parent, previous, assumed);
				counts.set(parent, next);
				parent = parent.parent;
			}
		}
		return getCount;
	};

	const resolveOwners = (entity: EntityNode, declarations: EntityNode[] = []): string[] => {
		if (entity.kind === 'block') return [];
		const policy = nesting[entity.kind];

		const fallback: string[] = [];
		let projected: ReturnType<typeof projectBranches> | undefined;
		for (const entry of policy) {
			if (isString(entry)) {
				fallback.push(entry === 'root' ? 'root' : getParent(entity, entry).selector);
				continue;
			}
			const parent = getParent(entity, entry.parent);
			const conditions = toArray(entry.when);
			if (conditions.includes('exists') && (!isUndefined(parent.line) || declarations.includes(parent))) {
				return [parent.selector];
			}
			if (conditions.includes('shared')) {
				projected ??= projectBranches(declarations);
				if (projected(parent) > 1) return [parent.selector];
			}
		}
		return arrayUnique(fallback);
	};

	const getOwners = (selector: string) => {
		if (!ownerCache.has(selector)) ownerCache.set(selector, resolveOwners(entities.get(selector)!));
		return ownerCache.get(selector)!;
	};

	/**
	 * Enumerates possible ancestor paths; BEM depth bounds the search independently of file size.
	 * Conditions are checked against each complete path after its new declarations are projected.
	 *
	 * @param   entity   Entity whose potential owners are being considered.
	 *
	 * @returns          Paths ordered from outermost owner to immediate owner.
	 */
	const getPaths = (entity: EntityNode): EntityNode[][] => {
		const paths: EntityNode[][] = [[]];
		if (entity.kind === 'block' || isIgnored(entity.selector)) return paths;
		const policy = nesting[entity.kind];

		const parents = new Set<EntityNode>();
		for (const entry of policy) {
			const kind = isString(entry) ? entry : entry.parent;
			if (kind !== 'root') parents.add(getParent(entity, kind));
		}
		for (const parent of parents) {
			if (!isUndefined(parent.line)) paths.push([parent]);
			else paths.push(...getPaths(parent).map((path) => [...path, parent]));
		}
		return paths;
	};

	const getOwnerChain = (selector: string, hasLocalExtension: boolean): readonly Owner[] => {
		const cacheKey = `${selector}:${hasLocalExtension ? 'extension' : 'entity'}`;
		if (chainCache.has(cacheKey)) return chainCache.get(cacheKey)!;
		const entity = entities.get(selector)!;
		const candidates = hasLocalExtension
			? getPaths(entity).map((path) => [...path, entity])
			: getPaths(entity);
		let best: EntityNode[] = [];
		let missing = Infinity;
		for (const path of candidates) {
			const declarations = path.filter((owner) => isUndefined(owner.line));
			if (declarations.length >= missing) continue;
			const isValid = path.every((owner, index) => {
				if (!isUndefined(owner.line) || isIgnored(owner.selector)) return true;
				const expected = resolveOwners(owner, declarations);
				return isEmpty(expected) || expected.includes(path[index - 1]?.selector ?? 'root');
			});
			if (!isValid) continue;
			const expected = hasLocalExtension ? [selector] : resolveOwners(entity, declarations);
			if (!isEmpty(expected) && !expected.includes(path.at(-1)?.selector ?? 'root')) continue;
			best = path;
			missing = declarations.length;
		}

		const chain: Owner[] = best.map((owner) => ({ selector: owner.selector, line: owner.line }));
		const first = best[0];
		if (first && isUndefined(first.line) && !isIgnored(first.selector)) {
			const declarations = best.filter((owner) => isUndefined(owner.line));
			if (resolveOwners(first, declarations).includes('root')) chain.unshift({ selector: 'root' });
		}
		const result = chain.length > 1 ? chain : [];
		chainCache.set(cacheKey, result);
		return result;
	};

	return {
		register,
		getOwners,
		getOwnerChain,
		getDeclarationLine: (selector: string) => entities.get(selector)?.line,
	};
};
