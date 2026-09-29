/**
 * Value vocabulary for StratumSS utilities.
 *
 * Every utility declares the *shape* of the value it accepts. Values arrive
 * straight from the class attribute of a source file, so they are validated
 * before they are written into the stylesheet. Validation exists to catch
 * typos (`padding-4p`) and to make CSS injection impossible (`padding-4px}`).
 */

export type ValueKind =
    | 'enum'
    | 'length'
    | 'time'
    | 'number'
    | 'integer'
    | 'color'
    | 'keyword'
    | 'raw';

/** Units accepted by the `length` value kind. */
const LENGTH_UNITS = [
    'px', '%', 'rem', 'em', 'vh', 'vw', 'vmin', 'vmax', 'dvh', 'dvw', 'lvh', 'lvw', 'svh', 'svw',
    'ch', 'ex', 'cap', 'ic', 'lh', 'rlh', 'cqw', 'cqh', 'cqi', 'cqb', 'cqmin', 'cqmax',
    'pt', 'pc', 'cm', 'mm', 'q', 'in', 'fr'
];

/** Keywords accepted by the `length` value kind without a unit. */
const LENGTH_KEYWORDS = [
    '0', 'auto', 'none', 'min-content', 'max-content', 'fit-content',
    'inherit', 'initial', 'unset', 'revert', 'revert-layer'
];

/** CSS functions accepted anywhere a value is expected. */
const FUNCTIONS = [
    'calc', 'min', 'max', 'clamp', 'var', 'env', 'attr', 'color-mix', 'light-dark',
    'rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color',
    'url', 'image-set', 'cross-fade', 'paint', 'conic-gradient', 'linear-gradient',
    'radial-gradient', 'repeating-linear-gradient', 'repeating-conic-gradient',
    'repeating-radial-gradient', 'cubic-bezier', 'steps', 'steps-start', 'steps-end',
    'translate', 'translatex', 'translatey', 'translatez', 'translate3d', 'scale', 'scalex',
    'scaley', 'scalez', 'scale3d', 'rotate', 'rotatex', 'rotatey', 'rotatez', 'rotate3d',
    'skew', 'skewx', 'skewy', 'matrix', 'matrix3d', 'perspective', 'blur', 'brightness',
    'contrast', 'drop-shadow', 'grayscale', 'hue-rotate', 'invert', 'saturate', 'sepia',
    'path', 'polygon', 'circle', 'ellipse', 'inset', 'repeat', 'symbols'
];

/** Result of a successful value validation: the value to write into the CSS. */
export interface ValidatedValue {
    /** The value as it will appear in the generated stylesheet. */
    value: string;
    /**
     * `true` when the value is CSS-wide keyword or a `var()` reference, i.e.
     * something we cannot reason about and therefore never reject.
     */
    dynamic: boolean;
}

const NUMBER_PATTERN = String.raw`-?(?:\d+\.?\d*|\.\d+)`;
const NUMBER_OR_PERCENT_RE = new RegExp(`^${NUMBER_PATTERN}%?$`);
const INTEGER_RE = /^-?\d+$/;
const TIME_RE = new RegExp(`^${NUMBER_PATTERN}(?:ms|s)$`);
const LENGTH_RE = new RegExp(
    `^(?:${NUMBER_PATTERN}(?:${LENGTH_UNITS.join('|')})?|${LENGTH_KEYWORDS.join('|')}` +
    `|min\\([^()]*\\)|max\\([^()]*\\)|fit-content\\([^()]*\\))$`
);
const KEYWORD_RE = /^(?:[a-zA-Z][a-zA-Z0-9]*)(?:-[a-zA-Z0-9]+)*$/;
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const FUNCTION_RE = new RegExp(`^(${FUNCTIONS.join('|')})\\(.*\\)$`);

/** Characters that could terminate the declaration or the rule when emitted. */
const UNSAFE_VALUE_RE = /[{};\\]|(\/\*)|(\*\/)|[\u0000-\u001F\u007F]/;

/** CSS-wide keywords and `var()` references are always accepted. */
const CSS_WIDE_KEYWORDS = new Set(['inherit', 'initial', 'unset', 'revert', 'revert-layer']);

/**
 * The CSS named colours, including the `transparent`/`currentcolor` keywords.
 * Kept as a Set so lookups are O(1) and the error message can stay short.
 */
