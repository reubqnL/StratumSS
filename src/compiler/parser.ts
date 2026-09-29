/**
 * The StratumSS utility table.
 *
 * Every utility is declared once, as a triple of:
 *
 *   name      the canonical prefix, which is also the CSS property
 *             (`padding` → `.padding-8px { padding: 8px }`)
 *   kind      how the value is validated (see values.ts)
 *   aliases   extra, friendlier spellings for the same declaration
 *             (`items-vertical-center` → `align-items: center`)
 *
 * A class name is resolved by an exact alias lookup first and then by the
 * longest matching prefix, so `padding-inline-start-4px` can never be
 * mistaken for `padding-4px`.
 */

import { editDistance, suggestFrom } from './suggest.js';
import { validateValue, ValueSyntaxError, type ValueKind } from './values.js';

export interface ParsedClass {
    /** The class exactly as it appeared in the source. */
    className: string;
    /** The CSS property to emit. */
    property: string;
    /** The validated CSS value to emit. */
    value: string;
    /** Whether the declaration should be marked `!important`. */
    important: boolean;
    /** Documentation group, used by `stratumss list` and the docs generator. */
    group: string;
    /** Cascade rank; lower ranks are emitted first. */
    rank: number;
    /** Set when the class is an older spelling of a renamed utility. */
    renamedFrom?: string;
}

export interface UtilityDefinition {
    name: string;
    property: string;
    kind: ValueKind;
    group: string;
    values?: readonly string[];
    aliases?: Record<string, string>;
    prefixAliases?: Record<string, string>;
    allowNegative?: boolean;
}

/** Raised when a class name is not a StratumSS utility. */
export class UnknownUtilityError extends Error {
    constructor(
        public readonly className: string,
        public readonly suggestions: string[] = []
    ) {
        super(`Unknown StratumSS class "${className}"`);
        this.name = 'UnknownUtilityError';
    }
}

/** Raised when a class name is a known utility but its value is not valid. */
export class InvalidUtilityValueError extends Error {
    constructor(
        public readonly className: string,
        public readonly detail: string
    ) {
        super(`Invalid value in class "${className}": ${detail}`);
        this.name = 'InvalidUtilityValueError';
    }
}

const FONT_WEIGHTS = ['100', '200', '300', '400', '500', '600', '700', '800', '900',
    'normal', 'bold', 'bolder', 'lighter'] as const;
const BORDER_STYLES = ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double',
    'groove', 'ridge', 'inset', 'outset'] as const;
