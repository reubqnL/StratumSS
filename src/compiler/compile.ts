import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

import { generateCSS, type GenerateOptions } from './generator.js';
import { InvalidUtilityValueError, UnknownUtilityError, parseClass, renameHint, type ParsedClass } from './parser.js';
import { scan, type ScanOptions } from './scanner.js';

export interface CompileOptions extends ScanOptions, GenerateOptions {
    /** Directories or files to scan. */
    sources: readonly string[];
    /** Collect unknown/invalid classes as diagnostics instead of throwing. */
    allowUnknown?: boolean;
    /** Cap on the number of diagnostics reported per build. */
    maxDiagnostics?: number;
}

export interface Diagnostic {
    level: 'error' | 'warning';
    message: string;
    file?: string;
    line?: number;
    className?: string;
    suggestions?: string[];
}

export interface CompileResult {
    css: string;
    /** Classes that produced CSS, in the order they were parsed. */
    classes: ParsedClass[];
    /** Distinct source files that contained at least one class. */
    files: string[];
    /** Class names that were skipped because they are built at runtime. */
    skipped: number;
    diagnostics: Diagnostic[];
    durationMs: number;
}

/** Format for the diagnostic line prefix, e.g. `src/index.html:12:`. */
function describeLocation(diagnostic: Diagnostic): string {
    if (diagnostic.file === undefined) return '';
    const relative = path.relative(process.cwd(), diagnostic.file) || diagnostic.file;
    return `${relative}${diagnostic.line === undefined ? '' : `:${diagnostic.line}`}`;
}

/** Renders diagnostics for the terminal. */
export function formatDiagnostics(diagnostics: readonly Diagnostic[], max = 20): string[] {
    const lines: string[] = [];

    for (const diagnostic of diagnostics.slice(0, max)) {
        const location = describeLocation(diagnostic);
        const prefix = diagnostic.level === 'error' ? 'error' : 'warning';
        const where = location === '' ? '' : `${location}: `;
        const hint = diagnostic.suggestions?.length
            ? `\n    did you mean ${diagnostic.suggestions.map(name => `"${name}"`).join(' or ')}?`
            : '';
        lines.push(`${prefix}: ${where}${diagnostic.message}${hint}`);
    }

    if (diagnostics.length > max) {
        lines.push(`... and ${diagnostics.length - max} more`);
    }

    return lines;
}

/**
 * Scans the given sources and compiles every class it finds into a stylesheet.
 *
 * Unknown classes are collected as error diagnostics rather than thrown, so a
 * single build reports every problem at once.
 */
export function compile(options: CompileOptions): CompileResult {
    const start = performance.now();
    const { occurrences, files } = scan(options.sources, options);

    const diagnostics: Diagnostic[] = [];
    const classes: ParsedClass[] = [];
    const seen = new Set<string>();
    const maxDiagnostics = options.maxDiagnostics ?? Number.POSITIVE_INFINITY;
    let skipped = 0;

    for (const occurrence of occurrences) {
        if (seen.has(occurrence.className)) continue;
        seen.add(occurrence.className);

        try {
            const parsed = parseClass(occurrence.className);
            classes.push(parsed);

            if (parsed.renamedFrom !== undefined) {
                const replacement = renameHint(parsed.renamedFrom);
                diagnostics.push({
                    level: 'warning',
                    message: `"${parsed.renamedFrom}" is an old class name` +
                        (replacement === undefined ? '' : ` — use "${replacement}" instead`),
                    file: occurrence.file,
                    line: occurrence.line,
                    className: occurrence.className
                });
            }
        } catch (error) {
            if (diagnostics.length >= maxDiagnostics) {
                skipped++;
                continue;
            }

            if (error instanceof UnknownUtilityError) {
                diagnostics.push({
                    level: options.allowUnknown === true ? 'warning' : 'error',
                    message: error.message,
                    file: occurrence.file,
                    line: occurrence.line,
                    className: occurrence.className,
                    suggestions: error.suggestions
                });
                continue;
            }

            if (error instanceof InvalidUtilityValueError) {
                diagnostics.push({
                    level: 'error',
                    message: error.message,
                    file: occurrence.file,
                    line: occurrence.line,
                    className: occurrence.className
                });
                continue;
            }

            throw error;
        }
    }

    const css = generateCSS(classes, options);

    return {
        css,
        classes,
        files,
        skipped,
        diagnostics,
        durationMs: performance.now() - start
    };
}

/**
 * Compiles and writes the stylesheet.
 *
 * The write is atomic (temp file + rename) so a failed or interrupted build can
 * never leave a half-written `stratum.css` behind for the browser to load.
 * Returns `null` without touching the output file when there are error
 * diagnostics.
 */
export function writeResult(result: CompileResult, outputFile: string): string | null {
    if (result.diagnostics.some(diagnostic => diagnostic.level === 'error')) {
        return null;
    }

    const directory = path.dirname(outputFile);
    fs.mkdirSync(directory, { recursive: true });

    const temporary = path.join(directory, `.${path.basename(outputFile)}.${process.pid}.tmp`);
    fs.writeFileSync(temporary, result.css, 'utf-8');

    try {
        fs.renameSync(temporary, outputFile);
    } catch (error) {
        fs.rmSync(temporary, { force: true });
        throw error;
    }

    return result.css;
}

export { DEFAULT_EXTENSIONS, DEFAULT_IGNORED_DIRECTORIES } from './scanner.js';
export type { ClassOccurrence, ScanOptions } from './scanner.js';
export { generateCSS } from './generator.js';
export { parseClass, listUtilityClasses, listUtilityNames, renameHint, DEFINITIONS } from './parser.js';
export type { ParsedClass, UtilityDefinition } from './parser.js';
export type { GenerateOptions } from './generator.js';
