export interface ParsedClass {
    className: string;
    property: string;
    value: string;
}

type ParserRule = {
    pattern: RegExp;
    property: string;
    value?: string | ((match: RegExpMatchArray) => string);
};

// Human-readable utility rules. Dynamic rules take everything after their prefix as the CSS value.
const defs: ParserRule[] = [
    { pattern: /^flex$/, property: 'display', value: 'flex' },
    { pattern: /^flex-inline$/, property: 'display', value: 'inline-flex' },
    { pattern: /^block$/, property: 'display', value: 'block' },
    { pattern: /^inline$/, property: 'display', value: 'inline' },
    { pattern: /^inline-block$/, property: 'display', value: 'inline-block' },
    { pattern: /^none$/, property: 'display', value: 'none' },

    { pattern: /^fdirection-row$/, property: 'flex-direction', value: 'row' },
    { pattern: /^fdirection-rowrev$/, property: 'flex-direction', value: 'row-reverse' },
    { pattern: /^fdirection-col$/, property: 'flex-direction', value: 'column' },
    { pattern: /^fdirection-colrev$/, property: 'flex-direction', value: 'column-reverse' },
    { pattern: /^fnowrap$/, property: 'flex-wrap', value: 'nowrap' },
    { pattern: /^fwrap$/, property: 'flex-wrap', value: 'wrap' },
    { pattern: /^fwraprev$/, property: 'flex-wrap', value: 'wrap-reverse' },

    { pattern: /^content-horizontal-start$/, property: 'justify-content', value: 'flex-start' },
    { pattern: /^content-horizontal-center$/, property: 'justify-content', value: 'center' },
    { pattern: /^content-horizontal-end$/, property: 'justify-content', value: 'flex-end' },
    { pattern: /^content-horizontal-between$/, property: 'justify-content', value: 'space-between' },
    { pattern: /^content-horizontal-around$/, property: 'justify-content', value: 'space-around' },
    { pattern: /^content-horizontal-evenly$/, property: 'justify-content', value: 'space-evenly' },

    { pattern: /^items-vertical-start$/, property: 'align-items', value: 'flex-start' },
    { pattern: /^items-vertical-center$/, property: 'align-items', value: 'center' },
    { pattern: /^items-vertical-end$/, property: 'align-items', value: 'flex-end' },
    { pattern: /^items-vertical-stretch$/, property: 'align-items', value: 'stretch' },
    { pattern: /^items-vertical-baseline$/, property: 'align-items', value: 'baseline' },

    { pattern: /^content-vertical-start$/, property: 'align-content', value: 'flex-start' },
    { pattern: /^content-vertical-center$/, property: 'align-content', value: 'center' },
    { pattern: /^content-vertical-end$/, property: 'align-content', value: 'flex-end' },
    { pattern: /^content-vertical-between$/, property: 'align-content', value: 'space-between' },
    { pattern: /^content-vertical-around$/, property: 'align-content', value: 'space-around' },
    { pattern: /^content-vertical-evenly$/, property: 'align-content', value: 'space-evenly' },
    { pattern: /^content-vertical-stretch$/, property: 'align-content', value: 'stretch' },

    { pattern: /^self-vertical-start$/, property: 'align-self', value: 'flex-start' },
    { pattern: /^self-vertical-center$/, property: 'align-self', value: 'center' },
    { pattern: /^self-vertical-end$/, property: 'align-self', value: 'flex-end' },
    { pattern: /^self-vertical-stretch$/, property: 'align-self', value: 'stretch' },
    { pattern: /^self-vertical-baseline$/, property: 'align-self', value: 'baseline' },

    { pattern: /^fgrow-(.+)$/, property: 'flex-grow', value: m => m[1] },
    { pattern: /^fshrink-(.+)$/, property: 'flex-shrink', value: m => m[1] },
    { pattern: /^fbasis-(.+)$/, property: 'flex-basis', value: m => m[1] },
    { pattern: /^flex-(.+)$/, property: 'flex', value: m => m[1] },
    { pattern: /^order-(.+)$/, property: 'order', value: m => m[1] },

    { pattern: /^gap-(.+)$/, property: 'gap', value: m => m[1] },
    { pattern: /^row-gap-(.+)$/, property: 'row-gap', value: m => m[1] },
    { pattern: /^column-gap-(.+)$/, property: 'column-gap', value: m => m[1] },

    { pattern: /^p-static$/, property: 'position', value: 'static' },
    { pattern: /^p-rel$/, property: 'position', value: 'relative' },
    { pattern: /^p-abs$/, property: 'position', value: 'absolute' },
    { pattern: /^p-fix$/, property: 'position', value: 'fixed' },
    { pattern: /^p-sticky$/, property: 'position', value: 'sticky' },
    { pattern: /^(top|right|bottom|left|inset|insetin|inset-block|insetin-start|insetin-end|inset-block-start|inset-block-end)-(.+)$/, property: 'position', value: m => `${m[1]}:${m[2]}` },

    { pattern: /^zindex-(.+)$/, property: 'z-index', value: m => m[1] },

    { pattern: /^marg-(.+)$/, property: 'margin', value: m => m[1] },
    { pattern: /^marg-top-(.+)$/, property: 'margin-top', value: m => m[1] },
    { pattern: /^marg-right-(.+)$/, property: 'margin-right', value: m => m[1] },
    { pattern: /^marg-bottom-(.+)$/, property: 'margin-bottom', value: m => m[1] },
    { pattern: /^marg-left-(.+)$/, property: 'margin-left', value: m => m[1] },
    { pattern: /^marg-in-(.+)$/, property: 'margin-inline', value: m => m[1] },
    { pattern: /^marg-instart-(.+)$/, property: 'margin-inline-start', value: m => m[1] },
    { pattern: /^marg-inend-(.+)$/, property: 'margin-inline-end', value: m => m[1] },
    { pattern: /^marg-block-(.+)$/, property: 'margin-block', value: m => m[1] },
    { pattern: /^marg-block-start-(.+)$/, property: 'margin-block-start', value: m => m[1] },
    { pattern: /^marg-block-end-(.+)$/, property: 'margin-block-end', value: m => m[1] },

    { pattern: /^pad-(.+)$/, property: 'padding', value: m => m[1] },
    { pattern: /^pad-top-(.+)$/, property: 'padding-top', value: m => m[1] },
    { pattern: /^pad-right-(.+)$/, property: 'padding-right', value: m => m[1] },
    { pattern: /^pad-bottom-(.+)$/, property: 'padding-bottom', value: m => m[1] },
    { pattern: /^pad-left-(.+)$/, property: 'padding-left', value: m => m[1] },
    { pattern: /^pad-in-(.+)$/, property: 'padding-inline', value: m => m[1] },
    { pattern: /^pad-in-start-(.+)$/, property: 'padding-inline-start', value: m => m[1] },
    { pattern: /^pad-in-end-(.+)$/, property: 'padding-inline-end', value: m => m[1] },
    { pattern: /^pad-block-(.+)$/, property: 'padding-block', value: m => m[1] },
    { pattern: /^pad-block-start-(.+)$/, property: 'padding-block-start', value: m => m[1] },
    { pattern: /^pad-block-end-(.+)$/, property: 'padding-block-end', value: m => m[1] },

    { pattern: /^width-(.+)$/, property: 'width', value: m => m[1] },
    { pattern: /^min-width-(.+)$/, property: 'min-width', value: m => m[1] },
    { pattern: /^max-width-(.+)$/, property: 'max-width', value: m => m[1] },
    { pattern: /^height-(.+)$/, property: 'height', value: m => m[1] },
    { pattern: /^min-height-(.+)$/, property: 'min-height', value: m => m[1] },
    { pattern: /^max-height-(.+)$/, property: 'max-height', value: m => m[1] },
    { pattern: /^box-border$/, property: 'box-sizing', value: 'border-box' },
    { pattern: /^box-content$/, property: 'box-sizing', value: 'content-box' },

    { pattern: /^overflow-(visible|hidden|clip|scroll|auto)$/, property: 'overflow', value: m => m[1] },
    { pattern: /^overflow-x-(.+)$/, property: 'overflow-x', value: m => m[1] },
    { pattern: /^overflow-y-(.+)$/, property: 'overflow-y', value: m => m[1] },

    { pattern: /^border-top-(.+)$/, property: 'border-top', value: m => m[1] },
    { pattern: /^border-right-(.+)$/, property: 'border-right', value: m => m[1] },
    { pattern: /^border-bottom-(.+)$/, property: 'border-bottom', value: m => m[1] },
    { pattern: /^border-left-(.+)$/, property: 'border-left', value: m => m[1] },
    { pattern: /^border-radius-(.+)$/, property: 'border-radius', value: m => m[1] },
    { pattern: /^border-(.+)$/, property: 'border', value: m => m[1] },

    { pattern: /^background-color-(.+)$/, property: 'background-color', value: m => m[1] },
    { pattern: /^background-(.+)$/, property: 'background', value: m => m[1] },

    { pattern: /^font-size-(.+)$/, property: 'font-size', value: m => m[1] },
    { pattern: /^font-weight-(.+)$/, property: 'font-weight', value: m => m[1] },
    { pattern: /^line-height-(.+)$/, property: 'line-height', value: m => m[1] },
    { pattern: /^letter-spacing-(.+)$/, property: 'letter-spacing', value: m => m[1] },
    { pattern: /^text-align-(.+)$/, property: 'text-align', value: m => m[1] },
    { pattern: /^text-decoration-(.+)$/, property: 'text-decoration', value: m => m[1] },
    { pattern: /^text-transform-(.+)$/, property: 'text-transform', value: m => m[1] },
    { pattern: /^font-family-(.+)$/, property: 'font-family', value: m => m[1] },
    { pattern: /^color-(.+)$/, property: 'color', value: m => m[1] },
    { pattern: /^opacity-(.+)$/, property: 'opacity', value: m => m[1] },
    { pattern: /^cursor-(.+)$/, property: 'cursor', value: m => m[1] }
];

export function parseClass(name: string): ParsedClass | null {
    for (const def of defs) {
        const match = name.match(def.pattern);
        if (!match || def.value === undefined) continue;

        const value = typeof def.value === 'function'
            ? def.value(match)
            : def.value;

        return {
            className: name,
            property: def.property,
            value
        };
    }

    return null;
}

export function parseClasses(names: string[]): ParsedClass[] {
    return names.map(name => {
        const parsed = parseClass(name);
        if (!parsed) throw new Error(`Unknown StratumSS class: ${name}`);
        return parsed;
    });
}
