<template>
	<component
		:is="$props.lineHints ? 'div' : 'figure'"
		ref="source"
		class="annotated-code"
		:class="$props.lineHints ? 'annotated-code--hints' : 'annotated-code--hierarchy'"
		@pointermove="onPointerMove"
		@pointerleave="onPointerLeave"
		@click="showAtPointer"
		@focusin="onFocus"
		@focusout="dismiss"
	>
		<slot></slot>
		<div
			v-if="entry && root"
			:id="captionId"
			ref="caption"
			class="annotated-code__caption"
			role="tooltip"
		>
			<dl v-if="!$props.lineHints" class="annotated-code__levels">
				<div class="annotated-code__level annotated-code__level--root">
					<dt>Root scope</dt>
					<dd>{{ root.label }}</dd>
				</div>
				<div v-if="family" class="annotated-code__level annotated-code__level--family">
					<dt>Family</dt>
					<dd>
						{{ family.family }}
						<small v-if="family !== root">{{ family.label }}</small>
					</dd>
				</div>
				<div v-if="category" class="annotated-code__level annotated-code__level--entry">
					<dt>Category</dt>
					<dd>{{ category }}</dd>
				</div>
			</dl>
			<div class="annotated-code__note">
				<slot :name="`hint-${selection?.index}`">{{ entry.note }}</slot>
			</div>
		</div>
	</component>
</template>

<script setup lang="ts">
	import { computed, onBeforeUnmount, onMounted, shallowRef, useId, useTemplateRef, watch, watchPostEffect } from 'vue';
	import { clamp, isElement, isUndefined } from '@morev/utils';
	import type { CodeRegion } from '../../annotated-scss';

	const $props = defineProps<{ regions: CodeRegion[]; lineHints?: boolean }>();
	const captionId = useId();
	const caption = useTemplateRef('caption');
	const source = useTemplateRef<HTMLElement>('source');
	const selection = shallowRef<{ index: number; x: number; y: number; focusedLine?: HTMLElement }>();
	const entry = computed(() => selection.value && $props.regions[selection.value.index]);
	const ancestry = computed(() => {
		const path: CodeRegion[] = [];
		let region = entry.value;
		while (region) {
			path.push(region);
			region = isUndefined(region.parent) ? undefined : $props.regions[region.parent];
		}
		return path;
	});
	const root = computed(() => ancestry.value.at(-1));
	const family = computed(() => ancestry.value.find((region) => region.family));
	const category = computed(() => {
		if (entry.value?.family) return 'base';
		return entry.value !== root.value ? entry.value?.label : undefined;
	});
	let lines: HTMLElement[] = [];

	function isLineInRegion(lineNumber: number, region?: CodeRegion) {
		return !!region && lineNumber >= region.start && lineNumber <= region.end;
	}

	watch(entry, (current, previous) => {
		if (previous) lines[previous.start - 1].removeAttribute('aria-describedby');
		if (current) lines[current.start - 1].setAttribute('aria-describedby', captionId);
		if ($props.lineHints) return;
		lines.forEach((line, i) => {
			const number = i + 1;
			line.toggleAttribute('data-root-active', isLineInRegion(number, root.value));
			line.toggleAttribute('data-family-active', isLineInRegion(number, family.value));
			const isActive = current?.family
				? number === current.start || number === current.end
				: isLineInRegion(number, current);
			if (isActive) line.dataset.active = category.value ? 'category' : 'root';
			else delete line.dataset.active;
		});
	});

	function dismiss() {
		selection.value = undefined;
	}

	function showAtPointer(event: PointerEvent) {
		const line = isElement(event.target) && event.target.closest<HTMLElement>('[data-region]');
		if (!line) return dismiss();
		const index = Number(line.dataset.region);
		if ($props.lineHints && event.pointerType === 'touch' && selection.value?.index === index) return dismiss();
		selection.value = { index, x: event.clientX, y: event.clientY };
	}

	function onPointerMove(event: PointerEvent) {
		if (event.pointerType !== 'touch') showAtPointer(event);
	}

	function onPointerLeave(event: PointerEvent) {
		if (event.pointerType !== 'touch') dismiss();
	}

	function showAtFocusedLine(line: HTMLElement) {
		const bounds = line.getBoundingClientRect();
		selection.value = { index: Number(line.dataset.region), x: bounds.left, y: bounds.bottom, focusedLine: line };
	}

	function onFocus(event: FocusEvent) {
		const line = event.target;
		if (line instanceof HTMLElement && line.matches('[data-region]:focus-visible')) showAtFocusedLine(line);
	}

	function onViewportChange() {
		const line = selection.value?.focusedLine;
		if (line) {
			const bounds = line.getBoundingClientRect();
			if (bounds.bottom > 0 && bounds.top < window.innerHeight) return showAtFocusedLine(line);
		}
		dismiss();
	}

	watchPostEffect(() => {
		const panel = caption.value;
		const point = selection.value;
		if (!panel || !point) return;

		const { width, height } = panel.getBoundingClientRect();
		const gap = 12;
		const edge = 8;
		const maxX = document.documentElement.clientWidth - width - edge;
		const maxY = window.innerHeight - height - edge;
		const x = point.x + gap <= maxX ? point.x + gap : point.x - width - gap;
		const y = point.y + gap <= maxY ? point.y + gap : point.y - height - gap;
		panel.style.transform = `translate(${clamp(x, edge, maxX)}px, ${clamp(y, edge, maxY)}px)`;
	});

	function onOutsidePress(event: PointerEvent) {
		if (isElement(event.target) && !source.value?.contains(event.target)) dismiss();
	}

	function onKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') dismiss();
	}

	onMounted(() => {
		lines = [...source.value!.querySelectorAll<HTMLElement>(':scope pre code > .line')];
		// The innermost annotation handles the pointer. Its ancestors supply the wider highlights.
		for (const [index, region] of $props.regions.entries()) {
			for (const line of lines.slice(region.start - 1, region.end)) {
				line.dataset.region = String(index);
			}
			lines[region.start - 1].tabIndex = 0;
		}
		document.addEventListener('pointerdown', onOutsidePress);
		document.addEventListener('keydown', onKeydown);
		window.addEventListener('scroll', onViewportChange, { capture: true });
		window.addEventListener('resize', onViewportChange);
	});

	onBeforeUnmount(() => {
		document.removeEventListener('pointerdown', onOutsidePress);
		document.removeEventListener('keydown', onKeydown);
		window.removeEventListener('scroll', onViewportChange, { capture: true });
		window.removeEventListener('resize', onViewportChange);
	});
</script>

<style lang="scss" src="./annotated-code.scss"></style>
