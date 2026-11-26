import { arrayUnique, isEmpty, isString, isUndefined, toArray } from '@morev/utils';
import type { Node } from 'postcss';
import type { BemEntity } from '#modules/bem';
import type { EntityKind, Nesting, NestingOwner, Owner } from '../no-detached-entities.types';
import type { DeclarationContext } from './create-declaration-contexts';

/**
 * Canonical entity or implicit ancestor in one context's structural hierarchy.
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
	 * Whether a local selector explicitly declares this entity, including under inherited context.
	 */
	isStructural: boolean;
};

/**
 * Collects declaration evidence and resolves configured owners without reparsing selectors.
 * Registration finishes before ownership queries so later declarations participate equally.
 *
 * @param   nesting     Structural policies with defaults applied.
 * @param   isIgnored   Whether a canonical entity is exempt from ownership requirements.
 * @param   context     Local declarations and compatible outer declaration lookup.
 *
 * @returns             Declaration registration, owner lookup, and missing-owner diagnostics.
 */
export const createNestingContext = (
	nesting: Nesting,
	isIgnored: (selector: string) => boolean,
	context: DeclarationContext,
) => {
	const entities = new Map<string, EntityNode>();
	const branchCounts = new Map<EntityNode, number>();
	const ownerCache = new Map<string, string[]>();
	const chainCache = new Map<string, EntityNode[]>();

	const register = (entity: BemEntity, sourceNode: Node, line: number | undefined, isStructural: boolean) => {
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
				node = { kind, selector, parent, children: new Set(), isStructural: false };
				entities.set(selector, node);
				parent?.children.add(node);
			}
			parent = node;
		}
		parent!.isStructural ||= isStructural;
		if (!isUndefined(line)) {
			const declarations = context.declarations.get(selector) ?? [];
			declarations.push({ node: sourceNode, line });
			context.declarations.set(selector, declarations);
		}
	};

	const getParent = (entity: EntityNode, kind: NestingOwner): EntityNode => {
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
		if (entity.kind === 'element' || context.declarations.has(entity.selector)) return 1;
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
				fallback.push(getParent(entity, entry).selector);
				continue;
			}
			const parent = getParent(entity, entry.parent);
			const conditions = toArray(entry.when);
			if (conditions.includes('exists') && (context.hasDeclaration(parent.selector) || declarations.includes(parent))) {
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
			parents.add(getParent(entity, kind));
		}
		for (const parent of parents) {
			if (context.hasDeclaration(parent.selector)) paths.push([parent]);
			else paths.push(...getPaths(parent).map((path) => [...path, parent]));
		}
		return paths;
	};

	const getOwnerPath = (selector: string, hasLocalExtension: boolean): EntityNode[] => {
		const cacheKey = `${selector}:${hasLocalExtension ? 'extension' : 'entity'}`;
		if (chainCache.has(cacheKey)) return chainCache.get(cacheKey)!;
		const entity = entities.get(selector)!;
		const candidates = hasLocalExtension
			? getPaths(entity).map((path) => [...path, entity])
			: getPaths(entity);
		let best: EntityNode[] = [];
		let missing = Infinity;
		for (const path of candidates) {
			const declarations = path.filter((owner) => !context.hasDeclaration(owner.selector));
			if (declarations.length >= missing) continue;
			const isValid = path.every((owner, index) => {
				if (context.hasDeclaration(owner.selector) || isIgnored(owner.selector)) return true;
				const expected = resolveOwners(owner, declarations);
				const parent = path[index - 1];
				return isEmpty(expected) || (!isUndefined(parent) && expected.includes(parent.selector));
			});
			if (!isValid) continue;
			const expected = hasLocalExtension ? [selector] : resolveOwners(entity, declarations);
			const parent = path.at(-1);
			if (!isEmpty(expected) && (isUndefined(parent) || !expected.includes(parent.selector))) continue;
			best = path;
			missing = declarations.length;
		}

		const result = best.length > 1 ? best : [];
		chainCache.set(cacheKey, result);
		return result;
	};

	const getOwnerChain = (selector: string, hasLocalExtension: boolean, from: Node): readonly Owner[] => {
		// The required path is shared within a context; its most useful declaration lines depend on the caller.
		return getOwnerPath(selector, hasLocalExtension).map((owner) => ({
			selector: owner.selector,
			line: context.getDeclarationLine(owner.selector, from),
		}));
	};

	return {
		register,
		getOwners,
		getOwnerChain,
		getDeclarationLine: context.getDeclarationLine,
	};
};
