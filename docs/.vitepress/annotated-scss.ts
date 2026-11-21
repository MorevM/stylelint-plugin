import { parse } from 'postcss-scss';
import type { ChildNode } from 'postcss';
import type { MarkdownRenderer } from 'vitepress';

/**
 * A group of SCSS siblings and the explanation shown for their displayed lines.
 */
export type CodeRegion = {
	/**
	 * First visible line, counting from one.
	 */
	start: number;

	/**
	 * Last visible line, including nested content.
	 */
	end: number;

	/**
	 * Order category or the name of a fixed region such as the Sass preamble.
	 */
	label: string;

	/**
	 * Explanation of the group's position in this example.
	 */
	note: string;
};

/**
 * Renders annotated SCSS fences with VitePress's normal highlighting and copy button.
 * A standalone `// [label] note` describes subsequent siblings up to the next annotation.
 *
 * @param   md   The site's Markdown renderer.
 */
export const annotatedScss = (md: MarkdownRenderer) => {
	const fence = md.renderer.rules.fence!;
	md.renderer.rules.fence = (...args) => {
		const token = args[0][args[1]];
		if (token.info.trim() !== 'scss annotated') return fence(...args);

		const lines = token.content.split('\n');
		const annotationLines = new Set<number>();
		const regions: CodeRegion[] = [];
		const collect = (siblings: ChildNode[]) => {
			let region: CodeRegion | undefined;
			for (const node of siblings) {
				const start = node.source!.start!.line;
				const note = node.type === 'comment' && /^\s*\/\/ \[([^\]]+)\] (.+)$/u.exec(lines[start - 1]);
				if (note) {
					annotationLines.add(start);
					region = { start: 0, end: 0, label: note[1], note: note[2] };
					continue;
				}
				if (region) {
					if (!region.start) {
						region.start = start;
						regions.push(region);
					}
					region.end = node.source!.end!.line;
				}
				if ('nodes' in node && node.nodes) collect(node.nodes);
			}
		};
		collect(parse(token.content).nodes);

		const code: string[] = [];
		const displayLines = [0];
		for (const [index, line] of lines.entries()) {
			if (!annotationLines.has(index + 1)) code.push(line);
			displayLines.push(code.length);
		}
		for (const region of regions) {
			region.start = displayLines[region.start];
			region.end = displayLines[region.end];
		}

		token.info = 'scss';
		token.content = code.join('\n');
		const highlighted = fence(...args);
		if (!regions.length) return highlighted;
		const props = md.utils.escapeHtml(JSON.stringify(regions));
		return `<AnnotatedCode :regions="${props}">${highlighted}</AnnotatedCode>\n`;
	};
};
