<template>
	<div class="rules-list">
		<table>
			<template v-for="category in scopedRulesMeta" :key="category.scope">
				<tr>
					<td colspan="3" class="rules-list__pseudo-header">
						<div class="rules-list__scope-label">
							{{ category.label }}
						</div>
						<div
							class="rules-list__scope-description"
							v-html="category.description"
						></div>
					</td>
				</tr>
				<tr v-for="rule in category.items" :key="rule.name">
					<td class="rules-list__column rules-list__column--name">
						<a :href="rule.vitepressPath">
							<code>{{ rule.name }}</code>
						</a>
					</td>
					<td>{{ rule.description }}</td>
					<td>
						<span v-if="rule.fixable" title="This rule has an auto-fix">🔧</span>
					</td>
				</tr>
			</template>
		</table>
	</div>
</template>

<script setup lang="ts">
	import { scopedRulesMeta } from '#modules/meta';

	defineOptions({ name: 'rules-list' });
</script>

<style lang="scss" src="./rules-list.scss"></style>
