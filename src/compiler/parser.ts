// src/compiler/parser.ts

export interface ParsedClass {
    className: string;
    property: string;
    value: string;
}

type ParserRule = {
    pattern: RegExp;
    property: string | ((match: RegExpMatchArray) => string);
    value?: string | ((match: RegExpMatchArray) => string);
};

// regex utils for css classes. keeping it all in one place for now
const defs: ParserRule[] = [
    // ============================================================
    // DISPLAY
    // ============================================================
    {
        pattern: /^flex$/,
        property: 'display',
        value: 'flex'
    },

    {
        pattern: /^flex-inline$/,
        property: 'display',
        value: 'inline-flex'
    },

    {
        pattern: /^block$/,
        property: 'display',
        value: 'block'
    },

    {
        pattern: /^inline$/,
        property: 'display',
        value: 'inline'
    },

    {
        pattern: /^inline-block$/,
        property: 'display',
        value: 'inline-block'
    },

    {
        pattern: /^none$/,
        property: 'display',
        value: 'none'
    },

    // ============================================================
    // FLEX DIRECTION
    // ============================================================
    {
        pattern: /^fdirection-row$/,
        property: 'flex-direction',
        value: 'row'
    },

    {
        pattern: /^fdirection-rowrev$/,
        property: 'flex-direction',
        value: 'row-reverse'
    },

    {
        pattern: /^fdirection-col$/,
        property: 'flex-direction',
        value: 'column'
    },

    {
        pattern: /^fdirection-colrev$/,
        property: 'flex-direction',
        value: 'column-reverse'
    },

    // ============================================================
    // FLEX WRAP
    // ============================================================
    {
        pattern: /^fnowrap$/,
        property: 'flex-wrap',
        value: 'nowrap'
    },

    {
        pattern: /^fwrap$/,
        property: 'flex-wrap',
        value: 'wrap'
    },

    {
        pattern: /^fwraprev$/,
        property: 'flex-wrap',
        value: 'wrap-reverse'
    },

    // ============================================================
    // JUSTIFY CONTENT
    // ============================================================
    {
        pattern: /^content-horizontal-start$/,
        property: 'justify-content',
        value: 'flex-start'
    },

    {
        pattern: /^content-horizontal-center$/,
        property: 'justify-content',
        value: 'center'
    },

    {
        pattern: /^content-horizontal-end$/,
        property: 'justify-content',
        value: 'flex-end'
    },

    {
        pattern: /^content-horizontal-between$/,
        property: 'justify-content',
        value: 'space-between'
    },

    {
        pattern: /^content-horizontal-around$/,
        property: 'justify-content',
        value: 'space-around'
    },

    {
        pattern: /^content-horizontal-evenly$/,
        property: 'justify-content',
        value: 'space-evenly'
    },

    // ============================================================
    // ALIGN ITEMS
    // ============================================================
    {
        pattern: /^items-vertical-start$/,
        property: 'align-items',
        value: 'flex-start'
    },

    {
        pattern: /^items-vertical-center$/,
        property: 'align-items',
        value: 'center'
    },

    {
        pattern: /^items-vertical-end$/,
        property: 'align-items',
        value: 'flex-end'
    },

    {
        pattern: /^items-vertical-stretch$/,
        property: 'align-items',
        value: 'stretch'
    },

    {
        pattern: /^items-vertical-baseline$/,
        property: 'align-items',
        value: 'baseline'
    },

    // ============================================================
    // ALIGN CONTENT
    // ============================================================
    {
        pattern: /^content-vertical-start$/,
        property: 'align-content',
        value: 'flex-start'
    },

    {
        pattern: /^content-vertical-center$/,
        property: 'align-content',
        value: 'center'
    },

    {
        pattern: /^content-vertical-end$/,
        property: 'align-content',
        value: 'flex-end'
    },

    {
        pattern: /^content-vertical-between$/,
        property: 'align-content',
        value: 'space-between'
    },

    {
        pattern: /^content-vertical-around$/,
        property: 'align-content',
        value: 'space-around'
    },

    {
        pattern: /^content-vertical-evenly$/,
        property: 'align-content',
        value: 'space-evenly'
    },

    {
        pattern: /^content-vertical-stretch$/,
        property: 'align-content',
        value: 'stretch'
    },

    // ============================================================
    // ALIGN SELF
    // ============================================================
    {
        pattern: /^self-vertical-start$/,
        property: 'align-self',
        value: 'flex-start'
    },

    {
        pattern: /^self-vertical-center$/,
        property: 'align-self',
        value: 'center'
    },

    {
        pattern: /^self-vertical-end$/,
        property: 'align-self',
        value: 'flex-end'
    },

    {
        pattern: /^self-vertical-stretch$/,
        property: 'align-self',
        value: 'stretch'
    },

    {
        pattern: /^self-vertical-baseline$/,
        property: 'align-self',
        value: 'baseline'
    },

    // ============================================================
    // FLEX GROW
    // ============================================================
    {
        pattern: /^fgrow-(.+)$/,
        property: 'flex-grow',
        value: (match: RegExpMatchArray) => match[1]
    },

    // ============================================================
    // FLEX SHRINK
    // ============================================================
    {
        pattern: /^fshrink-(.+)$/,
        property: 'flex-shrink',
        value: (match: RegExpMatchArray) => match[1]
    },

    // ============================================================
    // FLEX BASIS
    // ============================================================
    {
        pattern: /^fbasis-(.+)$/,
        property: 'flex-basis',
        value: (match: RegExpMatchArray) => match[1]
    },

    // ============================================================
    // ORDER
    // ============================================================
    {
        pattern: /^order-(.+)$/,
        property: 'order',
        value: (match: RegExpMatchArray) => match[1]
    },

    // ============================================================
    // GAP
    // ============================================================
    {
        pattern: /^gap-(.+)$/,
        property: 'gap',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^row-gap-(.+)$/,
        property: 'row-gap',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^column-gap-(.+)$/,
        property: 'column-gap',
        value: (match: RegExpMatchArray) => match[1]
    },

    // ============================================================
    // POSITION
    // ============================================================
    {
        pattern: /^p-static$/,
        property: 'position',
        value: 'static'
    },

    {
        pattern: /^p-rel$/,
        property: 'position',
        value: 'relative'
    },

    {
        pattern: /^p-abs$/,
        property: 'position',
        value: 'absolute'
    },

    {
        pattern: /^p-fix$/,
        property: 'position',
        value: 'fixed'
    },

    {
        pattern: /^p-sticky$/,
        property: 'position',
        value: 'sticky'
    },

    // ============================================================
    // POSITION OFFSETS
    // ============================================================
    {
        pattern: /^top-(.+)$/,
        property: 'top',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^right-(.+)$/,
        property: 'right',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^bottom-(.+)$/,
        property: 'bottom',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^left-(.+)$/,
        property: 'left',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^inset-(.+)$/,
        property: 'inset',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^insetin-(.+)$/,
        property: 'inset-inline',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^inset-block-(.+)$/,
        property: 'inset-block',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^insetin-start-(.+)$/,
        property: 'inset-inline-start',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^insetin-end-(.+)$/,
        property: 'inset-inline-end',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^inset-block-start-(.+)$/,
        property: 'inset-block-start',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^inset-block-end-(.+)$/,
        property: 'inset-block-end',
        value: (match: RegExpMatchArray) => match[1]
    },

    // ============================================================
    // Z-INDEX
    // ============================================================
    {
        pattern: /^zindex-(.+)$/,
        property: 'z-index',
        value: (match: RegExpMatchArray) => match[1]
    },

    // ============================================================
    // MARGIN
    // ============================================================
    {
        pattern: /^marg-(.+)$/,
        property: 'margin',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^marg-top-(.+)$/,
        property: 'margin-top',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^marg-right-(.+)$/,
        property: 'margin-right',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^marg-bottom-(.+)$/,
        property: 'margin-bottom',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^marg-left-(.+)$/,
        property: 'margin-left',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^marg-in-(.+)$/,
        property: 'margin-inline',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^marg-instart-(.+)$/,
        property: 'margin-inline-start',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^marg-inend-(.+)$/,
        property: 'margin-inline-end',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^marg-block-(.+)$/,
        property: 'margin-block',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^marg-block-start-(.+)$/,
        property: 'margin-block-start',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^marg-block-end-(.+)$/,
        property: 'margin-block-end',
        value: (match: RegExpMatchArray) => match[1]
    },

    // ============================================================
    // PADDING
    // ============================================================
    {
        pattern: /^pad-(.+)$/,
        property: 'padding',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^pad-top-(.+)$/,
        property: 'padding-top',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^pad-right-(.+)$/,
        property: 'padding-right',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^pad-bottom-(.+)$/,
        property: 'padding-bottom',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^pad-left-(.+)$/,
        property: 'padding-left',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^pad-in-(.+)$/,
        property: 'padding-inline',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^pad-in-start-(.+)$/,
        property: 'padding-inline-start',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^pad-in-end-(.+)$/,
        property: 'padding-inline-end',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^pad-block-(.+)$/,
        property: 'padding-block',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^pad-block-start-(.+)$/,
        property: 'padding-block-start',
        value: (match: RegExpMatchArray) => match[1]
    },

    {
        pattern: /^pad-block-end-(.+)$/,
        property: 'padding-block-end',
        value: (match: RegExpMatchArray) => match[1]
    }
];

export function parseClass(name: string): ParsedClass | null {
    let out: ParsedClass | null = null;

    for (const def of defs) {
        const m = name.match(def.pattern);

        if (!m) {
            continue;
        }

        // handle dynamic property names
        const prop = typeof def.property === 'function'
            ? def.property(m)
            : def.property;

        // handle dynamic values
        let val = typeof def.value === 'function'
            ? def.value(m)
            : def.value;

        if (val === undefined) {
            continue;
        }

        out = {
            className: name,
            property: prop,
            value: val
        };

        break; // only return the first match
    }

    return out;
}

export function parseClasses(names: string[]): ParsedClass[] {
    const out: ParsedClass[] = [];

    for (let i = 0; i < names.length; i++) {
        const cls = parseClass(names[i]);

        if (cls) {
            out.push(cls);
        }
    }

    return out;
}