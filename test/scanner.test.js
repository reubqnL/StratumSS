import assert from 'node:assert/strict';
import test from 'node:test';

import { extractClasses, isDynamicClassToken, listFiles } from '../dist/index.js';
import { makeTempDir, removeDir, writeFiles } from './helpers.js';

const names = source => extractClasses(source).map(occurrence => occurrence.className);

test('extracts classes from every quoting style', () => {
    assert.deepEqual(names('<div class="flex block">'), ['flex', 'block']);
    assert.deepEqual(names("<div class='flex block'>"), ['flex', 'block']);
    assert.deepEqual(names('<div class=flex>'), ['flex']);
    assert.deepEqual(names('<div className="flex block">'), ['flex', 'block']);
});

test('reports the line a class was found on', () => {
    const source = ['<div>', '  <p class="padding-4px">', '    <span class="color-red">'].join('\n');
    assert.deepEqual(extractClasses(source, 'index.html'), [
        { className: 'padding-4px', file: 'index.html', line: 2 },
        { className: 'color-red', file: 'index.html', line: 3 }
    ]);
});

test('ignores text that merely mentions a class attribute', () => {
    // The pre-1.1 scanner matched `class=` anywhere, including prose and scripts.
    const source = [
        '<p>Set the class="hero" attribute to opt in.</p>',
        '<script>const html = \'<div class="script-only"></div>\';</script>',
        '<!-- <div class="commented-out"></div> -->'
    ].join('\n');

    assert.deepEqual(names(source), []);
});

test('skips class lists that are built at runtime', () => {
    assert.deepEqual(names('<div class="<?= $active ? \'on\' : \'\' ?>">'), []);
    assert.deepEqual(names('<div class={`flex ${modifier}`}>'), []);
    assert.deepEqual(names('<div :class="computed">'), []);

    assert.ok(isDynamicClassToken('<?= $x ?>'));
    assert.ok(!isDynamicClassToken('padding-4px'));
    assert.ok(!isDynamicClassToken('content-horizontal-center'));
});

test('handles multiple classes and nested quotes without losing tokens', () => {
    assert.deepEqual(
        names('<div class="flex fdirection-col gap-20px" data-x="1"><span class="color-red!">'),
        ['flex', 'fdirection-col', 'gap-20px', 'color-red!']
    );
});

test('finds files by extension and skips ignored directories', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, {
            'index.html': '<div class="flex"></div>',
            'partials/header.php': '<div class="padding-4px"></div>',
            'app/Component.jsx': '<div className="gap-2px" />',
            'node_modules/pkg/index.html': '<div class="should-not-appear"></div>',
            'dist/bundle.html': '<div class="also-not"></div>',
            '.hidden/secret.html': '<div class="hidden-too"></div>',
            'styles.css': '.hero { color: red }'
        });

        const files = listFiles([root]).map(file => file.slice(root.length + 1)).sort();

        assert.deepEqual(files, ['app/Component.jsx', 'index.html', 'partials/header.php']);
    } finally {
        removeDir(root);
    }
});

test('custom extensions and ignores are honoured', () => {
    const root = makeTempDir();

    try {
        writeFiles(root, {
            'index.html': '<div class="flex"></div>',
            'template.twig': '<div class="block"></div>'
        });

        const files = listFiles([root], { extensions: ['twig'] });
        assert.equal(files.length, 1);
        assert.match(files[0], /template\.twig$/);

        const ignored = listFiles([root], { ignoredFiles: ['index.html'] });
        assert.deepEqual(ignored.map(file => file.slice(root.length + 1)), ['template.twig']);
    } finally {
        removeDir(root);
    }
});

test('a missing path is skipped rather than crashing the scan', () => {
    assert.deepEqual(listFiles(['/definitely/not/here']), []);
});
