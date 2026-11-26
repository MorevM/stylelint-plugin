/*!
 * Property relationships derived from Stylelint 17.15.0 (MIT).
 * The MIT License (MIT)
 *
 * Copyright (c) 2015 - present Maxime Thirouin, David Clark & Richard Hallows
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
 * FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
 * COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
 * IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const BORDER_WIDTH_PROPERTIES = ['border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width'];
const BORDER_STYLE_PROPERTIES = ['border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style'];
const BORDER_COLOR_PROPERTIES = ['border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color'];
const BORDER_RADIUS_PROPERTIES = ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'];
const CORNER_SHAPE_PROPERTIES = ['corner-top-left-shape', 'corner-top-right-shape', 'corner-bottom-left-shape', 'corner-bottom-right-shape'];
const MARGIN_PROPERTIES = ['margin-bottom', 'margin-left', 'margin-right', 'margin-top'];
const PADDING_PROPERTIES = ['padding-bottom', 'padding-left', 'padding-right', 'padding-top'];
const INSET_PROPERTIES = ['top', 'bottom', 'left', 'right'];
const SCROLL_MARGIN_PROPERTIES = ['scroll-margin-bottom', 'scroll-margin-left', 'scroll-margin-right', 'scroll-margin-top'];
const SCROLL_PADDING_PROPERTIES = ['scroll-padding-bottom', 'scroll-padding-left', 'scroll-padding-right', 'scroll-padding-top'];

/**
 * Known shorthand effects, including reset-only properties and legacy shorthands.
 * Supplemented with mdn-data 2.34.0 (CC0); source names are retained for recursive expansion.
 */
