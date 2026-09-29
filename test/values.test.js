import assert from 'node:assert/strict';
import test from 'node:test';

import { assertSafeValue, parseClass, validateValue, ValueSyntaxError } from '../dist/index.js';

const invalid = (name, pattern) => {
    assert.throws(() => parseClass(name), error => {
        assert.match(error.message, pattern, `${name} should be rejected`);
        return true;
    }, `${name} should have been rejected`);
};

test('lengths accept units and length keywords', () => {
    for (const value of ['0', '1px', '1.5rem', '50%', '100vh', '10dvh', '4ch', '2fr', 'auto', 'min-content', 'fit-content', '-4px']) {
        assert.doesNotThrow(() => validateValue('length', value), value);
    }

    for (const value of ['4p', 'px', '4 p', '100pct']) {
        assert.throws(() => validateValue('length', value), ValueSyntaxError, value);
    }
});

test('numbers and integers are checked separately', () => {
    assert.doesNotThrow(() => validateValue('number', '1'));
    assert.doesNotThrow(() => validateValue('number', '1.5'));
    assert.doesNotThrow(() => validateValue('number', '50%'));
    assert.throws(() => validateValue('number', '1px'), ValueSyntaxError);

    assert.doesNotThrow(() => validateValue('integer', '10'));
    assert.doesNotThrow(() => validateValue('integer', '-2'));
    assert.throws(() => validateValue('integer', '1.5'), ValueSyntaxError);
    assert.throws(() => validateValue('integer', 'ten'), ValueSyntaxError);
});

test('colours accept names, hex and functions', () => {
    for (const value of ['red', 'rebeccapurple', 'transparent', 'currentColor', '#fff', '#3b82f6', '#3b82f680', 'rgb(1,2,3)', 'oklch(0.7 0.1 200)']) {
        assert.doesNotThrow(() => validateValue('color', value), value);
    }

    assert.throws(() => validateValue('color', 'not-a-colour'), ValueSyntaxError);
    assert.throws(() => validateValue('color', '#12345'), ValueSyntaxError);
});

test('enums reject values outside their list', () => {
    assert.doesNotThrow(() => validateValue('enum', 'center', ['center', 'left']));
    assert.throws(() => validateValue('enum', 'centre', ['center', 'left']), ValueSyntaxError);
});

test('values the compiler cannot reason about are always accepted', () => {
    // CSS-wide keywords and var() references are marked dynamic: they can only
    // be resolved by the browser, so they are never rejected.
    for (const value of ['var(--brand)', 'inherit', 'unset', 'revert-layer']) {
        assert.doesNotThrow(() => validateValue('length', value), value);
        assert.equal(validateValue('length', value).dynamic, true, value);
    }

    for (const value of ['calc(100% - 2rem)', 'min(10px, 4vw)', '4px']) {
        assert.doesNotThrow(() => validateValue('length', value), value);
        assert.equal(validateValue('length', value).dynamic, false, value);
    }
});

test('value validation cannot be used to inject CSS', () => {
    const attacks = [
        'red}body{display:none',
        'red;background:blue',
        'red/*',
        'red\\',
        'red\npadding:1px',
        'red\u0000'
    ];

    for (const attack of attacks) {
        assert.throws(() => assertSafeValue(attack), attack);
        invalid(`color-${attack.replace(/\s/g, '')}`, /Invalid|Unsafe|empty/);
    }
});

test('multi-part values join with a space and validate every part', () => {
    assert.equal(validateValue('length', '10px_20px').value, '10px 20px');
    assert.equal(validateValue('color', 'red_blue').value, 'red blue');
    assert.throws(() => validateValue('color', 'red_notacolour'), ValueSyntaxError);
});

test('empty values are rejected', () => {
    assert.throws(() => assertSafeValue(''));
    assert.throws(() => parseClass('padding-'), /value is required/);
});

test('arbitrary-value utilities still refuse structural characters', () => {
    assert.doesNotThrow(() => parseClass('transform-translateX(4px)'));
    assert.doesNotThrow(() => parseClass('box-shadow-0_1px_2px_#0003'));
    assert.throws(() => parseClass('transform-translateX(4px)}'));
    assert.throws(() => parseClass('box-shadow-0;color:red'));
});
