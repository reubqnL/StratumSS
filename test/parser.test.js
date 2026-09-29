import assert from 'node:assert/strict';
import test from 'node:test';

import {
    DEFINITIONS,
    InvalidUtilityValueError,
    UnknownUtilityError,
    listUtilityClasses,
    listUtilityNames,
    parseClass
} from '../dist/index.js';

const decl = name => {
    const parsed = parseClass(name);
    return `${parsed.property}: ${parsed.value}`;
};

test('parses static display utilities', () => {
    assert.equal(decl('flex'), 'display: flex');
    assert.equal(decl('block'), 'display: block');
    assert.equal(decl('inline-flex'), 'display: inline-flex');
    assert.equal(decl('grid'), 'display: grid');
    assert.equal(decl('display-grid'), 'display: grid');
    assert.equal(decl('none'), 'display: none');
});

test('parses dynamic values for every documented utility', () => {
    assert.equal(decl('width-437px'), 'width: 437px');
    assert.equal(decl('height-100%'), 'height: 100%');
    assert.equal(decl('min-width-0'), 'min-width: 0');
    assert.equal(decl('gap-20px'), 'gap: 20px');
    assert.equal(decl('font-size-32px'), 'font-size: 32px');
    assert.equal(decl('line-height-1.5'), 'line-height: 1.5');
    assert.equal(decl('color-black'), 'color: black');
    assert.equal(decl('color-#3b82f6'), 'color: #3b82f6');
    assert.equal(decl('opacity-50%'), 'opacity: 50%');
    assert.equal(decl('z-index-10'), 'z-index: 10');
    assert.equal(decl('order-2'), 'order: 2');
    assert.equal(decl('cursor-pointer'), 'cursor: pointer');
});

// The pre-1.1 parser emitted `position: top:10px` for these.
test('position offsets map to their own property', () => {
    assert.equal(decl('top-10px'), 'top: 10px');
    assert.equal(decl('right-4px'), 'right: 4px');
    assert.equal(decl('bottom-0'), 'bottom: 0');
    assert.equal(decl('left-8px'), 'left: 8px');
    assert.equal(decl('inset-0'), 'inset: 0');
    assert.equal(decl('inset-block-2px'), 'inset-block: 2px');
    assert.equal(decl('inset-inline-start-4px'), 'inset-inline-start: 4px');
    assert.equal(decl('inset-block-end-1px'), 'inset-block-end: 1px');
});

// The pre-1.1 parser emitted `margin: top-4px` for these.
test('directional spacing resolves the most specific utility', () => {
    assert.equal(decl('margin-4px'), 'margin: 4px');
    assert.equal(decl('margin-top-4px'), 'margin-top: 4px');
    assert.equal(decl('margin-right-4px'), 'margin-right: 4px');
    assert.equal(decl('margin-bottom-4px'), 'margin-bottom: 4px');
    assert.equal(decl('margin-left-4px'), 'margin-left: 4px');
    assert.equal(decl('margin-inline-4px'), 'margin-inline: 4px');
    assert.equal(decl('margin-inline-start-4px'), 'margin-inline-start: 4px');
    assert.equal(decl('margin-block-end-4px'), 'margin-block-end: 4px');
    assert.equal(decl('padding-block-start-4px'), 'padding-block-start: 4px');
});

test('logical axis shorthands expand', () => {
    assert.equal(decl('margin-x-1rem'), 'margin-inline: 1rem');
    assert.equal(decl('margin-y-auto'), 'margin-block: auto');
    assert.equal(decl('padding-x-2rem'), 'padding-inline: 2rem');
    assert.equal(decl('padding-y-0'), 'padding-block: 0');
    assert.equal(decl('gap-x-2rem'), 'column-gap: 2rem');
    assert.equal(decl('gap-y-8px'), 'row-gap: 8px');
    assert.equal(decl('border-radius-top-left-8px'), 'border-top-left-radius: 8px');
});

test('human-readable alignment aliases map to the CSS keywords', () => {
    assert.equal(decl('content-horizontal-center'), 'justify-content: center');
    assert.equal(decl('content-horizontal-between'), 'justify-content: space-between');
    assert.equal(decl('items-vertical-center'), 'align-items: center');
    assert.equal(decl('items-vertical-start'), 'align-items: flex-start');
    assert.equal(decl('content-vertical-stretch'), 'align-content: stretch');
    assert.equal(decl('self-vertical-end'), 'align-self: flex-end');
    assert.equal(decl('items-horizontal-center'), 'justify-items: center');
    assert.equal(decl('self-horizontal-stretch'), 'justify-self: stretch');
});

test('underscores become spaces so shorthands are expressible', () => {
    assert.equal(decl('padding-10px_20px'), 'padding: 10px 20px');
    assert.equal(decl('border-1px_solid_red'), 'border: 1px solid red');
    assert.equal(decl('font-family-Inter,_sans-serif'), 'font-family: Inter, sans-serif');
    assert.equal(decl('grid-template-columns-1fr_1fr'), 'grid-template-columns: 1fr 1fr');
});

