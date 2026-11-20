import { isError, isUndefined } from '@morev/utils';
import { resolveMostSpecificBemEntities } from '#modules/bem';
import { isAtRule } from '#modules/postcss';
import {
	createDisabledRangeChecker, createRule, extractSeparators, hasStylelintDirective, isStylelintDirective,
} from '#modules/rule-utils';
import { resolveSelectorNodes, splitSelectorCompounds } from '#modules/selectors';
import { schema } from './order.schema';
import {
	createContentInsertionChecker, createOrderConfig, createOrderDiagnostics, createOrderMoves, createOrderSpacing,
	findPropertyOrderConflict, getOrderHeader, getSassDefinition, hasSassPlaceholder, isPreambleBoundary, isSassBoundary,
	normalizeParameters, OrderSortError, resolveOrderSelector, sortOrderItems, sortSelectorList,
} from './utils';
import type { AtRule, ChildNode, Container, Document, Root, Rule } from 'postcss';
import type { OrderItem, OrderScopes, SelectorOrder } from './order.internal-types';
import type { OrderSpacingEdit } from './utils/create-order-spacing/create-order-spacing';

class OrderSpacingError extends Error {}

export default createRule({
	scope: 'bem',
	name: 'order',
	meta: {
		description: 'Orders CSS and SCSS content while keeping BEM families together.',
		deprecated: false,
		fixable: true,
	},
	messages: {
		expectedBefore: (first: string, second: string) => `Expected "${first}" to come before "${second}".`,
		expectedAfter: (first: string, second: string) => `Expected "${first}" to come after "${second}".`,
		expectedGroupBefore: (group: string, anchor: string) => `Expected ${group} to come before "${anchor}".`,
		expectedGroupAfter: (group: string, anchor: string) => `Expected ${group} to come after "${anchor}".`,
		unsafeOrder: (first: string, second: string) => `Cannot reorder "${first}" and "${second}" without changing their cascade.`,
		expectedEmptyLineBefore: (group: string) => `Expected an empty line before "${group}".`,
		unexpectedEmptyLineBefore: (group: string) => `Unexpected empty line before "${group}".`,
		expectedEmptyLineAfter: (group: string) => `Expected an empty line after "${group}".`,
		unexpectedEmptyLineAfter: (group: string) => `Unexpected empty line after "${group}".`,
		expectedCommentOnOwnLine: (member: string) => `Expected the comment before "${member}" on its own line.`,
		selectorList: (selector: string) => `Expected selector branches in the order "${selector}".`,
	},
	schema,
}, (primary, secondary, { root, result, report, messages }) => {
	let config: ReturnType<typeof createOrderConfig>;
	try {
		config = createOrderConfig(secondary);
	} catch (error) {
		result.warn(`Invalid category order for @morev/bem/order: ${isError(error) ? error.message : String(error)}`, {
			stylelintType: 'invalidOption',
		});
		result.stylelint.stylelintError = true;
		return;
	}

	const separators = extractSeparators(secondary.separators);
	const hasContentInsertion = createContentInsertionChecker();
	const knownTargets = new Set<string>();
	const selectors = new Map<Rule, SelectorOrder | null | undefined>();

	// Collect unambiguous BEM targets before resolving selectors with multiple possible owners.
	root.walkRules((node) => {
		const branches = resolveSelectorNodes({ node });
		if (branches.length !== 1 || (node.selector.includes('%') && hasSassPlaceholder(branches[0].source))) return;

		const target = splitSelectorCompounds(branches[0].resolved).at(-1);
		if (!target) return;

		const entities = resolveMostSpecificBemEntities({ nodes: target, separators });
		if (entities.length === 1) knownTargets.add(entities[0].bemSelector);
	});

	// Lists with a shared owner participate as whole rules, including when their local priority is unspecified.
	root.walkRules((node) => {
		const selector = resolveOrderSelector(node, separators, knownTargets);
		selectors.set(node, selector);
	});

	const isDisabled = createDisabledRangeChecker(result.stylelint, '@morev/bem/order');

	const pendingReports: Array<() => void> = [];
	const multiline = new Set<Container | Document>();

	// Build the region's target order and fix plan without changing the AST.
	const checkRegion = (
		region: OrderItem[], container: Root | Rule | AtRule, isRoot: boolean, owner?: SelectorOrder | null,
	) => {
		const items = [...region];
		const scopes: OrderScopes = { hasIgnored: false, sequences: [], spacing: [] };
		const sorted = sortOrderItems(items, config.getRank, {
			isRoot, depth: 0,
			container: Object.freeze(container.type === 'rule'
				? { type: 'rule', selector: container.selector }
				: container.type === 'atrule'
					? { type: 'at-rule', name: container.name, parameter: normalizeParameters(container.params) }
					: { type: 'root' }),
			family: Object.freeze((owner?.path ?? []).map((family) => Object.freeze({ ...family }))),
		}, scopes);

		// A conflicting declaration dependency blocks fixes for this region only.
		const conflict = findPropertyOrderConflict(items, sorted, ({ node }) => node.type === 'decl' ? node.prop : undefined);
		if (conflict) {
			const [first, second] = conflict;
			const headers: [string, string] = [getOrderHeader(first.node), getOrderHeader(second.node)];

			pendingReports.push(() => report({
				node: second.node, message: messages.unsafeOrder,
				messageArgs: headers, index: 0, endIndex: headers[1].length,
			}));
			return;
		}

		const moves = createOrderMoves(items, sorted);
		if (!moves.length && !scopes.spacing.length) return undefined;

		let spacing: OrderSpacingEdit[] = [];

		// Explain managed comparisons separately when ignored units retain their slots.
		const hasScopedComparisons = scopes.hasIgnored && scopes.sequences.length > 0;
		const sequences = hasScopedComparisons ? scopes.sequences : [{ items, sorted }];
		const reported = new Set<ChildNode>();
		const violations = sequences.flatMap((sequence) => {
			const relocations = hasScopedComparisons ? createOrderMoves(sequence.items, sequence.sorted) : moves;
			return createOrderDiagnostics(sequence.items, sequence.sorted, relocations);
		}).filter((violation) => {
			if (reported.has(violation.node)) return false;
			reported.add(violation.node);
			return true;
		});

		let hasAppliedFix = false;

		// All diagnostics in this region share one fix, which must apply at most once.
		const fix = () => {
			if (hasAppliedFix) return;
			hasAppliedFix = true;

			const original = items.flatMap((item) => item.nodes);
			const whitespace = new Map(original.map((node) => [node, node.raws.before]));
			const next = original.at(-1)!.next();
			const nextWhitespace = next?.raws.before;

			for (const move of moves) {
				let anchor = move.position === 'before' ? move.anchor.nodes[0] : move.anchor.nodes.at(-1)!;
				for (const node of move.items.flatMap((item) => item.nodes)) {
					node.remove();
					if (move.position === 'before') {
						container.insertBefore(anchor, node);
					} else {
						container.insertAfter(anchor, node);
						anchor = node;
					}
				}
			}

			// PostCSS may transfer root-leading whitespace while removing a node.
			// Restore authored spacing, keeping the leading slot at the start of the region.
			const first = sorted[0].nodes[0];
			for (const node of original) node.raws.before = whitespace.get(node);
			original[0].raws.before = whitespace.get(first);
			first.raws.before = whitespace.get(original[0]);
			if (next) next.raws.before = nextWhitespace;

			for (const edit of spacing) edit.node.raws[edit.field] = edit.value;
		};

		pendingReports.push(() => {
			for (const violation of violations) {
				report({
					node: violation.node,
					message: () => messages[violation.message](violation.header, violation.anchor),
					messageArgs: [violation.message, violation.header, violation.anchor],
					index: 0,
					endIndex: violation.endIndex,
					fix,
				});
			}

			for (const edit of spacing) {
				report({
					node: edit.reportNode, message: messages[edit.message],
					messageArgs: [edit.header], index: 0, endIndex: 1, fix,
				});
			}
		});

		if (!scopes.spacing.length) return undefined;

		return (isSingleLine: boolean) => {
			spacing = createOrderSpacing(items, sorted, container, scopes.spacing, isSingleLine);

			return spacing.some((edit) => edit.addsLineBreak);
		};
	};

	// Partition each container into movable regions and recurse without crossing protected boundaries.
	const checkContainer = (container: Root | Rule | AtRule, parent?: SelectorOrder | null, isRoot = true) => {
		if (!container.nodes) return;
		if (container.type === 'atrule' && /(?:^|-)keyframes$|^function$/iu.test(container.name)) return;

		if (container.type === 'rule' && secondary.selectorList
			&& !isDisabled(container) && !hasStylelintDirective(container)) {
			const selector = sortSelectorList(container, secondary.selectorList, config, separators, knownTargets);
			if (selector !== container.selector) {
				pendingReports.push(() => report({
					node: container, message: messages.selectorList, messageArgs: [selector],
					index: 0, endIndex: container.selector.length,
					fix: () => { container.selector = selector; },
				}));
			}
		}

		const own = container.type === 'rule' ? selectors.get(container) : parent;
		const items: OrderItem[] = [];
		const leading: ChildNode[] = [];
		const spacingPlans: Array<(isSingleLine: boolean) => boolean> = [];

		// Finish the current region before collecting nodes beyond a boundary.
		const flush = () => {
			const plan = checkRegion(items, container, isRoot, own);
			if (plan) spacingPlans.push(plan);
			items.length = 0;
			leading.length = 0;
		};

		const children = [...container.nodes];
		for (const [index, node] of children.entries()) {
			// Ordinary comments travel with their unit; Stylelint directives separate regions.
			if (node.type === 'comment') {
				const previous = items.at(-1);
				const next = children[index + 1];

				if (isStylelintDirective(node) || isDisabled(node)) {
					flush();
				} else if (previous && node.source?.start?.line === previous.nodes.at(-1)?.source?.end?.line) {
					previous.nodes.push(node);
				} else if (next && !/\n\s*\n/u.test(next.raws.before ?? '')) {
					leading.push(node);
				} else {
					flush();
				}

				continue;
			}

			const selector = node.type === 'rule' ? selectors.get(node) : undefined;
			const isBoundary = selector === null || isDisabled(node) || hasStylelintDirective(node)
				|| isSassBoundary(node, isRoot) || isPreambleBoundary(node) || hasContentInsertion(node);
			if (isBoundary) {
				flush();
			} else {
				// The inherited owner is already grouped; retain only the descendant family path.
				let shared = 0;
				while (own?.path[shared] && selector?.path[shared]?.key === own.path[shared].key) shared++;

				items.push({
					node,
					nodes: [...leading, node],
					selector: selector ? { ...selector, path: selector.path.slice(shared) } : undefined,
					sassDefinition: getSassDefinition(node),
				});
				leading.length = 0;
			}

			if ('nodes' in node) {
				// Root grouping at-rules preserve document ordering inside their bodies.
				const isRootGroup = isRoot && isAtRule(node, [
					'-moz-document', 'container', 'document', 'layer', 'media', 'scope', 'starting-style', 'supports',
				], { ignoreCase: true });
				checkContainer(node, own, isRootGroup);
			}
		}

		flush();
		if (!spacingPlans.length) return;

		// Descendants have already decided whether their fixes will expand this container.
		const start = container.source?.start;
		const isSingleLine = container.type !== 'root' && !multiline.has(container)
			&& !isUndefined(start) && start.line === container.source?.end?.line;
		let requiresGap = false;

		for (const plan of spacingPlans) {
			if (plan(isSingleLine)) requiresGap = true;
		}

		if (!isSingleLine || !requiresGap) return;

		// Every region must agree on whether the container will be multiline after the fix.
		requiresGap = false;
		for (const plan of spacingPlans) {
			if (plan(false)) requiresGap = true;
		}

		if (!requiresGap) {
			throw new OrderSpacingError(
				`Blank line policies at line ${start.line} require a gap only while the block is on one line.`,
			);
		}

		let ancestor: Container | Document | undefined = container.parent;
		while (ancestor && !multiline.has(ancestor)) {
			multiline.add(ancestor);
			ancestor = ancestor.parent;
		}
	};

	// Validate sorting callbacks and spacing plans before emitting diagnostics or applying fixes.
	try {
		checkContainer(root);
	} catch (error) {
		if (!(error instanceof OrderSortError || error instanceof OrderSpacingError)) throw error;

		const option = error instanceof OrderSpacingError ? 'blank line policy' : 'category order';
		result.warn(`Invalid ${option} for @morev/bem/order: ${error.message}`, { stylelintType: 'invalidOption' });
		result.stylelint.stylelintError = true;
		return;
	}

	// Apply reports only after every region has a valid plan.
	for (const applyReports of pendingReports) applyReports();
});