const OVERFLOW_VALUES = ['visible', 'hidden', 'clip', 'scroll', 'auto'] as const;
const ALIGN_ITEMS_VALUES = ['flex-start', 'flex-end', 'center', 'baseline', 'stretch', 'start', 'end', 'normal'] as const;
const ALIGN_SELF_VALUES = ['auto', ...ALIGN_ITEMS_VALUES] as const;
const OUTLINE_STYLES = ['auto', 'none', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'] as const;

/** The complete utility table, ordered by documentation group. */
export const DEFINITIONS: readonly UtilityDefinition[] = [
    // ── Layout ───────────────────────────────────────────────────────────────
    {
        name: 'display', property: 'display', kind: 'enum', group: 'Layout',
        values: ['block', 'inline', 'inline-block', 'flex', 'inline-flex', 'grid', 'inline-grid',
            'flow-root', 'contents', 'none', 'table', 'table-row', 'table-cell', 'list-item'],
        aliases: {
            block: 'block', inline: 'inline', 'inline-block': 'inline-block', flex: 'flex',
            'inline-flex': 'inline-flex', grid: 'grid', 'inline-grid': 'inline-grid',
            'flow-root': 'flow-root', contents: 'contents', none: 'none'
        }
    },
    {
        name: 'position', property: 'position', kind: 'enum', group: 'Layout',
        values: ['static', 'relative', 'absolute', 'fixed', 'sticky']
    },
    {
        name: 'top', property: 'top', kind: 'length', group: 'Layout', allowNegative: true
    },
    {
        name: 'right', property: 'right', kind: 'length', group: 'Layout', allowNegative: true
    },
    {
        name: 'bottom', property: 'bottom', kind: 'length', group: 'Layout', allowNegative: true
    },
    {
        name: 'left', property: 'left', kind: 'length', group: 'Layout', allowNegative: true
    },
    {
        name: 'inset', property: 'inset', kind: 'length', group: 'Layout', allowNegative: true
    },
    {
        name: 'inset-inline', property: 'inset-inline', kind: 'length', group: 'Layout', allowNegative: true
    },
    {
        name: 'inset-inline-start', property: 'inset-inline-start', kind: 'length', group: 'Layout', allowNegative: true
    },
    {
        name: 'inset-inline-end', property: 'inset-inline-end', kind: 'length', group: 'Layout', allowNegative: true
    },
    {
        name: 'inset-block', property: 'inset-block', kind: 'length', group: 'Layout', allowNegative: true
    },
    {
        name: 'inset-block-start', property: 'inset-block-start', kind: 'length', group: 'Layout', allowNegative: true
    },
    {
        name: 'inset-block-end', property: 'inset-block-end', kind: 'length', group: 'Layout', allowNegative: true
    },
    {
        name: 'z-index', property: 'z-index', kind: 'integer', group: 'Layout', allowNegative: true,
        values: ['auto']
    },
    {
        name: 'overflow', property: 'overflow', kind: 'enum', group: 'Layout', values: OVERFLOW_VALUES
    },
    {
        name: 'overflow-x', property: 'overflow-x', kind: 'enum', group: 'Layout', values: OVERFLOW_VALUES
    },
    {
        name: 'overflow-y', property: 'overflow-y', kind: 'enum', group: 'Layout', values: OVERFLOW_VALUES
    },
    {
        name: 'float', property: 'float', kind: 'enum', group: 'Layout',
        values: ['left', 'right', 'none', 'inline-start', 'inline-end']
    },
    {
        name: 'clear', property: 'clear', kind: 'enum', group: 'Layout',
        values: ['left', 'right', 'both', 'none', 'inline-start', 'inline-end']
    },
    {
        name: 'visibility', property: 'visibility', kind: 'enum', group: 'Layout',
        values: ['visible', 'hidden', 'collapse']
    },
    {
        name: 'isolation', property: 'isolation', kind: 'enum', group: 'Layout', values: ['isolate', 'auto']
    },

    // ── Flexbox and grid ─────────────────────────────────────────────────────
    {
        name: 'flex-direction', property: 'flex-direction', kind: 'enum', group: 'Flexbox and grid',
        values: ['row', 'row-reverse', 'column', 'column-reverse']
    },
    {
        name: 'flex-wrap', property: 'flex-wrap', kind: 'enum', group: 'Flexbox and grid',
        values: ['nowrap', 'wrap', 'wrap-reverse']
    },
    {
        name: 'flex-flow', property: 'flex-flow', kind: 'raw', group: 'Flexbox and grid'
    },
    {
        name: 'flex', property: 'flex', kind: 'number', group: 'Flexbox and grid',
        values: ['auto', 'none', 'initial']
    },
    {
        name: 'flex-grow', property: 'flex-grow', kind: 'number', group: 'Flexbox and grid'
    },
    {
        name: 'flex-shrink', property: 'flex-shrink', kind: 'number', group: 'Flexbox and grid'
    },
    {
        name: 'flex-basis', property: 'flex-basis', kind: 'length', group: 'Flexbox and grid'
    },
    {
        name: 'order', property: 'order', kind: 'integer', group: 'Flexbox and grid',
        allowNegative: true, values: ['first', 'last', 'none']
    },
    {
        name: 'justify-content', property: 'justify-content', kind: 'enum', group: 'Flexbox and grid',
        values: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly',
            'start', 'end', 'stretch', 'normal'],
        aliases: {
            'content-horizontal-start': 'flex-start',
            'content-horizontal-end': 'flex-end',
            'content-horizontal-center': 'center',
            'content-horizontal-between': 'space-between',
            'content-horizontal-around': 'space-around',
            'content-horizontal-evenly': 'space-evenly',
            'content-horizontal-stretch': 'stretch'
        }
    },
    {
        name: 'justify-items', property: 'justify-items', kind: 'enum', group: 'Flexbox and grid',
        values: ['start', 'end', 'center', 'stretch', 'normal'],
        aliases: {
            'items-horizontal-start': 'start',
            'items-horizontal-end': 'end',
            'items-horizontal-center': 'center',
            'items-horizontal-stretch': 'stretch'
        }
    },
    {
        name: 'justify-self', property: 'justify-self', kind: 'enum', group: 'Flexbox and grid',
        values: ['auto', 'start', 'end', 'center', 'stretch'],
        aliases: {
            'self-horizontal-auto': 'auto',
            'self-horizontal-start': 'start',
            'self-horizontal-end': 'end',
            'self-horizontal-center': 'center',
            'self-horizontal-stretch': 'stretch'
        }
    },
    {
        name: 'align-items', property: 'align-items', kind: 'enum', group: 'Flexbox and grid',
        values: ALIGN_ITEMS_VALUES,
        aliases: {
            'items-vertical-start': 'flex-start',
            'items-vertical-end': 'flex-end',
            'items-vertical-center': 'center',
            'items-vertical-baseline': 'baseline',
            'items-vertical-stretch': 'stretch'
        }
    },
    {
        name: 'align-content', property: 'align-content', kind: 'enum', group: 'Flexbox and grid',
        values: ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly',
            'stretch', 'start', 'end', 'normal'],
        aliases: {
            'content-vertical-start': 'flex-start',
            'content-vertical-end': 'flex-end',
            'content-vertical-center': 'center',
            'content-vertical-between': 'space-between',
            'content-vertical-around': 'space-around',
            'content-vertical-evenly': 'space-evenly',
            'content-vertical-stretch': 'stretch'
        }
    },
    {
        name: 'align-self', property: 'align-self', kind: 'enum', group: 'Flexbox and grid',
        values: ALIGN_SELF_VALUES,
        aliases: {
            'self-vertical-auto': 'auto',
            'self-vertical-start': 'flex-start',
            'self-vertical-end': 'flex-end',
            'self-vertical-center': 'center',
            'self-vertical-baseline': 'baseline',
            'self-vertical-stretch': 'stretch'
        }
    },
    {
        name: 'place-items', property: 'place-items', kind: 'enum', group: 'Flexbox and grid',
        values: ['start', 'end', 'center', 'stretch', 'baseline', 'normal']
    },
    {
        name: 'place-content', property: 'place-content', kind: 'raw', group: 'Flexbox and grid'
    },
    {
        name: 'place-self', property: 'place-self', kind: 'raw', group: 'Flexbox and grid'
    },
    {
        name: 'gap', property: 'gap', kind: 'length', group: 'Flexbox and grid',
        prefixAliases: { 'gap-x-': 'column-gap-', 'gap-y-': 'row-gap-' }
    },
    {
        name: 'row-gap', property: 'row-gap', kind: 'length', group: 'Flexbox and grid'
    },
    {
        name: 'column-gap', property: 'column-gap', kind: 'length', group: 'Flexbox and grid'
    },
    {
        name: 'grid-template-columns', property: 'grid-template-columns', kind: 'raw', group: 'Flexbox and grid'
    },
    {
        name: 'grid-template-rows', property: 'grid-template-rows', kind: 'raw', group: 'Flexbox and grid'
    },
    {
        name: 'grid-auto-columns', property: 'grid-auto-columns', kind: 'raw', group: 'Flexbox and grid'
    },
    {
        name: 'grid-auto-rows', property: 'grid-auto-rows', kind: 'raw', group: 'Flexbox and grid'
    },
    {
        name: 'grid-auto-flow', property: 'grid-auto-flow', kind: 'enum', group: 'Flexbox and grid',
        values: ['row', 'column', 'dense'],
        // `row dense` and `column dense` are two keywords, not hyphenated.
        aliases: {
            'grid-auto-flow-row-dense': 'row dense',
            'grid-auto-flow-column-dense': 'column dense'
        }
    },
    {
        name: 'grid-column', property: 'grid-column', kind: 'raw', group: 'Flexbox and grid'
    },
    {
        name: 'grid-row', property: 'grid-row', kind: 'raw', group: 'Flexbox and grid'
    },

    // ── Sizing ───────────────────────────────────────────────────────────────
    { name: 'width', property: 'width', kind: 'length', group: 'Sizing' },
    { name: 'min-width', property: 'min-width', kind: 'length', group: 'Sizing' },
    { name: 'max-width', property: 'max-width', kind: 'length', group: 'Sizing' },
    { name: 'height', property: 'height', kind: 'length', group: 'Sizing' },
    { name: 'min-height', property: 'min-height', kind: 'length', group: 'Sizing' },
    { name: 'max-height', property: 'max-height', kind: 'length', group: 'Sizing' },
    { name: 'aspect-ratio', property: 'aspect-ratio', kind: 'raw', group: 'Sizing' },
    {
        name: 'box-sizing', property: 'box-sizing', kind: 'enum', group: 'Sizing',
        values: ['border-box', 'content-box'],
        aliases: { 'box-border': 'border-box', 'box-content': 'content-box' }
    },
    {
        name: 'object-fit', property: 'object-fit', kind: 'enum', group: 'Sizing',
        values: ['contain', 'cover', 'fill', 'none', 'scale-down']
    },
    { name: 'object-position', property: 'object-position', kind: 'raw', group: 'Sizing' },

    // ── Spacing ──────────────────────────────────────────────────────────────
    {
        name: 'margin', property: 'margin', kind: 'length', group: 'Spacing', allowNegative: true,
        prefixAliases: { 'margin-x-': 'margin-inline-', 'margin-y-': 'margin-block-' }
    },
    { name: 'margin-top', property: 'margin-top', kind: 'length', group: 'Spacing', allowNegative: true },
    { name: 'margin-right', property: 'margin-right', kind: 'length', group: 'Spacing', allowNegative: true },
    { name: 'margin-bottom', property: 'margin-bottom', kind: 'length', group: 'Spacing', allowNegative: true },
    { name: 'margin-left', property: 'margin-left', kind: 'length', group: 'Spacing', allowNegative: true },
    { name: 'margin-inline', property: 'margin-inline', kind: 'length', group: 'Spacing', allowNegative: true },
    { name: 'margin-inline-start', property: 'margin-inline-start', kind: 'length', group: 'Spacing', allowNegative: true },
    { name: 'margin-inline-end', property: 'margin-inline-end', kind: 'length', group: 'Spacing', allowNegative: true },
    { name: 'margin-block', property: 'margin-block', kind: 'length', group: 'Spacing', allowNegative: true },
    { name: 'margin-block-start', property: 'margin-block-start', kind: 'length', group: 'Spacing', allowNegative: true },
    { name: 'margin-block-end', property: 'margin-block-end', kind: 'length', group: 'Spacing', allowNegative: true },

    {
        name: 'padding', property: 'padding', kind: 'length', group: 'Spacing',
        prefixAliases: { 'padding-x-': 'padding-inline-', 'padding-y-': 'padding-block-' }
    },
    { name: 'padding-top', property: 'padding-top', kind: 'length', group: 'Spacing' },
    { name: 'padding-right', property: 'padding-right', kind: 'length', group: 'Spacing' },
    { name: 'padding-bottom', property: 'padding-bottom', kind: 'length', group: 'Spacing' },
    { name: 'padding-left', property: 'padding-left', kind: 'length', group: 'Spacing' },
    { name: 'padding-inline', property: 'padding-inline', kind: 'length', group: 'Spacing' },
    { name: 'padding-inline-start', property: 'padding-inline-start', kind: 'length', group: 'Spacing' },
    { name: 'padding-inline-end', property: 'padding-inline-end', kind: 'length', group: 'Spacing' },
    { name: 'padding-block', property: 'padding-block', kind: 'length', group: 'Spacing' },
    { name: 'padding-block-start', property: 'padding-block-start', kind: 'length', group: 'Spacing' },
    { name: 'padding-block-end', property: 'padding-block-end', kind: 'length', group: 'Spacing' },

    // ── Typography ───────────────────────────────────────────────────────────
    { name: 'font-family', property: 'font-family', kind: 'raw', group: 'Typography' },
    { name: 'font-size', property: 'font-size', kind: 'length', group: 'Typography' },
    {
        name: 'font-style', property: 'font-style', kind: 'enum', group: 'Typography',
        values: ['normal', 'italic', 'oblique']
    },
    {
        name: 'font-weight', property: 'font-weight', kind: 'enum', group: 'Typography',
        values: FONT_WEIGHTS
    },
    {
        name: 'font-variant-numeric', property: 'font-variant-numeric', kind: 'enum', group: 'Typography',
        values: ['normal', 'ordinal', 'slashed-zero', 'lining-nums', 'oldstyle-nums', 'proportional-nums',
            'tabular-nums', 'diagonal-fractions', 'stacked-fractions']
    },
    { name: 'line-height', property: 'line-height', kind: 'length', group: 'Typography' },
    { name: 'letter-spacing', property: 'letter-spacing', kind: 'length', group: 'Typography', allowNegative: true },
    { name: 'word-spacing', property: 'word-spacing', kind: 'length', group: 'Typography', allowNegative: true },
    {
        name: 'text-align', property: 'text-align', kind: 'enum', group: 'Typography',
        values: ['left', 'center', 'right', 'justify', 'start', 'end']
    },
    {
        name: 'text-decoration', property: 'text-decoration', kind: 'enum', group: 'Typography',
        values: ['none', 'underline', 'overline', 'line-through', 'blink']
    },
    {
        name: 'text-decoration-style', property: 'text-decoration-style', kind: 'enum', group: 'Typography',
        values: ['solid', 'double', 'dotted', 'dashed', 'wavy']
    },
    { name: 'text-decoration-color', property: 'text-decoration-color', kind: 'color', group: 'Typography' },
    { name: 'text-decoration-thickness', property: 'text-decoration-thickness', kind: 'length', group: 'Typography' },
    {
        name: 'text-transform', property: 'text-transform', kind: 'enum', group: 'Typography',
        values: ['none', 'capitalize', 'uppercase', 'lowercase']
    },
    {
        name: 'text-overflow', property: 'text-overflow', kind: 'enum', group: 'Typography',
        values: ['clip', 'ellipsis']
    },
    { name: 'text-indent', property: 'text-indent', kind: 'length', group: 'Typography', allowNegative: true },
    { name: 'text-shadow', property: 'text-shadow', kind: 'raw', group: 'Typography' },
    {
        name: 'white-space', property: 'white-space', kind: 'enum', group: 'Typography',
        values: ['normal', 'nowrap', 'pre', 'pre-wrap', 'pre-line', 'break-spaces']
    },
    {
        name: 'word-break', property: 'word-break', kind: 'enum', group: 'Typography',
        values: ['normal', 'break-all', 'keep-all', 'break-word']
    },
    {
        name: 'overflow-wrap', property: 'overflow-wrap', kind: 'enum', group: 'Typography',
        values: ['normal', 'break-word', 'anywhere']
    },
    {
        name: 'vertical-align', property: 'vertical-align', kind: 'enum', group: 'Typography',
        values: ['baseline', 'top', 'middle', 'bottom', 'text-top', 'text-bottom', 'sub', 'super']
    },
    { name: 'list-style-type', property: 'list-style-type', kind: 'keyword', group: 'Typography' },
    {
        name: 'list-style-position', property: 'list-style-position', kind: 'enum', group: 'Typography',
        values: ['inside', 'outside']
    },
    { name: 'list-style', property: 'list-style', kind: 'raw', group: 'Typography' },
    { name: 'hyphens', property: 'hyphens', kind: 'enum', group: 'Typography', values: ['none', 'manual', 'auto'] },

    // ── Colour and background ────────────────────────────────────────────────
    { name: 'color', property: 'color', kind: 'color', group: 'Colour and background' },
    { name: 'accent-color', property: 'accent-color', kind: 'color', group: 'Colour and background' },
    { name: 'caret-color', property: 'caret-color', kind: 'color', group: 'Colour and background' },
    { name: 'background', property: 'background', kind: 'raw', group: 'Colour and background' },
    { name: 'background-color', property: 'background-color', kind: 'color', group: 'Colour and background' },
    { name: 'background-image', property: 'background-image', kind: 'raw', group: 'Colour and background' },
    { name: 'background-position', property: 'background-position', kind: 'raw', group: 'Colour and background' },
    { name: 'background-size', property: 'background-size', kind: 'raw', group: 'Colour and background' },
    {
        name: 'background-repeat', property: 'background-repeat', kind: 'enum', group: 'Colour and background',
        values: ['repeat', 'no-repeat', 'repeat-x', 'repeat-y', 'round', 'space']
    },
    {
        name: 'background-attachment', property: 'background-attachment', kind: 'enum',
        group: 'Colour and background', values: ['fixed', 'local', 'scroll']
    },
    {
        name: 'background-clip', property: 'background-clip', kind: 'enum', group: 'Colour and background',
        values: ['border-box', 'padding-box', 'content-box', 'text']
    },
    {
        name: 'background-origin', property: 'background-origin', kind: 'enum', group: 'Colour and background',
        values: ['border-box', 'padding-box', 'content-box']
    },
    {
        name: 'opacity', property: 'opacity', kind: 'number', group: 'Colour and background'
    },
    {
        name: 'mix-blend-mode', property: 'mix-blend-mode', kind: 'enum', group: 'Colour and background',
        values: ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn',
            'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity',
            'plus-lighter']
    },

    // ── Borders ──────────────────────────────────────────────────────────────
    { name: 'border', property: 'border', kind: 'raw', group: 'Borders' },
    { name: 'border-top', property: 'border-top', kind: 'raw', group: 'Borders' },
    { name: 'border-right', property: 'border-right', kind: 'raw', group: 'Borders' },
    { name: 'border-bottom', property: 'border-bottom', kind: 'raw', group: 'Borders' },
    { name: 'border-left', property: 'border-left', kind: 'raw', group: 'Borders' },
    { name: 'border-width', property: 'border-width', kind: 'length', group: 'Borders' },
    { name: 'border-top-width', property: 'border-top-width', kind: 'length', group: 'Borders' },
    { name: 'border-right-width', property: 'border-right-width', kind: 'length', group: 'Borders' },
    { name: 'border-bottom-width', property: 'border-bottom-width', kind: 'length', group: 'Borders' },
    { name: 'border-left-width', property: 'border-left-width', kind: 'length', group: 'Borders' },
    { name: 'border-color', property: 'border-color', kind: 'color', group: 'Borders' },
    { name: 'border-top-color', property: 'border-top-color', kind: 'color', group: 'Borders' },
    { name: 'border-right-color', property: 'border-right-color', kind: 'color', group: 'Borders' },
    { name: 'border-bottom-color', property: 'border-bottom-color', kind: 'color', group: 'Borders' },
    { name: 'border-left-color', property: 'border-left-color', kind: 'color', group: 'Borders' },
    { name: 'border-style', property: 'border-style', kind: 'enum', group: 'Borders', values: BORDER_STYLES },
    { name: 'border-top-style', property: 'border-top-style', kind: 'enum', group: 'Borders', values: BORDER_STYLES },
    { name: 'border-right-style', property: 'border-right-style', kind: 'enum', group: 'Borders', values: BORDER_STYLES },
    { name: 'border-bottom-style', property: 'border-bottom-style', kind: 'enum', group: 'Borders', values: BORDER_STYLES },
    { name: 'border-left-style', property: 'border-left-style', kind: 'enum', group: 'Borders', values: BORDER_STYLES },
    {
        name: 'border-radius', property: 'border-radius', kind: 'length', group: 'Borders',
        prefixAliases: {
            'border-radius-top-left-': 'border-top-left-radius-',
            'border-radius-top-right-': 'border-top-right-radius-',
            'border-radius-bottom-right-': 'border-bottom-right-radius-',
            'border-radius-bottom-left-': 'border-bottom-left-radius-'
        }
    },
    { name: 'border-top-left-radius', property: 'border-top-left-radius', kind: 'length', group: 'Borders' },
    { name: 'border-top-right-radius', property: 'border-top-right-radius', kind: 'length', group: 'Borders' },
    { name: 'border-bottom-right-radius', property: 'border-bottom-right-radius', kind: 'length', group: 'Borders' },
    { name: 'border-bottom-left-radius', property: 'border-bottom-left-radius', kind: 'length', group: 'Borders' },
    { name: 'outline', property: 'outline', kind: 'raw', group: 'Borders' },
    { name: 'outline-width', property: 'outline-width', kind: 'length', group: 'Borders' },
    { name: 'outline-color', property: 'outline-color', kind: 'color', group: 'Borders' },
    { name: 'outline-style', property: 'outline-style', kind: 'enum', group: 'Borders', values: OUTLINE_STYLES },
    { name: 'outline-offset', property: 'outline-offset', kind: 'length', group: 'Borders', allowNegative: true },

    // ── Effects ──────────────────────────────────────────────────────────────
    { name: 'box-shadow', property: 'box-shadow', kind: 'raw', group: 'Effects' },
    { name: 'filter', property: 'filter', kind: 'raw', group: 'Effects' },
    { name: 'backdrop-filter', property: 'backdrop-filter', kind: 'raw', group: 'Effects' },
    { name: 'transform', property: 'transform', kind: 'raw', group: 'Effects' },
    { name: 'transform-origin', property: 'transform-origin', kind: 'raw', group: 'Effects' },
    {
        name: 'transform-style', property: 'transform-style', kind: 'enum', group: 'Effects',
        values: ['flat', 'preserve-3d']
    },
    {
        name: 'backface-visibility', property: 'backface-visibility', kind: 'enum', group: 'Effects',
        values: ['visible', 'hidden']
    },
    { name: 'perspective', property: 'perspective', kind: 'length', group: 'Effects' },
    { name: 'perspective-origin', property: 'perspective-origin', kind: 'raw', group: 'Effects' },
    { name: 'transition', property: 'transition', kind: 'raw', group: 'Effects' },
    { name: 'transition-property', property: 'transition-property', kind: 'raw', group: 'Effects' },
    { name: 'transition-duration', property: 'transition-duration', kind: 'time', group: 'Effects' },
    { name: 'transition-delay', property: 'transition-delay', kind: 'time', group: 'Effects' },
    { name: 'transition-timing-function', property: 'transition-timing-function', kind: 'raw', group: 'Effects' },
    { name: 'animation', property: 'animation', kind: 'raw', group: 'Effects' },
    { name: 'will-change', property: 'will-change', kind: 'raw', group: 'Effects' },

    // ── Interaction ──────────────────────────────────────────────────────────
    { name: 'cursor', property: 'cursor', kind: 'keyword', group: 'Interaction' },
    {
        name: 'pointer-events', property: 'pointer-events', kind: 'enum', group: 'Interaction',
        values: ['auto', 'none']
    },
    {
        name: 'user-select', property: 'user-select', kind: 'enum', group: 'Interaction',
        values: ['none', 'text', 'all', 'auto', 'contain']
    },
    {
        name: 'resize', property: 'resize', kind: 'enum', group: 'Interaction',
        values: ['none', 'both', 'horizontal', 'vertical', 'block', 'inline']
    },
    {
        name: 'appearance', property: 'appearance', kind: 'enum', group: 'Interaction',
        values: ['none', 'auto']
    },
    {
        name: 'scroll-behavior', property: 'scroll-behavior', kind: 'enum', group: 'Interaction',
        values: ['auto', 'smooth']
    },
    {
        name: 'scroll-snap-type', property: 'scroll-snap-type', kind: 'raw', group: 'Interaction'
    },
    {
        name: 'touch-action', property: 'touch-action', kind: 'enum', group: 'Interaction',
        values: ['auto', 'none', 'pan-x', 'pan-y', 'pan-left', 'pan-right', 'pan-up', 'pan-down',
            'manipulation', 'pinch-zoom']
    }
];

