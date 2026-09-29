import assert from 'node:assert/strict';
import test from 'node:test';

import { generateCSS, parseClass, escapeCSSIdentifier } from '../dist/index.js';

const rule = (name, options) => generateCSS([parseClass(name)], options);

test('renders a rule per class', () => {
    assert.equal(rule('padding-8px'), '.padding-8px {\n    padding: 8px;\n}\n');
});

test('declarations are sorted by cascade rank, then alphabetically', () => {
    const css = generateCSS([
        parseClass('color-red'),
        parseClass('padding-4px'),
        parseClass('display-flex'),
        parseClass('margin-top-2px'),
        parseClass('padding-2px')
    ]);

    const order = [...css.matchAll(/^\.([\w-]+)/gm)].map(match => match[1]);
    assert.equal(order[0], 'display-flex', 'layout first');
    assert.equal(order.at(-1), 'color-red', 'colour last');
    assert.ok(order.indexOf('padding-2px') < order.indexOf('padding-4px'), 'alphabetical within a rank');
    assert.ok(order.indexOf('margin-top-2px') < order.indexOf('padding-2px'), 'ranks are ordered');
});

test('longhands sort before their shorthands, so more specific utilities win', () => {
    const css = generateCSS([
        parseClass('padding-4px'),
        parseClass('padding-block-8px'),
        parseClass('padding-inline-start-2px')
    ]);

    const order = [...css.matchAll(/^\.([\w-]+)/gm)].map(match => match[1]);
    assert.deepEqual(order, ['padding-4px', 'padding-block-8px', 'padding-inline-start-2px']);
});

test('output is deterministic regardless of input order', () => {
    const first = generateCSS([parseClass('color-red'), parseClass('padding-4px'), parseClass('flex')]);
    const second = generateCSS([parseClass('flex'), parseClass('padding-4px'), parseClass('color-red')]);
    assert.equal(first, second);
});

test('duplicate classes are emitted once', () => {
    const css = generateCSS([parseClass('flex'), parseClass('flex'), parseClass('flex')]);
    assert.equal(css.match(/\.flex /g).length, 1);
});

test('classes with the same declaration keep their own selectors', () => {
    const css = generateCSS([parseClass('flex'), parseClass('display-flex')]);
    assert.match(css, /\.flex \{/);
    assert.match(css, /\.display-flex \{/);
});

test('escapes identifiers that are not valid CSS selectors', () => {
    assert.equal(escapeCSSIdentifier('flex'), 'flex');
    assert.equal(escapeCSSIdentifier('-m-4'), '-m-4');

    // A leading digit must be escaped: `.2xl` is not a valid selector, `.\32 xl` is.
    assert.equal(escapeCSSIdentifier('2xl'), '\\32 xl');
    assert.equal(escapeCSSIdentifier('2'), '\\32 ');

    // A minus followed by a digit is also invalid at the start of an identifier.
    assert.equal(escapeCSSIdentifier('-2xl'), '-\\32 xl');

    // Percentages and other punctuation used by the value syntax.
    assert.equal(escapeCSSIdentifier('width-50%'), 'width-50\\%');
    assert.equal(escapeCSSIdentifier('w-1.5'), 'w-1\\.5');
    assert.equal(escapeCSSIdentifier('grid-1/2'), 'grid-1\\/2');
    assert.equal(escapeCSSIdentifier(''), '\\0 ');
});

test('percent values produce a valid, escaped selector', () => {
    const css = rule('width-50%');
    assert.equal(css, '.width-50\\% {\n    width: 50%;\n}\n');
    assert.doesNotThrow(() => new RegExp('^\\.width-50\\\\% \\{'));
});

test('important classes keep their mark but write the declaration once', () => {
    const css = rule('color-black!');
    assert.equal(css, '.color-black\\! {\n    color: black !important;\n}\n');
});

test('optional banner and minification', () => {
    const banner = '/*! StratumSS */';
    const pretty = rule('flex', { header: banner });
    assert.match(pretty, /^\/\*! StratumSS \*\/\n\n\.flex \{/);

    const minified = rule('flex', { minify: true });
    assert.equal(minified, '.flex{display:flex;}');

    const minifiedWithBanner = rule('flex', { minify: true, header: banner });
    assert.equal(minifiedWithBanner, '/*! StratumSS */.flex{display:flex;}');
});

test('empty input produces empty output', () => {
    assert.equal(generateCSS([]), '');
    assert.equal(generateCSS([], { minify: true }), '');
});

test('values can never break out of the declaration', () => {
    // The parser rejects these long before the generator runs.
    assert.throws(() => parseClass('width-100px}body{'));
    assert.throws(() => parseClass('color-red;background:blue'));
});
