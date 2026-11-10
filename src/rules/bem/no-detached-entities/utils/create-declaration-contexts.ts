import { isUndefined } from '@morev/utils';
import { isAtRule, isNodeWithin } from '#modules/postcss';
import { selectorNodesToString } from '#modules/selectors';
import type { AtRule, Node } from 'postcss';
import type parser from 'postcss-selector-parser';

/**
 * One explicit occurrence of a canonical BEM entity.
 */
type Declaration = {
	/**
	 * Authored selector owner, retained to prefer actual ancestors in diagnostics.
	 */
	node: Node;

	/**
	 * Line of the target class within its selector branch.
	 */
	line: number;
};

/**
 * Declaration evidence shared by selectors with the same surrounding conditions.
 */
type DeclarationContext = {
	/**
	 * Explicit occurrences in this exact context, indexed by canonical BEM selector.
	 */
	declarations: Map<string, Declaration[]>;

	/**
	 * Whether an owner is declared here or in a compatible outer context.
	 */
	hasDeclaration: (selector: string) => boolean;

	/**
	 * Nearest compatible declaration, preferring local context and actual ancestors.
	 */
	getDeclarationLine: (selector: string, from: Node) => number | undefined;
};

/**
 * Concrete at-rule path; repeated wrappers with identical text remain separate.
 */
type AtRuleContext = {
	/**
	 * Less restricted enclosing at-rule context, absent at the stylesheet root.
	 */
	parent?: AtRuleContext;

	/**
	 * Contexts introduced by individual authored at-rules.
	 */
	children: Map<AtRule, AtRuleContext>;

	/**
	 * Selector contexts within this at-rule path, keyed by their resolved prefixes.
	 */
	selectors: Map<string, DeclarationContext>;
};

/**
 * Indexes declarations by surrounding at-rules and resolved selector context.
 * Only outward lookup is allowed; sibling conditions cannot supply an owner.
 *
 * @returns   A context lookup for each resolved selector branch.
 */
export const createDeclarationContexts = () => {
	const root: AtRuleContext = { children: new Map(), selectors: new Map() };
	const atRulePaths = new WeakMap<Node, AtRule[]>();

	const getAtRulePath = (node: Node): AtRule[] => {
		if (atRulePaths.has(node)) return atRulePaths.get(node)!;
		let path = node.parent ? getAtRulePath(node.parent) : [];
		if (isAtRule(node, ['at-root'])) {
			// Static hoisting changes applicability, while lexical ownership remains resolver-owned.
			const query = node.params.match(/^\(\s*(with|without)\s*:\s*([\s\w-]+)\)$/);
			if (query) {
				const [, mode, value] = query;
				const names = value.trim().split(/\s+/);
				path = path.filter((ancestor) => {
					const isIncluded = names.includes('all') || names.includes(ancestor.name);
					return mode === 'with' ? isIncluded : !isIncluded;
				});
			} else if (node.params.trimStart().startsWith('(')) {
				// Dynamic queries cannot establish compatibility with another authored region.
				path = [...path, node];
			}
		} else if (isAtRule(node) && node.name !== 'nest') {
			path = [...path, node];
		}
		atRulePaths.set(node, path);
		return path;
	};

	return (node: Node, selectorContext: parser.Node[]) => {
		let atRuleContext = root;
		for (const atRule of getAtRulePath(node)) {
			if (!atRuleContext.children.has(atRule)) {
				atRuleContext.children.set(atRule, {
					parent: atRuleContext, children: new Map(), selectors: new Map(),
				});
			}
			atRuleContext = atRuleContext.children.get(atRule)!;
		}

		// Keep combinators in the key: `.theme > .card` and `.theme .card` are different contexts.
		const prefixes = [''];
		const parts: string[] = [];
		let compound: parser.Node[] = [];
		for (const part of selectorContext) {
			if (part.type !== 'combinator') {
				compound.push(part);
				continue;
			}
			parts.push(selectorNodesToString(compound), part.value.trim());
			prefixes.push(JSON.stringify(parts));
			compound = [];
		}
		const key = prefixes.at(-1)!;
		const existing = atRuleContext.selectors.get(key);
		if (existing) return existing;

		// Resolve this list only after registration, so later declarations participate equally.
		let visibleContexts: DeclarationContext[] | undefined;
		const getVisibleContexts = () => {
			if (visibleContexts) return visibleContexts;
			visibleContexts = [];
			let current: AtRuleContext | undefined = atRuleContext;
			while (current) {
				for (let index = prefixes.length - 1; index >= 0; index--) {
					const candidate = current.selectors.get(prefixes[index]);
					if (candidate) visibleContexts.push(candidate);
				}
				current = current.parent;
			}
			return visibleContexts;
		};

		const context: DeclarationContext = {
			declarations: new Map(),
			hasDeclaration: (selector) => getVisibleContexts().some((candidate) => candidate.declarations.has(selector)),
			getDeclarationLine: (selector, from) => {
				for (const candidate of getVisibleContexts()) {
					const declarations = candidate.declarations.get(selector);
					if (isUndefined(declarations)) continue;
					const fromLine = from.source?.start?.line ?? 1;
					let best = declarations[0];
					for (const declaration of declarations) {
						const isAncestor = isNodeWithin(from, declaration.node);
						const isBestAncestor = isNodeWithin(from, best.node);
						if (isAncestor !== isBestAncestor) {
							if (isAncestor) best = declaration;
						} else if (Math.abs(declaration.line - fromLine) < Math.abs(best.line - fromLine)) {
							best = declaration;
						}
					}
					return best.line;
				}
				return undefined;
			},
		};
		atRuleContext.selectors.set(key, context);
		return context;
	};
};

export type { DeclarationContext };