/** Cascade rank per property. Lower ranks are emitted first so that more specific
 *  utilities (longhands, `max-*`, `min-*`) always win over broader ones. */
function rankOf(property: string): number {
    if (/^(box-sizing|display|position|top|right|bottom|left|inset|z-index|float|clear|visibility|isolation|overflow)/.test(property)) return 0;
    if (/^(flex|order|justify|align|place|grid|gap|row-gap|column-gap)/.test(property)) return 1;
    if (/^(width|height|min-width|max-width|min-height|max-height|aspect-ratio|object)/.test(property)) return 2;
    if (/^(margin|padding)/.test(property)) return 3;
    if (/^(border|outline)/.test(property)) return 4;
    if (/^(color|background|accent|caret|opacity|mix-blend)/.test(property)) return 5;
    if (/^(font|line-height|letter-spacing|word-spacing|text|white-space|word-break|overflow-wrap|vertical-align|list-style|hyphens)/.test(property)) return 6;
    if (/^(box-shadow|filter|backdrop|transform|perspective|transition|animation|will-change)/.test(property)) return 7;
    return 8;
}

interface ResolvedUtility {
    definition: UtilityDefinition;
    /** Set for exact matches: the value the class name implies. */
    value?: string;
    /**
     * Exact matches carry a value that was written out in the table, so it is
     * already known to be valid — `flex-auto` must not be re-validated as a
     * number. Only prefix-derived values are validated.
     */
    literal?: boolean;
}

