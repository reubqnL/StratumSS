import { suggestFrom } from './suggest.js';

export interface CliOptions {
    command: 'build' | 'list' | 'help' | 'version';
    sources: string[];
    output: string;
    exclude: string[];
    extensions: string[];
    minify: boolean;
    header: boolean;
    watch: boolean;
    allowUnknown: boolean;
    quiet: boolean;
    json: boolean;
}

export interface ParseSuccess {
    ok: true;
    options: CliOptions;
}

export interface ParseFailure {
    ok: false;
    message: string;
}

export type ParseResult = ParseSuccess | ParseFailure;

const DEFAULT_OUTPUT = './dist/stratum.css';

export const HELP_TEXT = `
StratumSS — a human-readable utility-first CSS framework.

Usage
  stratumss build [sources...] [options]
  stratumss list [options]
  stratumss help
  stratumss --version

Commands
  build                 Scan source files and generate a stylesheet.
  list                  Print every utility the framework understands.
  help                  Show this help message.

Build options
  -s, --source <path>   Directory or file to scan. Repeatable. Default: .
  -o, --output <file>   Stylesheet to write. Default: ./dist/stratum.css
      --exclude <names> Directory names to skip, comma separated.
                        Default: node_modules, .git, dist, build, ...
      --extensions <list>
                        File extensions to scan, comma separated.
      --minify          Emit compact CSS without whitespace.
      --no-header       Omit the banner comment from the output.
  -w, --watch           Rebuild whenever a scanned file changes.
      --allow-unknown   Warn about unknown classes instead of failing.

General options
  -q, --quiet           Suppress the build summary.
      --json            Print machine-readable build statistics.
  -h, --help            Show this help message.
  -v, --version         Show the installed StratumSS version.

Examples
  stratumss build
  stratumss build src --output public/app.css --minify
  stratumss build src docs --watch
  stratumss list --json
`.trimStart();

const VALUE_FLAGS = new Set(['-s', '--source', '-o', '--output', '--exclude', '--extensions']);

function fail(message: string): ParseFailure {
    return { ok: false, message };
}

function splitList(value: string): string[] {
    return value.split(',').map(part => part.trim()).filter(part => part !== '');
}

/**
 * Parses CLI arguments into options.
 *
 * Anything unrecognised is an error: a typo such as `--outpu` used to be
 * silently ignored *and* swallow the following argument.
 */
export function parseArgs(argv: readonly string[]): ParseResult {
    const options: CliOptions = {
        command: 'build',
        sources: [],
        output: DEFAULT_OUTPUT,
        exclude: [],
        extensions: [],
        minify: false,
        header: true,
        watch: false,
        allowUnknown: false,
        quiet: false,
        json: false
    };

    let command: CliOptions['command'] | null = null;
    const positionals: string[] = [];
    let outputSet = false;

    for (let index = 0; index < argv.length; index++) {
        const rawArgument = argv[index];
        let argument = rawArgument;
        let inlineValue: string | undefined;

        if (argument.startsWith('--') && argument.includes('=')) {
            const separator = argument.indexOf('=');
            inlineValue = argument.slice(separator + 1);
            argument = argument.slice(0, separator);
        }

        if (argument === '--') {
            positionals.push(...argv.slice(index + 1));
            break;
        }

        const readValue = (): string | ParseFailure => {
            if (inlineValue !== undefined) return inlineValue;
            const next = argv[index + 1];
            if (next === undefined || (next.startsWith('-') && next !== '-' && !/^-\d/.test(next))) {
                return fail(`Missing value for ${argument}.`);
            }
            index++;
            return next;
        };

        if (VALUE_FLAGS.has(argument)) {
            const value = readValue();
            if (typeof value !== 'string') return value;

            if (argument === '-o' || argument === '--output') {
                options.output = value;
                outputSet = true;
            } else if (argument === '-s' || argument === '--source') {
                options.sources.push(value);
            } else if (argument === '--exclude') {
                options.exclude.push(...splitList(value));
            } else {
                options.extensions.push(...splitList(value));
            }
            continue;
        }

        switch (argument) {
            case '-h':
            case '--help':
                command = 'help';
                break;
            case '-v':
            case '--version':
                command = 'version';
                break;
            case '--minify':
                options.minify = true;
                break;
            case '--no-header':
                options.header = false;
                break;
            case '-w':
            case '--watch':
                options.watch = true;
                break;
            case '--allow-unknown':
                options.allowUnknown = true;
                break;
            case '-q':
            case '--quiet':
                options.quiet = true;
                break;
            case '--json':
                options.json = true;
                break;
            default:
                if (argument.startsWith('-') && argument !== '-') {
                    const known = [...VALUE_FLAGS, '-h', '--help', '-v', '--version', '--minify',
                        '--no-header', '-w', '--watch', '--allow-unknown', '-q', '--quiet', '--json'];
                    const suggestions = suggestFrom(known, argument, 1);
                    return fail(
                        `Unknown option "${argument}".` +
                        (suggestions.length > 0 ? ` Did you mean "${suggestions[0]}"?` : '')
                    );
                }
                positionals.push(argument);
        }
    }

    if (command === null) {
        const [first, ...rest] = positionals;
        if (first === undefined) {
            command = 'build';
        } else if (first === 'build' || first === 'list' || first === 'help') {
            command = first;
            options.sources.push(...rest);
        } else {
            const suggestions = suggestFrom(['build', 'list', 'help'], first, 1);
            return fail(
                `Unknown command "${first}".` +
                (suggestions.length > 0 ? ` Did you mean "${suggestions[0]}"?` : '')
            );
        }
    } else {
        options.sources.push(...positionals);
    }

    options.command = command;

    if (!outputSet && command === 'list') {
        options.output = DEFAULT_OUTPUT;
    }

    if (options.sources.length === 0) {
        options.sources.push('.');
    }

    if (command === 'build' && options.watch && options.json) {
        return fail('--watch and --json cannot be combined.');
    }

    return { ok: true, options };
}
