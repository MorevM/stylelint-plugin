import type { MarkdownRenderer } from 'vitepress';
import type { CodeRegion } from './annotated-scss';

/**
 * In a `line-hints` fence, `// [!hint]` starts a Markdown note for the next code line.
 * Continue on adjacent `//` lines. An empty `//` separates paragraphs.
 * Highlights and line numbers refer to the visible code.
 *
 * @param   md   The site's Markdown renderer.
 */
export const lineHints = (md: MarkdownRenderer) => {
	const fence = md.renderer.rules.fence!;
	md.renderer.rules.fence = (...args) => {
		const token = args[0][args[1]];
		const info = token.info.replace(/^(\S+)\s+line-hints(?=\s|$)/u, '$1');
		if (info === token.info) return fence(...args);

		const code: string[] = [];
		const regions: CodeRegion[] = [];
		const slots: string[] = [];
		let notes: string[] = [];
		for (const line of token.content.split('\n')) {
			const comment = /^\s*\/\/ ?(?<marker>\[!hint\](?: |$))?(?<text>.*)$/u.exec(line);
			if (comment?.groups && (comment.groups.marker || notes.length)) {
				notes.push(comment.groups.text);
				continue;
			}

			code.push(line);
			if (!notes.length || !line.trim()) continue;
			const content = md.render(notes.join('\n'), { ...args[3] });
			slots.push(`<template #hint-${regions.length}>${content}</template>`);
			regions.push({ start: code.length, end: code.length });
			notes = [];
		}

		token.info = info;
		token.content = code.join('\n');
		const highlighted = fence(...args);
		if (!regions.length) return highlighted;

		// The language block itself must remain the tab panel for VitePress switching and copying.
		const props = md.utils.escapeHtml(JSON.stringify(regions));
		return highlighted.replace(/^<div /u, () => `<AnnotatedCode line-hints :regions="${props}" `)
			.replace(/<\/div>(\s*)$/u, (_, whitespace: string) => `${slots.join('')}</AnnotatedCode>${whitespace}`);
	};
};
