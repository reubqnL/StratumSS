# StratumSS

A human-readable CSS framework built around clear, explicit utility classes.

StratumSS is a utility-first CSS framework with a build-time compiler. It scans source files, understands StratumSS classes, and generates only the CSS that is actually used.

## Current v1 compiler

- Recursive `.html`, `.php`, and `.css` scanning
- Class extraction
- Duplicate removal
- Static and dynamic utility parsing
- CSS selector escaping
- CSS value validation
- CLI build command
- Configurable source and output paths
- Help and version commands
- Unknown-class errors

## Development

```bash
npm install
npm run build
node dist/compiler/index.js build ./examples
```

Or:

```bash
node dist/compiler/index.js build ./examples --output ./dist/stratum.css
```

## Intended published usage

```bash
npx stratumss build
```

## Architecture

```text
Source files
    ↓
Scanner
    ↓
Parser
    ↓
Generator
    ↓
CSS output
```

## License

MIT
