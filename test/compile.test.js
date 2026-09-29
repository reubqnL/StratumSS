import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import { compile, formatDiagnostics, writeResult } from '../dist/index.js';
import { makeTempDir, removeDir, writeFiles } from './helpers.js';

test('compiles a small project end to end', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, {
            'index.html': '<main class="flex content-horizontal-center items-vertical-center gap-20px">',
            'pages/about.html': '<div class="padding-4px width-50%">',
            'partials/footer.php': '<footer class="<?= $theme ?> padding-4px">'
        });

        const result = compile({ sources: [root] });

        assert.deepEqual(result.diagnostics.filter(d => d.level === 'error'), []);
        assert.equal(result.files.length, 3);
        assert.equal(result.css.includes('<?='), false);

        const classes = result.classes.map(entry => entry.className);
        assert.ok(classes.includes('content-horizontal-center'));
        assert.ok(classes.includes('padding-4px'));
        assert.equal(classes.includes('$theme'), false);
    } finally {
        removeDir(root);
    }
});

test('collects every problem instead of stopping at the first', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, {
            'a.html': '<div class="hero padding-4p"></div>',
            'b.html': '<span class="card width-neg-4px"></span>'
        });

        const result = compile({ sources: [root] });
        const errors = result.diagnostics.filter(diagnostic => diagnostic.level === 'error');

        assert.equal(errors.length, 4);
        assert.deepEqual(
            errors.map(error => error.className).sort(),
            ['card', 'hero', 'padding-4p', 'width-neg-4px']
        );
        assert.ok(errors.every(error => typeof error.file === 'string' && error.line === 1));
    } finally {
        removeDir(root);
    }
});

test('unknown classes become warnings with allowUnknown', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, { 'index.html': '<div class="hero flex"></div>' });

        const result = compile({ sources: [root], allowUnknown: true });
        assert.equal(result.diagnostics.every(diagnostic => diagnostic.level === 'warning'), true);
        assert.match(result.css, /\.flex \{/);
    } finally {
        removeDir(root);
    }
});

test('renamed classes compile and are reported as warnings', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, { 'index.html': '<div class="marg-top-4px fwrap p-abs"></div>' });

        const result = compile({ sources: [root] });
        const warnings = result.diagnostics.filter(diagnostic => diagnostic.level === 'warning');

        assert.equal(warnings.length, 3);
        assert.match(warnings[0].message, /"marg-top-4px" is an old class name — use "margin-top-4px" instead/);
        assert.match(result.css, /\.marg-top-4px \{\n    margin-top: 4px;\n\}/);
    } finally {
        removeDir(root);
    }
});

test('the same declaration from two classes keeps both selectors', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, { 'index.html': '<div class="flex display-flex"></div>' });

        const result = compile({ sources: [root] });
        assert.match(result.css, /\.flex \{/);
        assert.match(result.css, /\.display-flex \{/);
    } finally {
        removeDir(root);
    }
});

test('writeResult writes atomically and refuses to write a broken build', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, { 'index.html': '<div class="flex"></div>' });
        const output = path.join(root, 'dist', 'stratum.css');

        const good = compile({ sources: [root] });
        assert.ok(writeResult(good, output) !== null);
        assert.match(fs.readFileSync(output, 'utf-8'), /\.flex \{/);
        assert.deepEqual(fs.readdirSync(path.join(root, 'dist')), ['stratum.css'], 'no temp files left behind');

        writeFiles(root, { 'index.html': '<div class="hero"></div>' });
        const bad = compile({ sources: [root] });
        assert.equal(writeResult(bad, output), null);
        assert.match(fs.readFileSync(output, 'utf-8'), /\.flex \{/, 'previous stylesheet is preserved');
    } finally {
        removeDir(root);
    }
});

test('formatDiagnostics includes location, level and suggestions', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, { 'index.html': '<div class="paddign-4px"></div>' });

        const result = compile({ sources: [root] });
        const lines = formatDiagnostics(result.diagnostics);

        assert.equal(lines.length, 1);
        assert.match(lines[0], /^error: .*index\.html:1: Unknown StratumSS class "paddign-4px"/);
        assert.match(lines[0], /did you mean "padding-4px"/);
    } finally {
        removeDir(root);
    }
});

test('builds are reproducible across runs', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, {
            'index.html': '<div class="flex padding-4px color-red"></div>',
            'other.html': '<div class="color-red gap-2px"></div>'
        });

        const first = compile({ sources: [root] }).css;
        const second = compile({ sources: [root] }).css;
        assert.equal(first, second);
    } finally {
        removeDir(root);
    }
});

test('scans only the extensions it is told to', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, {
            'index.html': '<div class="flex"></div>',
            'notes.txt': '<div class="padding-4px"></div>'
        });

        assert.match(compile({ sources: [root] }).css, /\.flex \{/);
        assert.doesNotMatch(compile({ sources: [root] }).css, /padding-4px/);

        const custom = compile({ sources: [root], extensions: ['txt'] });
        assert.match(custom.css, /\.padding-4px \{/);
        assert.doesNotMatch(custom.css, /\.flex \{/);
    } finally {
        removeDir(root);
    }
});

test('a single file can be used as the source', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, { 'only.html': '<div class="flex"></div>', 'ignored.html': '<div class="block"></div>' });

        const result = compile({ sources: [path.join(root, 'only.html')] });
        assert.match(result.css, /\.flex \{/);
        assert.doesNotMatch(result.css, /\.block \{/);
    } finally {
        removeDir(root);
    }
});
