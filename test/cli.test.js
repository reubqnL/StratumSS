import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

import { cliPath, makeTempDir, removeDir, writeFiles } from './helpers.js';

/** Runs the built CLI and returns its exit code, stdout and stderr. */
function run(args, options = {}) {
    const result = spawnSync(process.execPath, [cliPath, ...args], {
        cwd: options.cwd,
        encoding: 'utf-8'
    });

    return {
        code: result.status,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? ''
    };
}

/** Creates a small project and returns its directory. */
function fixture() {
    const root = makeTempDir();
    writeFiles(root, {
        'index.html': [
            '<!doctype html>',
            '<div class="flex fdirection-col gap-20px padding-10px_20px">',
            '  <h1 class="font-size-32px font-weight-700 color-black">Hi</h1>',
            '</div>'
        ].join('\n')
    });
    return root;
}

test('prints help and version', () => {
    const help = run(['--help']);
    assert.equal(help.code, 0);
    assert.match(help.stdout, /Usage\n  stratumss build/);
    assert.match(help.stdout, /--allow-unknown/);

    const version = run(['--version']);
    assert.equal(version.code, 0);
    assert.match(version.stdout.trim(), /^\d+\.\d+\.\d+$/);
});

test('builds a stylesheet with a summary', () => {
    const root = fixture();

    try {
        const result = run(['build', '--output', 'out.css'], { cwd: root });
        assert.equal(result.code, 0, result.stderr);
        assert.match(result.stdout, /StratumSS built \d+ utilities from 1 file/);

        const css = fs.readFileSync(path.join(root, 'out.css'), 'utf-8');
        assert.match(css, /^\/\*! StratumSS v\d+\.\d+\.\d+/);
        assert.match(css, /\.flex \{\n    display: flex;\n\}/);
        assert.match(css, /\.padding-10px_20px \{\n    padding: 10px 20px;\n\}/);
        // Renamed legacy class compiles, with a warning on stderr.
        assert.match(css, /\.fdirection-col \{\n    flex-direction: column;\n\}/);
        assert.match(result.stderr, /old class name/);
    } finally {
        removeDir(root);
    }
});

test('supports --minify, --no-header and --quiet', () => {
    const root = fixture();

    try {
        const result = run(['build', '-o', 'out.css', '--minify', '--no-header', '--quiet'], { cwd: root });
        assert.equal(result.code, 0, result.stderr);
        assert.equal(result.stdout, '');

        const css = fs.readFileSync(path.join(root, 'out.css'), 'utf-8');
        assert.equal(css.includes('\n'), false);
        assert.match(css, /\.flex\{display:flex;\}/);

        const withHeader = run(['build', '-o', 'header.css', '--minify'], { cwd: root });
        assert.equal(withHeader.code, 0);
        assert.match(fs.readFileSync(path.join(root, 'header.css'), 'utf-8'), /^\/\*! StratumSS/);
    } finally {
        removeDir(root);
    }
});

test('reports every unknown class at once with its location', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, {
            'a.html': '<div class="hero flex"></div>',
            'b.html': '<p class="btn"></p>'
        });

        const result = run(['build', '-o', 'out.css'], { cwd: root });
        assert.equal(result.code, 1);
        assert.match(result.stderr, /a\.html:1: Unknown StratumSS class "hero"/);
        assert.match(result.stderr, /b\.html:1: Unknown StratumSS class "btn"/);
        assert.match(result.stderr, /2 errors/);

        // A failed build must not write or clobber the stylesheet.
        assert.equal(fs.existsSync(path.join(root, 'out.css')), false);

        fs.writeFileSync(path.join(root, 'out.css'), '/* previous */', 'utf-8');
        run(['build', '-o', 'out.css'], { cwd: root });
        assert.equal(fs.readFileSync(path.join(root, 'out.css'), 'utf-8'), '/* previous */');
    } finally {
        removeDir(root);
    }
});

test('--allow-unknown downgrades unknown classes to warnings', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, { 'index.html': '<div class="hero flex"></div>' });

        const result = run(['build', '-o', 'out.css', '--allow-unknown'], { cwd: root });
        assert.equal(result.code, 0, result.stderr);
        assert.match(result.stderr, /warning: index\.html:1: Unknown StratumSS class "hero"/);
        assert.match(fs.readFileSync(path.join(root, 'out.css'), 'utf-8'), /\.flex \{/);
    } finally {
        removeDir(root);
    }
});

test('rejects unknown options instead of ignoring them', () => {
    const root = fixture();

    try {
        const result = run(['build', '--outpu', 'out.css'], { cwd: root });
        assert.equal(result.code, 1);
        assert.match(result.stderr, /Unknown option "--outpu"/);
        assert.match(result.stderr, /Did you mean "--output"\?/);
        assert.equal(fs.existsSync(path.join(root, 'out.css')), false);
    } finally {
        removeDir(root);
    }
});

