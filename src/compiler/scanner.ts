import fs from 'fs';
import path from 'path';

/** File types scanned by default. `.css` is deliberately absent: a stylesheet
 *  does not contain `class` attributes, so scanning it only ever produces
 *  phantom classes from comments and prose. */
export const DEFAULT_EXTENSIONS: readonly string[] = [
    '.html', '.htm', '.xhtml', '.php', '.phtml', '.vue', '.svelte', '.astro',
    '.jsx', '.tsx', '.mdx', '.md', '.twig', '.erb', '.njk', '.hbs', '.ejs', '.shtm'
];

/** Directory names that are never worth scanning. */
export const DEFAULT_IGNORED_DIRECTORIES: readonly string[] = [
    'node_modules', '.git', '.hg', '.svn', 'dist', 'build', 'out', 'coverage',
    '.next', '.nuxt', '.svelte-kit', '.output', '.cache', '.parcel-cache',
    'vendor', 'bower_components', '.idea', '.vscode', '__pycache__', '.venv', 'target'
];

/** A class name together with the place it was found, for error reporting. */
export interface ClassOccurrence {
    className: string;
    file: string;
    line: number;
}

export interface ScanOptions {
    extensions?: readonly string[];
    ignoredDirectories?: readonly string[];
    /** Extra glob-ish patterns (matched against the file name) to skip. */
    ignoredFiles?: readonly string[];
}

/** Attribute names whose value is a class list. */
const CLASS_ATTRIBUTES = new Set(['class', 'classname', 'classlist', 'class:list']);

/** One attribute inside a tag: `name="value"`, `name='value'` or a bare value. */
const ATTRIBUTE_RE = /([:@a-zA-Z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/g;

/** Replaces a match with blanks, so string offsets and line numbers survive. */
function blank(match: string): string {
    return match.replace(/[^\n]/g, ' ');
}

/** Masks regions that cannot contain markup attributes: comments, scripts, styles,
 *  and server-side template blocks. Length and newlines are preserved so that the
 *  line numbers reported for real classes stay correct. */
export function maskNonMarkup(source: string): string {
    return source
        .replace(/<!--[\s\S]*?-->/g, blank)
        .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, blank)
        .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, blank)
        .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, blank)
        .replace(/<\?(?:php|=|\s)[\s\S]*?\?>/gi, blank)
        .replace(/<%[\s\S]*?%>/g, blank)
        .replace(/\{\{[\s\S]*?\}\}/g, blank);
}

/**
 * Characters that only appear when a class list is produced at runtime, e.g.
 * `class="<?= $active ? 'on' : '' ?>"` or ``class={`flex ${x}`}``. Those class
 * lists cannot be resolved at build time, so they are skipped instead of being
 * reported as unknown classes. Punctuation that is meaningful in a CSS value
 * (`#`, `%`, `(`, `)`, `,`, `/`, `!`, `+`, `*`, `.`) is *not* a marker, so
 * `color-#3b82f6` and `grid-template-columns-repeat(3,_1fr)` still compile.
 */
