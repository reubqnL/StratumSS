/**
 * StratumSS public API.
 *
 * ```ts
 * import { compile, generateCSS, parseClass } from 'stratumss';
 *
 * const result = compile({ sources: ['src'] });
 * fs.writeFileSync('public/app.css', result.css);
 * ```
 */

export {
    compile,
    writeResult,
    formatDiagnostics,
    DEFAULT_EXTENSIONS,
    DEFAULT_IGNORED_DIRECTORIES
} from './compiler/compile.js';

export type {
    CompileOptions,
    CompileResult,
    Diagnostic,
    ScanOptions,
    ClassOccurrence,
    GenerateOptions
} from './compiler/compile.js';

export {
    parseClass,
    listUtilityClasses,
    listUtilityNames,
    suggestUtilityNames,
    DEFINITIONS,
    UnknownUtilityError,
    InvalidUtilityValueError
} from './compiler/parser.js';

export type { ParsedClass, UtilityDefinition } from './compiler/parser.js';

export { generateCSS, sortParsedClasses, escapeCSSIdentifier } from './compiler/generator.js';

export { scan, listFiles, extractClasses, isDynamicClassToken } from './compiler/scanner.js';

export { validateValue, assertSafeValue, ValueSyntaxError, NAMED_COLORS } from './compiler/values.js';

export type { ValueKind, ValidatedValue } from './compiler/values.js';