export const SHORTHAND_PROPERTIES: Readonly<Record<string, readonly string[]>> = {
	'animation': ['animation-name', 'animation-duration', 'animation-timing-function', 'animation-delay', 'animation-iteration-count', 'animation-direction', 'animation-fill-mode', 'animation-play-state', 'animation-composition', 'animation-delay-end', 'animation-trigger', 'animation-timeline', 'animation-range-start', 'animation-range-end'],
	'animation-range': ['animation-range-start', 'animation-range-end'],
	'background': ['background-image', 'background-position', 'background-size', 'background-repeat', 'background-origin', 'background-clip', 'background-attachment', 'background-color'],
	'border': ['border-width', 'border-style', 'border-color', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style', 'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color', 'border-image', 'border-image-outset', 'border-image-repeat', 'border-image-slice', 'border-image-source', 'border-image-width'],
	'border-block': ['border-block-width', 'border-block-style', 'border-block-color'],
	'border-block-color': ['border-block-start-color', 'border-block-end-color'],
	'border-block-end': ['border-block-end-width', 'border-block-end-style', 'border-block-end-color'],
	'border-block-start': ['border-block-start-width', 'border-block-start-style', 'border-block-start-color'],
	'border-block-style': ['border-block-start-style', 'border-block-end-style'],
	'border-block-width': ['border-block-start-width', 'border-block-end-width'],
	'border-bottom': ['border-bottom-width', 'border-bottom-style', 'border-bottom-color'],
	'border-color': BORDER_COLOR_PROPERTIES,
	'border-image': ['border-image-source', 'border-image-slice', 'border-image-width', 'border-image-outset', 'border-image-repeat'],
	'border-inline': ['border-inline-width', 'border-inline-style', 'border-inline-color'],
	'border-inline-color': ['border-inline-start-color', 'border-inline-end-color'],
	'border-inline-end': ['border-inline-end-width', 'border-inline-end-style', 'border-inline-end-color'],
	'border-inline-start': ['border-inline-start-width', 'border-inline-start-style', 'border-inline-start-color'],
	'border-inline-style': ['border-inline-start-style', 'border-inline-end-style'],
	'border-inline-width': ['border-inline-start-width', 'border-inline-end-width'],
	'border-left': ['border-left-width', 'border-left-style', 'border-left-color'],
	'border-radius': BORDER_RADIUS_PROPERTIES,
	'border-right': ['border-right-width', 'border-right-style', 'border-right-color'],
	'border-style': BORDER_STYLE_PROPERTIES,
	'border-top': ['border-top-width', 'border-top-style', 'border-top-color'],
	'border-width': BORDER_WIDTH_PROPERTIES,
	'caret': ['caret-color', 'caret-animation', 'caret-shape'],
	'column-rule': ['column-rule-width', 'column-rule-style', 'column-rule-color'],
	'columns': ['column-width', 'column-count', 'column-height'],
	'contain-intrinsic-size': ['contain-intrinsic-width', 'contain-intrinsic-height'],
	'container': ['container-name', 'container-type'],
	'corner-block-end-shape': ['corner-end-start-shape', 'corner-end-end-shape'],
	'corner-block-start-shape': ['corner-start-start-shape', 'corner-start-end-shape'],
	'corner-bottom-shape': ['corner-bottom-left-shape', 'corner-bottom-right-shape'],
	'corner-inline-end-shape': ['corner-start-end-shape', 'corner-end-end-shape'],
	'corner-inline-start-shape': ['corner-start-start-shape', 'corner-start-end-shape'],
	'corner-left-shape': ['corner-top-left-shape', 'corner-bottom-left-shape'],
	'corner-right-shape': ['corner-top-right-shape', 'corner-bottom-right-shape'],
	'corner-shape': CORNER_SHAPE_PROPERTIES,
	'corner-top-shape': ['corner-top-left-shape', 'corner-top-right-shape'],
	'flex': ['flex-grow', 'flex-shrink', 'flex-basis'],
	'flex-flow': ['flex-direction', 'flex-wrap'],
	'font': ['font-style', 'font-variant', 'font-weight', 'font-stretch', 'font-size', 'line-height', 'font-family', 'font-feature-settings', 'font-kerning', 'font-language-override', 'font-optical-sizing', 'font-size-adjust', 'font-variant-alternates', 'font-variant-caps', 'font-variant-east-asian', 'font-variant-emoji', 'font-variant-ligatures', 'font-variant-numeric', 'font-variant-position', 'font-variation-settings'],
	'font-synthesis': ['font-synthesis-weight', 'font-synthesis-style', 'font-synthesis-small-caps', 'font-synthesis-position'],
	'font-variant': ['font-variant-ligatures', 'font-variant-position', 'font-variant-caps', 'font-variant-numeric', 'font-variant-alternates', 'font-variant-east-asian', 'font-variant-emoji'],
	'gap': ['row-gap', 'column-gap'],
	'white-space': ['white-space-collapse', 'text-wrap-mode', 'white-space-trim'],
	'text-wrap': ['text-wrap-mode', 'text-wrap-style'],
	'grid': ['grid-template-rows', 'grid-template-columns', 'grid-template-areas', 'grid-auto-rows', 'grid-auto-columns', 'grid-auto-flow', 'grid-column-gap', 'grid-row-gap', 'column-gap', 'row-gap'],
	'grid-area': ['grid-row-start', 'grid-column-start', 'grid-row-end', 'grid-column-end'],
	'grid-column': ['grid-column-start', 'grid-column-end'],
	'grid-gap': ['grid-row-gap', 'grid-column-gap'],
	'grid-row': ['grid-row-start', 'grid-row-end'],
	'grid-template': ['grid-template-columns', 'grid-template-rows', 'grid-template-areas'],
	'inset': INSET_PROPERTIES,
	'inset-block': ['inset-block-start', 'inset-block-end'],
	'inset-inline': ['inset-inline-start', 'inset-inline-end'],
	'interest-delay': ['interest-delay-start', 'interest-delay-end'],
	'list-style': ['list-style-type', 'list-style-position', 'list-style-image'],
	'margin': MARGIN_PROPERTIES,
	'margin-block': ['margin-block-start', 'margin-block-end'],
	'margin-inline': ['margin-inline-start', 'margin-inline-end'],
	'marker': ['marker-start', 'marker-mid', 'marker-end'],
	'mask': ['mask-image', 'mask-mode', 'mask-repeat', 'mask-position', 'mask-clip', 'mask-origin', 'mask-size', 'mask-composite', 'mask-border'],
	'mask-border': ['mask-border-mode', 'mask-border-outset', 'mask-border-repeat', 'mask-border-slice', 'mask-border-source', 'mask-border-width'],
	'offset': ['offset-position', 'offset-path', 'offset-distance', 'offset-anchor', 'offset-rotate'],
	'outline': ['outline-width', 'outline-style', 'outline-color'],
	'overflow': ['overflow-x', 'overflow-y'],
	'overscroll-behavior': ['overscroll-behavior-x', 'overscroll-behavior-y'],
	'padding': PADDING_PROPERTIES,
	'padding-block': ['padding-block-start', 'padding-block-end'],
	'padding-inline': ['padding-inline-start', 'padding-inline-end'],
	'page-break-after': ['break-after'],
	'page-break-before': ['break-before'],
	'page-break-inside': ['break-inside'],
	'place-content': ['align-content', 'justify-content'],
	'place-items': ['align-items', 'justify-items'],
	'place-self': ['align-self', 'justify-self'],
	'position-try': ['position-try-fallbacks', 'position-try-order'],
	'scroll-margin': SCROLL_MARGIN_PROPERTIES,
	'scroll-margin-block': ['scroll-margin-block-start', 'scroll-margin-block-end'],
	'scroll-margin-inline': ['scroll-margin-inline-start', 'scroll-margin-inline-end'],
	'scroll-padding': SCROLL_PADDING_PROPERTIES,
	'scroll-padding-block': ['scroll-padding-block-start', 'scroll-padding-block-end'],
	'scroll-padding-inline': ['scroll-padding-inline-start', 'scroll-padding-inline-end'],
	'scroll-timeline': ['scroll-timeline-name', 'scroll-timeline-axis'],
	'stroke': ['stroke-dasharray', 'stroke-dashoffset', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'stroke-opacity', 'stroke-width'],
	'text-decoration': ['text-decoration-color', 'text-decoration-style', 'text-decoration-line', 'text-decoration-thickness'],
	'text-emphasis': ['text-emphasis-style', 'text-emphasis-color'],
	'timeline-trigger': ['timeline-trigger-name', 'timeline-trigger-source', 'timeline-trigger-activation-range', 'timeline-trigger-active-range'],
	'timeline-trigger-activation-range': ['timeline-trigger-activation-range-start', 'timeline-trigger-activation-range-end'],
	'timeline-trigger-active-range': ['timeline-trigger-active-range-start', 'timeline-trigger-active-range-end'],
	'transition': ['transition-delay', 'transition-duration', 'transition-property', 'transition-timing-function', 'transition-behavior'],
	'view-timeline': ['view-timeline-name', 'view-timeline-axis'],
};

/**
 * Physical properties potentially affected by flow-relative declarations.
 * The active writing mode is unknown to the sorter.
 */
export const LOGICAL_PROPERTIES: Readonly<Record<string, readonly string[]>> = {
	'block-size': ['width', 'height'],
	'border-block-end': ['border-left', 'border-right', 'border-top', 'border-bottom'],
	'border-block-end-color': BORDER_COLOR_PROPERTIES,
	'border-block-end-style': BORDER_STYLE_PROPERTIES,
	'border-block-end-width': BORDER_WIDTH_PROPERTIES,
	'border-block-start': ['border-left', 'border-right', 'border-top', 'border-bottom'],
	'border-block-start-color': BORDER_COLOR_PROPERTIES,
	'border-block-start-style': BORDER_STYLE_PROPERTIES,
	'border-block-start-width': BORDER_WIDTH_PROPERTIES,
	'border-end-end-radius': BORDER_RADIUS_PROPERTIES,
	'border-end-start-radius': BORDER_RADIUS_PROPERTIES,
	'border-inline-end': ['border-left', 'border-right', 'border-top', 'border-bottom'],
	'border-inline-end-color': BORDER_COLOR_PROPERTIES,
	'border-inline-end-style': BORDER_STYLE_PROPERTIES,
	'border-inline-end-width': BORDER_WIDTH_PROPERTIES,
	'border-inline-start': ['border-left', 'border-right', 'border-top', 'border-bottom'],
	'border-inline-start-color': BORDER_COLOR_PROPERTIES,
	'border-inline-start-style': BORDER_STYLE_PROPERTIES,
	'border-inline-start-width': BORDER_WIDTH_PROPERTIES,
	'border-start-end-radius': BORDER_RADIUS_PROPERTIES,
	'border-start-start-radius': BORDER_RADIUS_PROPERTIES,
	'contain-intrinsic-block-size': ['contain-intrinsic-width', 'contain-intrinsic-height'],
	'contain-intrinsic-inline-size': ['contain-intrinsic-width', 'contain-intrinsic-height'],
	'corner-end-end-shape': CORNER_SHAPE_PROPERTIES,
	'corner-end-start-shape': CORNER_SHAPE_PROPERTIES,
	'corner-start-end-shape': CORNER_SHAPE_PROPERTIES,
	'corner-start-start-shape': CORNER_SHAPE_PROPERTIES,
	'inline-size': ['width', 'height'],
	'inset-block-end': INSET_PROPERTIES,
	'inset-block-start': INSET_PROPERTIES,
	'inset-inline-end': INSET_PROPERTIES,
	'inset-inline-start': INSET_PROPERTIES,
	'margin-block-end': MARGIN_PROPERTIES,
	'margin-block-start': MARGIN_PROPERTIES,
	'margin-inline-end': MARGIN_PROPERTIES,
	'margin-inline-start': MARGIN_PROPERTIES,
	'max-block-size': ['max-width', 'max-height'],
	'max-inline-size': ['max-width', 'max-height'],
	'min-block-size': ['min-width', 'min-height'],
	'min-inline-size': ['min-width', 'min-height'],
	'overflow-block': ['overflow-x', 'overflow-y'],
	'overflow-inline': ['overflow-x', 'overflow-y'],
	'overscroll-behavior-block': ['overscroll-behavior-x', 'overscroll-behavior-y'],
	'overscroll-behavior-inline': ['overscroll-behavior-x', 'overscroll-behavior-y'],
	'padding-block-end': PADDING_PROPERTIES,
	'padding-block-start': PADDING_PROPERTIES,
	'padding-inline-end': PADDING_PROPERTIES,
	'padding-inline-start': PADDING_PROPERTIES,
	'scroll-margin-block-end': SCROLL_MARGIN_PROPERTIES,
	'scroll-margin-block-start': SCROLL_MARGIN_PROPERTIES,
	'scroll-margin-inline-end': SCROLL_MARGIN_PROPERTIES,
	'scroll-margin-inline-start': SCROLL_MARGIN_PROPERTIES,
	'scroll-padding-block-end': SCROLL_PADDING_PROPERTIES,
	'scroll-padding-block-start': SCROLL_PADDING_PROPERTIES,
	'scroll-padding-inline-end': SCROLL_PADDING_PROPERTIES,
	'scroll-padding-inline-start': SCROLL_PADDING_PROPERTIES,
};