const TEMPLATE_SYNTAX_RE = /[{}<>$?"'`\\;]/;

/** True when a token looks like a markup/script construct rather than a class. */
export function isDynamicClassToken(token: string): boolean {
    return TEMPLATE_SYNTAX_RE.test(token);
}

/** Iterates over tag bodies (`<div ...>`), honouring quoted attribute values. */
function* tags(source: string): Generator<{ text: string; index: number }> {
    let cursor = 0;

    while (cursor < source.length) {
        const open = source.indexOf('<', cursor);
        if (open === -1) return;

        const next = source[open + 1];
        if (next === undefined || !/[a-zA-Z]/.test(next)) {
            cursor = open + 1;
            continue;
        }

        let index = open + 1;
        let quote: string | null = null;

        while (index < source.length) {
            const char = source[index];
            if (quote !== null) {
                if (char === quote) quote = null;
            } else if (char === '"' || char === "'") {
                quote = char;
            } else if (char === '>') {
                break;
            }
            index++;
        }

        yield { text: source.slice(open, index + 1), index: open };
        cursor = index + 1;
    }
}

function lineOf(source: string, index: number): number {
    let line = 1;
    for (let i = 0; i < index; i++) {
        if (source[i] === '\n') line++;
    }
    return line;
}

/**
 * Extracts every class token from one source string.
 *
 * Only the class attributes of real tags are considered, which is what stops
 * the scanner from picking up `class="hero"` from a comment, a `<script>`
 * block, or a sentence in a paragraph. Runtime-built class lists (template
 * expressions, bound attributes) are skipped.
 */
export function extractClasses(source: string, file = '<source>'): ClassOccurrence[] {
    return extractClassesWithStats(source, file).occurrences;
}

/** Same as `extractClasses`, but also reports how many tokens were skipped. */
export function extractClassesWithStats(
    source: string,
    file = '<source>'
): { occurrences: ClassOccurrence[]; dynamicTokens: number } {
    const masked = maskNonMarkup(source);
    const occurrences: ClassOccurrence[] = [];
    let dynamicTokens = 0;

    for (const tag of tags(masked)) {
        for (const attribute of tag.text.matchAll(ATTRIBUTE_RE)) {
            if (!CLASS_ATTRIBUTES.has(attribute[1].toLowerCase())) continue;

            const attributeValue = attribute[2] ?? attribute[3] ?? attribute[4] ?? '';
            if (attributeValue === '') continue;

            const valueIndex = attribute.index ?? 0;
            const line = lineOf(masked, tag.index + valueIndex);

            for (const token of attributeValue.split(/\s+/)) {
                if (token === '') continue;
                if (isDynamicClassToken(token)) {
                    dynamicTokens++;
                    continue;
                }
                occurrences.push({ className: token, file, line });
            }
        }
    }

    return { occurrences, dynamicTokens };
}

function shouldIgnoreFile(name: string, ignoredFiles: readonly string[]): boolean {
    return ignoredFiles.some(pattern =>
        pattern.startsWith('*.') ? name.endsWith(pattern.slice(1)) : name === pattern
    );
}

function collectFiles(
    directory: string,
    extensions: ReadonlySet<string>,
    ignoredDirectories: ReadonlySet<string>,
    ignoredFiles: readonly string[],
    found: string[]
): void {
    let entries: fs.Dirent[];

    try {
        entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
        // Unreadable directory (permissions, broken symlink): skip rather than fail.
        return;
    }

    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        // Hidden entries are skipped (this also covers .git), as are symlinks,
        // which would otherwise let the walk escape the source tree.
        if (entry.name.startsWith('.')) continue;
        if (entry.isSymbolicLink()) continue;

        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            if (ignoredDirectories.has(entry.name)) continue;
            collectFiles(entryPath, extensions, ignoredDirectories, ignoredFiles, found);
            continue;
        }

        if (!entry.isFile()) continue;
        if (shouldIgnoreFile(entry.name, ignoredFiles)) continue;
        if (!extensions.has(path.extname(entry.name).toLowerCase())) continue;

        found.push(entryPath);
    }
}

function resolveExtensions(options: ScanOptions): Set<string> {
    return new Set((options.extensions ?? DEFAULT_EXTENSIONS).map(extension =>
        extension.startsWith('.') ? extension.toLowerCase() : `.${extension.toLowerCase()}`
    ));
}

/**
 * Returns every scannable file under `sources`, sorted, without reading them.
 * Used by the build and by the watcher's change detection.
 */
export function listFiles(sources: readonly string[], options: ScanOptions = {}): string[] {
    const extensions = resolveExtensions(options);
    const ignoredDirectories = new Set(options.ignoredDirectories ?? DEFAULT_IGNORED_DIRECTORIES);
    const ignoredFiles = options.ignoredFiles ?? [];
    const files: string[] = [];

    for (const source of sources) {
        let stats: fs.Stats;
        try {
            stats = fs.statSync(source);
        } catch {
            continue;
        }

        if (stats.isFile()) {
            if (extensions.has(path.extname(source).toLowerCase())) {
                files.push(source);
            }
            continue;
        }

        collectFiles(source, extensions, ignoredDirectories, ignoredFiles, files);
    }

    return files.sort();
}

export interface ScanResult {
    occurrences: ClassOccurrence[];
    /** Distinct file paths that were read. */
    files: string[];
    /** Class tokens skipped because the class list is built at runtime. */
    dynamicTokens: number;
}

/**
 * Recursively scans `directories` and returns every class token found,
 * de-duplicated by class name, keeping the first location for reporting.
 */
export function scan(directories: readonly string[], options: ScanOptions = {}): ScanResult {
    const files = listFiles(directories, options);
    const found: ClassOccurrence[] = [];
    let dynamicTokens = 0;

    for (const file of files) {
        const extracted = extractClassesWithStats(fs.readFileSync(file, 'utf-8'), file);
        found.push(...extracted.occurrences);
        dynamicTokens += extracted.dynamicTokens;
    }

    const byName = new Map<string, ClassOccurrence>();

    for (const occurrence of found) {
        if (!byName.has(occurrence.className)) {
            byName.set(occurrence.className, occurrence);
        }
    }

    return { occurrences: [...byName.values()], files, dynamicTokens };
}
