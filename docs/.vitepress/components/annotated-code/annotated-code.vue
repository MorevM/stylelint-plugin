<template>
	<figure class="annotated-code">
		<figcaption ref="caption" class="annotated-code__caption">
			<div class="annotated-code__description" aria-live="polite" aria-atomic="true">
				<span class="annotated-code__label">{{ regions[active].label }}</span>
				<span class="annotated-code__note">{{ regions[active].note }}</span>
			</div>
			<div class="annotated-code__controls">
				<button type="button" aria-label="Previous region" @click="navigate(-1)">‹</button>
				<button type="button" aria-label="Next region" @click="navigate(1)">›</button>
			</div>
		</figcaption>
		<div
			ref="source"
			class="annotated-code__source"
			@pointermove="onPointerMove"
			@click="selectLine"
			@keydown.down.prevent="navigate(1)"
			@keydown.up.prevent="navigate(-1)"
		>
			<slot></slot>
		</div>
	</figure>
</template>

<script setup lang="ts">
	import { onMounted, ref, useTemplateRef } from 'vue';
	import type { CodeRegion } from '../../annotated-scss';

	const $props = defineProps<{ regions: CodeRegion[] }>();
	const caption = useTemplateRef('caption');
	const source = useTemplateRef('source');
	const active = ref(0);
	let lines: HTMLElement[] = [];

	function select(index: number) {
		active.value = index;
		const { start, end } = $props.regions[index];
		lines.forEach((line, i) => line.toggleAttribute('data-active', i + 1 >= start && i + 1 <= end));
	}

	function selectLine(event: Event) {
		if (!(event.target instanceof Element)) return;
		const line = event.target.closest<HTMLElement>('[data-region]');
		if (line && Number(line.dataset.region) !== active.value) select(Number(line.dataset.region));
	}

	function onPointerMove(event: PointerEvent) {
		if (event.pointerType !== 'touch') selectLine(event);
	}

	function navigate(step: number) {
		const index = (active.value + step + $props.regions.length) % $props.regions.length;
		select(index);
		const line = lines[$props.regions[index].start - 1];
		const bounds = line.getBoundingClientRect();
		if (bounds.top < caption.value!.getBoundingClientRect().bottom || bounds.bottom > window.innerHeight) {
			line.scrollIntoView({ block: 'center' });
		}
	}

	onMounted(() => {
		lines = [...source.value!.querySelectorAll<HTMLElement>(':scope pre code > .line')];
		// Inner regions claim their own lines while the parent still highlights its full range.
		for (const [index, region] of $props.regions.entries()) {
			for (const line of lines.slice(region.start - 1, region.end)) {
				line.dataset.region = String(index);
			}
		}
		select(0);
	});
</script>

<style lang="scss" src="./annotated-code.scss"></style>