/** Exact class name → resolved declaration. */
const exactIndex = new Map<string, ResolvedUtility>();
/** Dynamic `prefix-` → definition, longest prefix first. */
const prefixIndex: Array<{ prefix: string; entry: ResolvedUtility }> = [];
/** Prefix rewrites applied before lookup, longest prefix first. */
const prefixAliases: Array<{ from: string; to: string }> = [];

for (const definition of DEFINITIONS) {
    const base: ResolvedUtility = { definition };

    if (definition.kind === 'enum') {
        for (const value of definition.values ?? []) {
            exactIndex.set(`${definition.name}-${value}`, { ...base, value, literal: true });
        }
    }

    // Non-enum utilities also accept their named keywords (`z-index-auto`).
    if (definition.values !== undefined && definition.kind !== 'enum') {
        for (const value of definition.values) {
            exactIndex.set(`${definition.name}-${value}`, { ...base, value, literal: true });
        }
    }

    for (const [className, value] of Object.entries(definition.aliases ?? {})) {
        exactIndex.set(className, { ...base, value, literal: true });
    }

    for (const [from, to] of Object.entries(definition.prefixAliases ?? {})) {
        prefixAliases.push({ from, to });
    }

    // Registered for every utility so that a bad *value* is reported as such
    // (`display-flerp` → invalid value) rather than as an unknown class.
    prefixIndex.push({ prefix: `${definition.name}-`, entry: base });
}

