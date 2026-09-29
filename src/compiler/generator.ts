import type { ParsedClass } from './parser.js';
import { assertSafeValue } from './values.js';

/**
 * Escapes a class name for use in a CSS selector.
 *
 * Implements the CSS.escape() algorithm from the CSS Syntax specification:
 * a leading digit, a leading `-` followed by a digit, and every character that
 * is not `[A-Za-z0-9_-]` is escaped. Unlike the previous implementation this
 * also escapes `%`, `.` and `/`, and never leaves a leading digit unescaped.
 */
export function escapeCSSIdentifier(value: string): string {
    if (value === '') return '\\0 ';

    let result = '';

    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        const char = value[i];

        if (code === 0x0000) {
            result += '\uFFFD';
            continue;
        }

        const isDigit = code >= 0x30 && code <= 0x39;
        const isLeadingDigit = isDigit && i === 0;
        const isSecondDigitAfterDash = isDigit && i === 1 && value.charCodeAt(0) === 0x2d;

        if (isLeadingDigit || isSecondDigitAfterDash) {
            result += `\\${code.toString(16)} `;
            continue;
        }

        if (code >= 0x80 ||
            char === '-' || char === '_' ||
            (code >= 0x30 && code <= 0x39) ||
            (code >= 0x41 && code <= 0x5a) ||
            (code >= 0x61 && code <= 0x7a)) {
            result += char;
            continue;
        }

        result += `\\${char}`;
    }

    return result;
}

/**
 * Renders a single utility as a CSS rule. Values were validated when the class
 * was parsed; this is the last line of defence against malformed output.
 */
function generateClass(parsed: ParsedClass, minify: boolean): string {
    assertSafeValue(parsed.value);

    const className = escapeCSSIdentifier(parsed.className);
    const value = parsed.value.replace(/ !important$/, '');
    const important = parsed.value.endsWith(' !important') ? ' !important' : '';
    const declaration = `${parsed.property}:${value}${important}`;

    return minify
        ? `.${className}{${declaration};}`
        : `.${className} {\n    ${declaration.replace(':', ': ')};\n}`;
}

/** Stable ordering: by cascade rank, then alphabetically by class name. */
export function sortParsedClasses(parsedClasses: readonly ParsedClass[]): ParsedClass[] {
    return [...parsedClasses].sort((a, b) =>
        a.rank - b.rank ||
        a.property.localeCompare(b.property) ||
        a.className.localeCompare(b.className)
    );
}

export interface GenerateOptions {
    /** Collapse the output into a single minified line. */
    minify?: boolean;
    /** Banner comment to write at the top of the file. */
    header?: string;
}

/**
 * Turns parsed utilities into a stylesheet.
 *
 * Output is deterministic: the same set of classes always produces byte-identical
 * CSS, regardless of the order in which files were scanned.
 */
export function generateCSS(parsedClasses: readonly ParsedClass[], options: GenerateOptions = {}): string {
    const rules: string[] = [];
    const seen = new Set<string>();

    const minify = options.minify === true;

    for (const parsed of sortParsedClasses(parsedClasses)) {
        // Deduplicate on the class name, not on the declaration: `flex` and
        // `display-flex` share a declaration but need their own selectors.
        if (seen.has(parsed.className)) continue;
        seen.add(parsed.className);
        rules.push(generateClass(parsed, minify));
    }

    if (minify) {
        const body = rules.join('');
        return options.header === undefined ? body : `${options.header}${body}`;
    }

    const body = rules.join('\n\n');
    const parts: string[] = [];

    if (options.header !== undefined) {
        parts.push(options.header.trimEnd());
    }
    if (body !== '') {
        parts.push(body);
    }

    return parts.length === 0 ? '' : parts.join('\n\n') + '\n';
}
