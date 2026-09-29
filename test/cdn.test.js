import assert from 'node:assert/strict';
import test from 'node:test';

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFINITIONS, escapeCSSIdentifier, extractClasses, generateCSS, parseClass } from '../dist/index.js';

/**
 * Guards on cdn/: the stylesheet that lets a page use StratumSS with a single
 * <link> and no compiler. It is generated, so the only thing to verify is that the
 * committed copy still matches the utility table and still styles its own demo.
 */

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function valueFreeNames() {
    const names = new Set();

    for (const definition of DEFINITIONS) {
        if (definition.kind === 'enum') {
            for (const value of definition.values ?? []) {
                names.add(`${definition.name}-${value}`);
            }
        }
        for (const alias of Object.keys(definition.aliases ?? {})) {
            names.add(alias);
        }
    }

    return [...names];
}

test('cdn/ exists and is up to date with the utility table', () => {
    const parsed = valueFreeNames().map(name => parseClass(name));
    assert.ok(parsed.length > 300, 'the value-free catalogue should not be tiny');

    for (const name of ['stratum.css', 'stratum.min.css']) {
        const file = path.join(root, 'cdn', name);
        assert.ok(existsSync(file), `cdn/${name} is missing - run npm run cdn`);
        const committed = readFileSync(file, 'utf8');
        const fresh = generateCSS(parsed, name.endsWith('.min.css') ? { minify: true } : {});
        assert.ok(committed.endsWith(fresh), `cdn/${name} is stale - run npm run cdn`);
    }
});

test('every class in the no-build demo is styled by cdn/stratum.css', () => {
    const source = readFileSync(path.join(root, 'examples', 'cdn.html'), 'utf8');
    const css = readFileSync(path.join(root, 'cdn', 'stratum.css'), 'utf8');
    const valueFree = new Set(valueFreeNames());
    const used = extractClasses(source, 'examples/cdn.html');

    assert.ok(used.length > 40, `the demo should exercise the catalogue, found ${used.length} classes`);

    for (const { className, line } of used) {
        assert.ok(valueFree.has(className),
            `examples/cdn.html:${line}: "${className}" carries a value, so cdn/stratum.css cannot contain it`);
        assert.ok(css.includes(`.${escapeCSSIdentifier(className)} {`),
            `examples/cdn.html:${line}: "${className}" has no rule in cdn/stratum.css`);
    }
});

test('the demo page links the stylesheet by relative path', () => {
    const source = readFileSync(path.join(root, 'examples', 'cdn.html'), 'utf8');
    assert.match(source, /<link rel="stylesheet" href="\.\.\/cdn\/stratum\.css">/);
    assert.ok(!/<style/.test(source), 'the demo must prove a <link> alone is enough');
});
