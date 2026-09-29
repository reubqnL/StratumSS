# Changelog

All notable changes to StratumSS are documented here. This project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0]

The first release where the compiler, the CLI and the package are considered
production ready. The utility table was rewritten; class names that were
generated incorrectly before are fixed, and old spellings still compile with a
warning.

### Fixed

- **`position` utilities emitted invalid CSS.** `top-10px` produced
  `position: top:10px`; it now produces `top: 10px`. This affected `top-*`,
  `right-*`, `bottom-*`, `left-*`, `inset-*`, `insetin-*` and `inset-block-*`.
- **Directional spacing utilities moved the wrong property.** `marg-top-4px`
  produced `margin: top-4px`; it now produces `margin-top: 4px`. The same bug
  affected every side and logical variant of `marg-*` and `pad-*`.
- **CSS selector escaping.** A leading digit was not escaped (`2xl` produced the
  invalid selector `.2xl`), and `%` was escaped with an invalid escape. Escaping
  now follows the `CSS.escape()` algorithm.
- **The scanner matched `class=` in prose, comments and scripts.** Class
  attributes are now read from real tags only, after masking comments,
  `<script>`, `<style>` and template blocks.
- **Values are validated.** `padding-4p`, `width-100pct`, `text-align-midle` and
  similar typos now fail the build with a suggestion instead of emitting a
  declaration the browser silently discards.
- **Unknown flags in the CLI were ignored** and their value was consumed as the
  source path (`stratumss build --outpu src` built the wrong directory and exited
  `0`). Unknown options are now errors.
- **Math functions could not be written at all, and a broken one was accepted.**
  A `_` was always the multi-value separator, so `width-calc(100%_-_2rem)` was
  rejected, while `width-calc(100%-2rem)` passed validation and emitted
  `width: calc(100%-2rem)` — CSS every browser discards, since `+` and `-` must be
  space-separated. An underscore inside a function is now a space, `var()`/`url()`
  names keep their underscores, and an unspaced operator is an error naming the fix.
- **`npm test` passed vacuously** with zero test files. The suite now contains 78
  tests, including an end-to-end CLI run and watch-mode coverage.
- **The published package would have had no `stratumss` command.** `bin` pointed at
  `./dist/compiler/cli.js`, and npm rejects a `./`-prefixed bin path: it prints a
  warning, removes the field from the manifest, and publishes anyway. The path is now
  `dist/compiler/cli.js`, and `test/package.test.js` guards the manifest so a dropped
  `bin`, a stale `dist/` in the tarball, or an `exports` entry pointing at a missing
  file fails the suite instead of the release.

### Added

- `stratumss list` prints the whole utility catalogue, as text or JSON.
- `--watch`, `--minify`, `--no-header`, `--allow-unknown`, `--quiet`, `--json`,
  `--exclude` and `--extensions` options.
- Build diagnostics with file, line, and "did you mean" suggestions for every
  problem in one run.
- `!` suffix for `!important`, `neg-` prefix for negative values, and `_` to
  join multi-part values (`border-1px_solid_red`).
- Logical property utilities (`margin-inline-start-*`, `inset-block-*`, …) and
  friendly aliases (`items-vertical-center`, `content-horizontal-between`).
- A public JavaScript API (`compile`, `writeResult`, `parseClass`,
  `generateCSS`, `validateValue`, `listUtilityClasses`).
- Generated reference documentation (`docs/utilities.md`), a demo page and a
  dependency-free preview server (`npm run demo`).
- `cdn/stratum.css` and `cdn/stratum.min.css`: every value-free utility in the
  catalogue — 365 rules, 20 kB, 3.3 kB gzipped — so a page can use the framework with
  one `<link>` and no Node. `npm run cdn` regenerates them from the utility table and
  `test/cdn.test.js` fails if the committed copy drifts or if the new demo
  (`examples/cdn.html`) ever uses a class the file cannot contain.
- Documented installation straight from the repository
  (`npm i -D github:reubqnL/StratumSS#v1.1.0`), which needs no registry listing:
  `prepare` builds `dist/` on install, so the CLI works from a Git dependency.

### Changed

- Utility names are now the CSS property they set. Renamed classes still compile
  and the build points at the new name:
  `marg-*` → `margin-*`, `pad-*` → `padding-*`, `fdirection-*` →
  `flex-direction-*`, `fgrow-*` → `flex-grow-*`, `fshrink-*` → `flex-shrink-*`,
  `fbasis-*` → `flex-basis-*`, `p-abs` → `position-absolute`, `zindex-*` →
  `z-index-*`, `insetin-*` → `inset-inline-*`, `fwrap`/`fnowrap`/`fwraprev` →
  `flex-wrap-*`, `flex-inline` → `inline-flex`.
- Builds are deterministic: the same input always produces byte-identical CSS.
- Output is written atomically through a temporary file and a rename.
- Stylesheets are only scanned for the extensions that can contain markup; the
  default list is HTML, PHP, Vue, Svelte, Astro, JSX/TSX and Markdown.
- `node_modules`, `.git`, `dist`, `build`, `coverage` and other generated
  directories are skipped by default.

### Infrastructure

- `npm run build` clears `dist/` before compiling, so output left over from an older
  source layout can never be packed into a release.
- `dist/` is built on install (`prepare`) and the published package contains only
  `dist/`, `docs/`, `images/`, `README.md` and `LICENSE`.
- Node 20 or newer is required.

## [1.0.0]

- Initial compiler: recursive scanning, class extraction, rule table, CLI build
  command.
