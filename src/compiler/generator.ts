import type { ParsedClass } from './parser.js';

function escapeCSSIdentifier(value: string): string {
    let result = '';

    for (let i = 0; i < value.length; i++) {
        const char = value[i];
        const code = char.charCodeAt(0);

        if (
            (code >= 48 && code <= 57 && i === 0) ||
            (code >= 48 && code <= 57) ||
            (code >= 65 && code <= 90) ||
            (code >= 97 && code <= 122) ||
            char === '-' ||
            char === '_'
        ) {
            result += char;
            continue;
        }

        result += `\\${code.toString(16)} `;
    }

    return result === '' ? '\\0 ' : result;
}

function validateCSSValue(value: string): void {
    if (value.length === 0) throw new Error('CSS value cannot be empty.');
    if (/[\u0000-\u001F\u007F]/.test(value)) throw new Error(`Invalid control character in CSS value: "${value}"`);
    if (value.includes('{') || value.includes('}')) throw new Error(`Invalid braces in CSS value: "${value}"`);
    if (value.includes(';')) throw new Error(`Invalid semicolon in CSS value: "${value}"`);
    if (value.includes('/*') || value.includes('*/')) throw new Error(`Invalid comment syntax in CSS value: "${value}"`);
}

function generateClass(parsed: ParsedClass): string {
    validateCSSValue(parsed.value);
    const className = escapeCSSIdentifier(parsed.className);

    return `.${className} {\n    ${parsed.property}: ${parsed.value};\n}`;
}

export function generateCSS(parsedClasses: ParsedClass[]): string {
    const output: string[] = [];
    const generated = new Set<string>();

    for (const parsed of parsedClasses) {
        const css = generateClass(parsed);
        if (generated.has(css)) continue;
        generated.add(css);
        output.push(css);
    }

    return output.length === 0 ? '' : output.join('\n\n') + '\n';
}