test('rejects unknown commands and missing option values', () => {
    assert.equal(run(['bulid']).code, 1);
    assert.match(run(['bulid']).stderr, /Unknown command "bulid"/);
    assert.match(run(['build', '--output']).stderr, /Missing value for --output/);
});

test('reports missing source paths clearly', () => {
    const result = run(['build', './does-not-exist']);
    assert.equal(result.code, 1);
    assert.match(result.stderr, /Source path does not exist/);
});

test('--json emits machine-readable statistics', () => {
    const root = fixture();

    try {
        const result = run(['build', '-o', 'out.css', '--json'], { cwd: root });
        assert.equal(result.code, 0, result.stderr);

        const stats = JSON.parse(result.stdout);
        assert.equal(stats.files, 1);
        assert.equal(stats.classes, 7);
        assert.ok(stats.bytes > 0);
        assert.equal(stats.errors, 0);
        assert.equal(stats.warnings, 1);
        assert.equal(path.basename(stats.output), 'out.css');
    } finally {
        removeDir(root);
    }
});

test('list prints the catalogue, as text or JSON', () => {
    const text = run(['list']);
    assert.equal(text.code, 0);
    assert.match(text.stdout, /Spacing/);
    assert.match(text.stdout, /padding-<length>/);
    assert.match(text.stdout, /content-horizontal-center/);

    const json = run(['list', '--json']);
    assert.equal(json.code, 0);
    const entries = JSON.parse(json.stdout);
    assert.ok(entries.length > 100);
    assert.ok(entries.every(entry => entry.className && entry.property && entry.group));
});

test('input arguments are accepted positionally and via --source', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, {
            'site/index.html': '<div class="flex"></div>',
            'partials/card.html': '<div class="padding-4px"></div>'
        });

        const positional = run(['build', 'site', 'partials', '-o', 'out.css', '--quiet'], { cwd: root });
        assert.equal(positional.code, 0, positional.stderr);

        const css = fs.readFileSync(path.join(root, 'out.css'), 'utf-8');
        assert.match(css, /\.flex \{/);
        assert.match(css, /\.padding-4px \{/);

        const flagged = run(['build', '-s', 'site', '-o', 'one.css', '--quiet'], { cwd: root });
        assert.equal(flagged.code, 0, flagged.stderr);
        assert.doesNotMatch(fs.readFileSync(path.join(root, 'one.css'), 'utf-8'), /padding-4px/);
    } finally {
        removeDir(root);
    }
});

test('--exclude keeps directories out of the scan', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, {
            'src/index.html': '<div class="flex"></div>',
            'legacy/old.html': '<div class="hero"></div>'
        });

        const result = run(['build', '--exclude', 'legacy', '-o', 'out.css', '--quiet'], { cwd: root });
        assert.equal(result.code, 0, result.stderr);
    } finally {
        removeDir(root);
    }
});

test('a rebuild is byte-identical (reproducible output)', () => {
    const root = fixture();

    try {
        run(['build', '-o', 'first.css', '--quiet'], { cwd: root });
        run(['build', '-o', 'second.css', '--quiet'], { cwd: root });

        const first = fs.readFileSync(path.join(root, 'first.css'), 'utf-8');
        const second = fs.readFileSync(path.join(root, 'second.css'), 'utf-8');
        assert.equal(first, second);
        assert.doesNotMatch(first, /\d{4}-\d{2}-\d{2}/, 'output must not contain a build timestamp');
    } finally {
        removeDir(root);
    }
});

test('watch mode rebuilds on change and stops on SIGINT', async () => {
    const root = fixture();
    const child = spawnSync;

    try {
        const { spawn } = await import('node:child_process');
        const watcher = spawn(process.execPath, [cliPath, 'build', '--watch', '-o', 'out.css'], {
            cwd: root,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        const output = [];
        watcher.stdout.on('data', chunk => output.push(chunk.toString()));
        watcher.stderr.on('data', chunk => output.push(chunk.toString()));

        await new Promise(resolve => setTimeout(resolve, 700));
        assert.match(output.join(''), /Watching/);

        fs.writeFileSync(path.join(root, 'index.html'), '<div class="block"></div>', 'utf-8');
        await new Promise(resolve => setTimeout(resolve, 1400));

        assert.match(output.join(''), /Rebuilt/);
        assert.match(fs.readFileSync(path.join(root, 'out.css'), 'utf-8'), /\.block \{/);

        watcher.kill('SIGINT');
        await new Promise(resolve => setTimeout(resolve, 300));
        assert.equal(watcher.killed, true);
        void child;
    } finally {
        removeDir(root);
    }
});