prefixIndex.sort((a, b) => b.prefix.length - a.prefix.length);
prefixAliases.sort((a, b) => b.from.length - a.from.length);

/** Every class name the framework recognises, including dynamic prefixes. */
export function listUtilityNames(): string[] {
    const names: string[] = [];

    for (const definition of DEFINITIONS) {
        if (definition.kind === 'enum') {
            for (const value of definition.values ?? []) {
                names.push(`${definition.name}-${value}`);
            }
        } else {
            names.push(`${definition.name}-<${definition.kind}>`);
        }

        if (definition.values !== undefined && definition.kind !== 'enum') {
            for (const value of definition.values) {
                names.push(`${definition.name}-${value}`);
            }
        }

        names.push(...Object.keys(definition.aliases ?? {}));
    }

    return names.sort();
}

/** Every concrete class name (aliases and enum values expanded), for `--list`. */
export function listUtilityClasses(): Array<{ className: string; property: string; group: string }> {
    const entries: Array<{ className: string; property: string; group: string }> = [];

    for (const definition of DEFINITIONS) {
        if (definition.kind === 'enum') {
            for (const value of definition.values ?? []) {
                entries.push({
                    className: `${definition.name}-${value}`,
                    property: definition.property,
                    group: definition.group
                });
            }
        } else {
            entries.push({
                className: `${definition.name}-<${definition.kind}>`,
                property: definition.property,
                group: definition.group
            });
        }

        if (definition.values !== undefined && definition.kind !== 'enum') {
            for (const value of definition.values) {
                entries.push({
                    className: `${definition.name}-${value}`,
                    property: definition.property,
                    group: definition.group
                });
            }
        }

        for (const className of Object.keys(definition.aliases ?? {})) {
            entries.push({
                className,
                property: definition.property,
                group: definition.group
            });
        }
    }

    return entries.sort((a, b) => a.className.localeCompare(b.className));
}