export const NAMED_COLORS = new Set([
    'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
    'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
    'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
    'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta',
    'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
    'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink',
    'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
    'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow',
    'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
    'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
    'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
    'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue',
    'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
    'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
    'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
    'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
    'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
    'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
    'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
    'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen',
    'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
    'whitesmoke', 'yellow', 'yellowgreen',
    'transparent', 'currentcolor', 'currentColor'
]);

/** A single value segment could not be validated. */
export class ValueSyntaxError extends Error {
    constructor(
        public readonly kind: ValueKind,
        public readonly segment: string,
        message: string
    ) {
        super(message);
        this.name = 'ValueSyntaxError';
    }
}

function isCssWideKeyword(segment: string): boolean {
    return CSS_WIDE_KEYWORDS.has(segment.toLowerCase());
}

function isVarReference(segment: string): boolean {
    return /^var\(--[^()]+\)$/i.test(segment);
}

function isFunctionValue(segment: string): boolean {
    return FUNCTION_RE.test(segment) || /^[a-z-]+\(.*\)$/i.test(segment) && !/[{};]/.test(segment);
}

/**
 * Rejects values which would break out of the declaration when interpolated.
 * This is the security boundary of the whole compiler.
 */
export function assertSafeValue(value: string): void {
    if (value.length === 0) {
        throw new Error('CSS value cannot be empty.');
    }
    if (UNSAFE_VALUE_RE.test(value)) {
        throw new Error(`Unsafe character in CSS value: "${value}"`);
    }
}

function validateSegment(kind: ValueKind, segment: string, allowed?: readonly string[]): boolean {
    if (segment === '') return false;
    if (isCssWideKeyword(segment)) return true;
    if (isVarReference(segment)) return true;

    switch (kind) {
        case 'enum':
            return allowed !== undefined && allowed.includes(segment.toLowerCase());
        case 'length':
            return LENGTH_RE.test(segment) || isFunctionValue(segment);
        case 'time':
            return TIME_RE.test(segment) || segment === '0' || isFunctionValue(segment);
        case 'number':
            // `opacity-50%` and `opacity-0.5` are both valid.
            return NUMBER_OR_PERCENT_RE.test(segment) || segment === 'none' || isFunctionValue(segment);
        case 'integer':
            return INTEGER_RE.test(segment) || segment === 'auto' || isFunctionValue(segment);
        case 'color':
            return NAMED_COLORS.has(segment.toLowerCase()) ||
                NAMED_COLORS.has(segment) ||
                HEX_COLOR_RE.test(segment) ||
                isFunctionValue(segment);
        case 'keyword':
            return KEYWORD_RE.test(segment);
        case 'raw':
            return !UNSAFE_VALUE_RE.test(segment);
    }
}

function describeExpectation(kind: ValueKind, allowed?: readonly string[]): string {
    switch (kind) {
        case 'enum':
            return `one of: ${(allowed ?? []).join(', ')}`;
        case 'length':
            return 'a number with a unit (px, rem, %, vh, …) or a keyword such as auto';
        case 'time':
            return 'a duration such as 200ms or 0.3s';
        case 'number':
            return 'a number such as 1 or 1.5';
        case 'integer':
            return 'a whole number such as 0, 1 or 10';
        case 'color':
            return 'a named colour, a hex colour, or a function such as rgb(…)';
        case 'keyword':
            return 'a keyword such as pointer or system-ui';
        case 'raw':
            return 'a CSS value (use _ for a space, e.g. 1px_solid_red)';
    }
}

/**
 * Validates one value, which may consist of several `-`-separated pieces
 * joined with `_` in the class name (`padding-10px_20px`).
 */
export function validateValue(
    kind: ValueKind,
    rawValue: string,
    allowed?: readonly string[]
): ValidatedValue {
    assertSafeValue(rawValue);

    const segments = rawValue.split('_');

    for (const segment of segments) {
        if (!validateSegment(kind, segment, allowed)) {
            throw new ValueSyntaxError(
                kind,
                segment,
                `"${segment}" is not a valid ${kind} value — expected ${describeExpectation(kind, allowed)}`
            );
        }
    }

    return {
        value: segments.join(' '),
        dynamic: segments.every(segment => isCssWideKeyword(segment) || isVarReference(segment))
    };
}
