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
 * Functions whose parentheses hold names rather than CSS values. Inside them an
 * underscore is part of the name (`--my_color`), so it must not become a space.
 */
const IDENTIFIER_FUNCTIONS = new Set(['var', 'env', 'attr', 'url', 'counter', 'counters']);

/** Math functions, where `+` and `-` are only operators when space-separated. */
const MATH_FUNCTION_RE = /^(calc|min|max|clamp|mod|rem|round)\(/i;

/** Trailing run of characters that could make up the operand before an operator. */
const PRECEDING_TOKEN_RE = /[A-Za-z0-9.]+$/;

/** A number, optionally followed by a unit or `%`, i.e. something an operator can follow. */
const NUMBER_WITH_UNIT_RE = /^-?(?:\d+\.?\d*|\.\d+)[a-z%]*$/i;

/**
 * Splits a raw class value on the `_` separators that are *not* inside a pair of
 * parentheses, and turns the underscores that are inside one into spaces. That is
 * what makes `width-calc(100%_-_2rem)` mean `calc(100% - 2rem)` while
 * `width-min(1px_var(--x))_max-content` still reads as two values, and while a
 * custom-property name keeps its underscores.
 */
function splitSegments(rawValue: string): string[] {
    const segments: string[] = [];
    const functions: string[] = [];
    let current = '';

    for (let index = 0; index < rawValue.length; index += 1) {
        const char = rawValue[index] as string;

        if (char === '(') {
            const name = /[A-Za-z][A-Za-z0-9-]*$/.exec(rawValue.slice(0, index))?.[0].toLowerCase() ?? '';
            functions.push(name);
            current += char;
            continue;
        }
        if (char === ')') {
            functions.pop();
            current += char;
            continue;
        }
        if (char === '_') {
            if (functions.length === 0) {
                segments.push(current);
                current = '';
                continue;
            }
            const owner = functions[functions.length - 1] as string;
            current += IDENTIFIER_FUNCTIONS.has(owner) ? char : ' ';
            continue;
        }
        current += char;
    }

    segments.push(current);
    return segments;
}

/**
 * Finds a `+` or `-` that the browser will read as an operator but that is not
 * space-separated, as in `calc(100%-2rem)`. CSS makes those a parse error, so the
 * declaration would be thrown away silently — exactly what validation is for.
 */
export function findUnspacedMathOperator(value: string): { operator: string, index: number } | null {
    if (!MATH_FUNCTION_RE.test(value)) return null;

    for (let index = 1; index < value.length - 1; index += 1) {
        const char = value[index] as string;
        if (char !== '+' && char !== '-') continue;

        const before = value[index - 1] as string;
        const after = value[index + 1] as string;
        if (before === ' ') continue;

        // A parenthesis, comma or operator before it means this sign is unary,
        // as in `calc(-4px)` or `calc(100% * -2rem)`, and needs no space.
        let endsAnOperand = before === ')' || before === '%';
        if (!endsAnOperand) {
            const token = PRECEDING_TOKEN_RE.exec(value.slice(0, index))?.[0];
            endsAnOperand = token !== undefined && NUMBER_WITH_UNIT_RE.test(token);
        }
        if (endsAnOperand && after !== ' ') {
            return { operator: char, index };
        }
    }

    return null;
}

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

    const segments = splitSegments(rawValue);

    for (const segment of segments) {
        if (!validateSegment(kind, segment, allowed)) {
            throw new ValueSyntaxError(
                kind,
                segment,
                `"${segment}" is not a valid ${kind} value — expected ${describeExpectation(kind, allowed)}`
            );
        }

        const unspaced = findUnspacedMathOperator(segment);
        if (unspaced !== null) {
            const name = MATH_FUNCTION_RE.exec(segment)?.[1] ?? 'calc';
            const { operator, index } = unspaced;
            const fix = `${segment.slice(0, index)}_${operator}_${segment.slice(index + 1)}`;
            throw new ValueSyntaxError(
                kind,
                segment,
                `in ${name}() the "${operator}" operator needs a space on both sides — write it as "${fix}"`
            );
        }
    }

    return {
        value: segments.join(' '),
        dynamic: segments.every(segment => isCssWideKeyword(segment) || isVarReference(segment))
    };
}