/** Ranks known class names by similarity to `className`, for error messages. */
export function suggestUtilityNames(className: string, limit = 3): string[] {
    const candidates = listUtilityNames().filter(name => !name.includes('<'));

    // Keep the value the user typed but fix the utility name: `paddign-4px`
    // should suggest `padding-4px` rather than `padding-<length>`.
    const separator = className.indexOf('-');
    const tail = separator === -1 ? '' : className.slice(separator + 1);
    if (tail !== '') {
        for (const definition of DEFINITIONS) {
            if (definition.kind !== 'enum') {
                candidates.push(`${definition.name}-${tail}`);
            }
        }
    }

    return suggestFrom(candidates, className, limit);
}

/**
 * Classes that were renamed before 1.1.0, mapped to their new spelling.
 * A renamed class is reported as unknown *with the new name as a suggestion*,
 * which turns a confusing failure into a one-line fix.
 */
const RENAMED_NAMES: Record<string, string> = {
    'flex-inline': 'inline-flex',
    'fdirection-row': 'flex-direction-row',
    'fdirection-rowrev': 'flex-direction-row-reverse',
    'fdirection-col': 'flex-direction-column',
    'fdirection-colrev': 'flex-direction-column-reverse',
    'fwrap': 'flex-wrap-wrap',
    'fnowrap': 'flex-wrap-nowrap',
    'fwraprev': 'flex-wrap-wrap-reverse',
    'p-static': 'position-static',
    'p-rel': 'position-relative',
    'p-abs': 'position-absolute',
    'p-fix': 'position-fixed',
    'p-sticky': 'position-sticky'
};

