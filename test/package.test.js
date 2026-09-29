import assert from 'node:assert/strict';
import test from 'node:test';

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Guards on the manifest itself. npm rewrites package.json while packing and only
 * prints a warning when it has to correct something, so a bad field is silently
 * dropped from the published package rather than failing the publish.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));

test('the bin path is a plain relative path with no ./ prefix', () => {
    const target = pkg.bin.stratumss;
    assert.equal(target, 'dist/compiler/cli.js');
    assert.ok(!target.startsWith('./'), 'npm drops a ./-prefixed bin path and the package loses the command');
});

test('the bin target exists and is a node script', () => {
    const file = path.join(root, pkg.bin.stratumss);
    assert.ok(existsSync(file), `${pkg.bin.stratumss} is missing - run npm run build`);
    assert.match(readFileSync(file, 'utf8'), /^#!\/usr\/bin\/env node/);
});

test('every published path exists in the repository', () => {
    assert.ok(pkg.files.includes('dist'));
    for (const entry of pkg.files) {
        assert.ok(existsSync(path.join(root, entry)), `files lists ${entry}, which is not there`);
    }
    for (const [name, target] of Object.entries(pkg.exports)) {
        const value = typeof target === 'string' ? target : target.types;
        assert.ok(value.startsWith('./'), `exports["${name}"] must be ./-prefixed`);
        assert.ok(existsSync(path.join(root, value)), `exports points at missing ${value}`);
    }
});

test('the manifest describes the package consistently', () => {
    assert.equal(pkg.license, 'MIT');
    assert.equal(pkg.type, 'module');
    assert.match(pkg.engines.node, />=\s*20/);
    assert.ok(existsSync(path.join(root, 'LICENSE')));
    assert.equal(pkg.version, JSON.parse(readFileSync(path.join(root, 'package-lock.json'), 'utf8')).version,
        'package-lock.json must be regenerated after a version bump');
});

test('publish rebuilds from an empty dist and runs the suite first', () => {
    assert.match(pkg.scripts.build, /^npm run clean\s*&&\s*tsc$/,
        'tsc never prunes stale output, so a dirty dist/ gets packed into the release');
    assert.equal(pkg.scripts.prepublishOnly, 'npm test');
    assert.equal(pkg.scripts.prepare, 'npm run build');
});

test('the package has no runtime dependencies and never lists itself', () => {
    // `npm i -D github:reubqnL/StratumSS` run inside this repo adds stratumss to its
    // own manifest, which would publish a package that depends on itself.
    assert.deepEqual(pkg.dependencies ?? {}, {}, 'the framework ships no runtime deps');

    const declared = {
        ...(pkg.devDependencies ?? {}),
        ...(pkg.peerDependencies ?? {}),
        ...(pkg.optionalDependencies ?? {})
    };
    assert.ok(!Object.keys(declared).includes(pkg.name),
        `${pkg.name} must not appear in its own dependency lists - undo the self-install`);
});

