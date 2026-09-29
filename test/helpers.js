import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));

/** Absolute path to the built CLI. */
export const cliPath = path.join(here, '..', 'dist', 'compiler', 'cli.js');

/** Absolute path to the built public API. */
export const apiPath = path.join(here, '..', 'dist', 'index.js');

/** Creates a temporary directory and returns its absolute path. */
export function makeTempDir(prefix = 'stratumss-test-') {
    return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Removes a temporary directory recursively. */
export function removeDir(directory) {
    fs.rmSync(directory, { recursive: true, force: true });
}

/** Writes files into a directory, creating parent folders as needed. */
export function writeFiles(root, files) {
    for (const [relative, contents] of Object.entries(files)) {
        const target = path.join(root, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, contents, 'utf-8');
    }
}