const RENAMED_PREFIXES: Record<string, string> = {
    'marg-instart-': 'margin-inline-start-',
    'marg-inend-': 'margin-inline-end-',
    'marg-block-start-': 'margin-block-start-',
    'marg-block-end-': 'margin-block-end-',
    'marg-in-': 'margin-inline-',
    'marg-block-': 'margin-block-',
    'marg-top-': 'margin-top-',
    'marg-right-': 'margin-right-',
    'marg-bottom-': 'margin-bottom-',
    'marg-left-': 'margin-left-',
    'marg-': 'margin-',
    'pad-in-start-': 'padding-inline-start-',
    'pad-in-end-': 'padding-inline-end-',
    'pad-in-': 'padding-inline-',
    'pad-block-start-': 'padding-block-start-',
    'pad-block-end-': 'padding-block-end-',
    'pad-block-': 'padding-block-',
    'pad-top-': 'padding-top-',
    'pad-right-': 'padding-right-',
    'pad-bottom-': 'padding-bottom-',
    'pad-left-': 'padding-left-',
    'pad-': 'padding-',
    'fdirection-': 'flex-direction-',
    'fgrow-': 'flex-grow-',
    'fshrink-': 'flex-shrink-',
    'fbasis-': 'flex-basis-',
    'zindex-': 'z-index-',
    'insetin-start-': 'inset-inline-start-',
    'insetin-end-': 'inset-inline-end-',
    'insetin-': 'inset-inline-'
};

/** The new spelling of a pre-1.1 class name, or `undefined` if it was not renamed. */
export function renameHint(className: string): string | undefined {
    const exact = RENAMED_NAMES[className];
    if (exact !== undefined) return exact;

    const prefixes = Object.keys(RENAMED_PREFIXES).sort((a, b) => b.length - a.length);
    for (const prefix of prefixes) {
        if (className.startsWith(prefix)) {
            return RENAMED_PREFIXES[prefix] + className.slice(prefix.length);
        }
    }

    return undefined;
}

interface UtilityMatch {
    entry: ResolvedUtility;
    rawValue: string;
}

type MatchResult =
    | { kind: 'match'; match: UtilityMatch }
    | { kind: 'near-miss'; suggestion: string }
    | { kind: 'missing-value' };