test('negative values are explicit and restricted to where CSS allows them', () => {
    assert.equal(decl('margin-left-neg-4px'), 'margin-left: -4px');
    assert.equal(decl('margin-left--4px'), 'margin-left: -4px');
    assert.equal(decl('top-neg-2rem'), 'top: -2rem');
    assert.equal(decl('letter-spacing-neg-0.02em'), 'letter-spacing: -0.02em');
    assert.throws(() => parseClass('padding-neg-4px'), InvalidUtilityValueError);
    assert.throws(() => parseClass('width-neg-10px'), InvalidUtilityValueError);
});

test('a trailing ! marks the declaration important', () => {
    const parsed = parseClass('color-black!');
    assert.equal(parsed.value, 'black !important');
    assert.equal(parsed.important, true);
    assert.equal(parsed.className, 'color-black!');
});

test('unknown classes raise UnknownUtilityError with suggestions', () => {
    assert.throws(() => parseClass('hero'), error => {
        assert.ok(error instanceof UnknownUtilityError);
        assert.match(error.message, /Unknown StratumSS class "hero"/);
        return true;
    });

    assert.throws(() => parseClass('posittion-absolute'), error => {
        assert.ok(error instanceof UnknownUtilityError);
        assert.equal(error.suggestions[0], 'position-absolute');
        return true;
    });

    // Suggestions keep the value the author typed and fix only the utility name.
    assert.throws(() => parseClass('paddign-4px'), error => {
        assert.ok(error instanceof UnknownUtilityError);
        assert.equal(error.suggestions[0], 'padding-4px');
        return true;
    });

    // A name that merely looks like nothing in the table gets no wrong guesses.
    assert.throws(() => parseClass('card'), error => {
        assert.ok(error instanceof UnknownUtilityError);
        assert.deepEqual(error.suggestions, []);
        return true;
    });
});

test('near-miss enum values are reported as invalid values, not unknown classes', () => {
    assert.throws(() => parseClass('vertical-align-midle'), error => {
        assert.ok(error instanceof InvalidUtilityValueError);
        assert.match(error.message, /vertical-align-middle/);
        return true;
    });

    assert.throws(() => parseClass('display-flerp'), error => {
        assert.ok(error instanceof InvalidUtilityValueError);
        assert.match(error.message, /display-flex/);
        return true;
    });
});

test('invalid dynamic values are rejected with a helpful message', () => {
    assert.throws(() => parseClass('padding-4p'), error => {
        assert.ok(error instanceof InvalidUtilityValueError);
        assert.match(error.message, /valid length/);
        return true;
    });
});

test('renamed pre-1.1 class names still compile and are flagged', () => {
    const cases = [
        ['marg-4px', 'margin: 4px'],
        ['marg-top-4px', 'margin-top: 4px'],
        ['pad-in-start-4px', 'padding-inline-start: 4px'],
        ['fgrow-1', 'flex-grow: 1'],
        ['fwrap', 'flex-wrap: wrap'],
        ['p-abs', 'position: absolute'],
        ['zindex-10', 'z-index: 10'],
        ['insetin-4px', 'inset-inline: 4px'],
        ['flex-inline', 'display: inline-flex'],
        ['fdirection-col', 'flex-direction: column']
    ];

    for (const [legacy, expected] of cases) {
        const parsed = parseClass(legacy);
        assert.equal(`${parsed.property}: ${parsed.value}`, expected, legacy);
        assert.equal(parsed.renamedFrom, legacy);
        assert.equal(parsed.className, legacy);
    }
});

test('every declared utility resolves, including aliases and enum values', () => {
    for (const definition of DEFINITIONS) {
        const sample = definition.kind === 'enum' ? undefined : seedValue(definition.kind);

        if (sample !== undefined) {
            const parsed = parseClass(`${definition.name}-${sample}`);
            assert.equal(parsed.property, definition.property, definition.name);
        }

        for (const value of definition.values ?? []) {
            const parsed = parseClass(`${definition.name}-${value}`);
            assert.equal(parsed.property, definition.property, `${definition.name}-${value}`);
        }

        for (const alias of Object.keys(definition.aliases ?? {})) {
            const parsed = parseClass(alias);
            assert.equal(parsed.property, definition.property, alias);
        }

        for (const prefixAlias of Object.keys(definition.prefixAliases ?? {})) {
            const target = definition.prefixAliases[prefixAlias];
            const parsed = parseClass(`${prefixAlias}${sample ?? '1'}`);
            assert.ok(parsed.property.length > 0, target);
        }
    }
});

function seedValue(kind) {
    switch (kind) {
        case 'length': return '10px';
        case 'number': return '1';
        case 'integer': return '1';
        case 'color': return 'black';
        case 'keyword': return 'solid';
        case 'raw': return '1px_solid_black';
        default: return undefined;
    }
}

test('catalogue helpers expose concrete and placeholder names', () => {
    const names = listUtilityNames();
    assert.ok(names.includes('padding-<length>'));
    assert.ok(names.includes('content-horizontal-center'));

    const classes = listUtilityClasses();
    assert.ok(classes.some(entry => entry.className === 'align-items-center'));
    assert.ok(classes.every(entry => typeof entry.group === 'string' && entry.group.length > 0));
});

test('parsing is deterministic', () => {
    const first = parseClass('padding-inline-start-4px');
    const second = parseClass('padding-inline-start-4px');
    assert.deepEqual(first, second);
});

test('whitespace around a class name is tolerated', () => {
    assert.equal(decl('  flex\n'), 'display: flex');
});