/** Closest declared value to `rawValue`, when it is a plausible typo (≤ 2 edits). */
function closestEnumValue(values: readonly string[], rawValue: string): string | undefined {
    let best: { value: string; distance: number } | undefined;

    for (const value of values) {
        const distance = editDistance(rawValue.toLowerCase(), value.toLowerCase());
        if (distance > 2) continue;
        if (best === undefined || distance < best.distance) {
            best = { value, distance };
        }
    }

    return best?.value;
}

/**
 * Resolves a class name to a utility and its raw value, without validating.
 *
 * Never throws: a name that is not recognised is reported as `undefined`, and a
 * value that is a plausible typo of an enumerated value is reported as a
 * near-miss so the caller can produce a precise message.
 */
function matchUtility(className: string): MatchResult | undefined {
    const exact = exactIndex.get(className);
    if (exact !== undefined) {
        return { kind: 'match', match: { entry: exact, rawValue: exact.value! } };
    }

    const rewritten = applyPrefixAliases(className);
    if (rewritten !== className) {
        const aliased = exactIndex.get(rewritten);
        if (aliased !== undefined) {
            return { kind: 'match', match: { entry: aliased, rawValue: aliased.value! } };
        }
    }

    let nearMiss: { suggestion: string; distance: number } | undefined;

    for (const { prefix, entry } of prefixIndex) {
        if (!rewritten.startsWith(prefix)) continue;

        const rawValue = rewritten.slice(prefix.length);
        // A trailing dash means the author forgot the value: `padding-`.
        if (rawValue === '') return { kind: 'missing-value' };

        // An enum prefix must not swallow an unrelated class name: `flex-inline`
        // should be "unknown class", while `display-fle` is a value typo. The
        // remaining prefixes are shorter and less specific, so stop here rather
        // than letting `flex-` claim `flex-direction-col`.
        if (entry.definition.kind === 'enum' &&
            !(entry.definition.values ?? []).includes(rawValue)) {
            const close = closestEnumValue(entry.definition.values ?? [], rawValue);
            if (close === undefined) break;

            nearMiss = {
                suggestion: `${entry.definition.name}-${close}`,
                distance: editDistance(rawValue.toLowerCase(), close.toLowerCase())
            };
            break;
        }

        return { kind: 'match', match: { entry, rawValue } };
    }

    return nearMiss === undefined ? undefined : { kind: 'near-miss', suggestion: nearMiss.suggestion };
}

function applyPrefixAliases(className: string): string {
    for (const alias of prefixAliases) {
        if (className.startsWith(alias.from)) {
            return alias.to + className.slice(alias.from.length);
        }
    }
    return className;
}

function buildValue(
    match: UtilityMatch,
    className: string,
    important: boolean,
    renamedFrom?: string
): ParsedClass {
    const { definition } = match.entry;

    if (match.entry.literal === true) {
        return {
            className,
            property: definition.property,
            value: important ? `${match.rawValue} !important` : match.rawValue,
            important,
            group: definition.group,
            rank: rankOf(definition.property),
            ...(renamedFrom === undefined ? {} : { renamedFrom })
        };
    }

    let value = match.rawValue;
    if (value.startsWith('neg-')) {
        value = `-${value.slice(4)}`;
    }

    if (value.startsWith('-') && definition.allowNegative !== true) {
        throw new InvalidUtilityValueError(className, 'negative values are not supported for this utility');
    }

    try {
        const validated = validateValue(definition.kind, value, definition.values);
        return {
            className,
            property: definition.property,
            value: important ? `${validated.value} !important` : validated.value,
            important,
            group: definition.group,
            rank: rankOf(definition.property),
            ...(renamedFrom === undefined ? {} : { renamedFrom })
        };
    } catch (error) {
        if (error instanceof ValueSyntaxError) {
            throw new InvalidUtilityValueError(className, error.message);
        }
        throw error;
    }
}

/**
 * Parses a single class name.
 *
 * @throws {UnknownUtilityError} when the class is not part of the framework.
 * @throws {InvalidUtilityValueError} when the value part of the class is invalid.
 */
export function parseClass(name: string): ParsedClass {
    let className = name.trim();
    let important = false;

    if (className.endsWith('!')) {
        important = true;
        className = className.slice(0, -1);
    }

    if (className === '') {
        throw new UnknownUtilityError(name);
    }

    // Old spellings of renamed utilities keep working (the generated selector
    // uses the class name as written), and are reported as a warning so the
    // rename can be adopted gradually. Checked first so that a renamed class is
    // never claimed by an unrelated, broader prefix.
    const renamed = renameHint(className);
    if (renamed !== undefined) {
        const renamedResult = matchUtility(renamed);
        if (renamedResult !== undefined && renamedResult.kind === 'match') {
            return buildValue(renamedResult.match, name, important, className);
        }
    }

    const result = matchUtility(className);

    if (result !== undefined && result.kind === 'match') {
        return buildValue(result.match, name, important);
    }

    if (result !== undefined && result.kind === 'near-miss') {
        throw new InvalidUtilityValueError(name, `did you mean "${result.suggestion}"?`);
    }

    if (result !== undefined && result.kind === 'missing-value') {
        throw new InvalidUtilityValueError(name, 'a value is required, for example "padding-4px"');
    }

    const suggestions = suggestUtilityNames(className);
    if (renamed !== undefined && !suggestions.includes(renamed)) {
        suggestions.unshift(renamed);
    }

    throw new UnknownUtilityError(name, suggestions.slice(0, 2));
}
