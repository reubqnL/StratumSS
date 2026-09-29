import fs from 'fs';
import path from 'path';

import { parseClasses } from './parser.js';
import { generateCSS } from './generator.js';

const SUPPORTED_EXTENSIONS = new Set(['.html', '.php', '.css']);

function scanFile(filePath: string): string[] {
    const source = fs.readFileSync(filePath, 'utf-8');
    const classRegex = /\bclass\s*=\s*['"](.*?)['"]/gs;
    const classes: string[] = [];

    for (const match of source.matchAll(classRegex)) {
        const classAttribute = match[1].trim();
        if (classAttribute === '') continue;
        classes.push(...classAttribute.split(/\s+/));
    }

    return classes;
}

function scanDirectory(directory: string): string[] {
    const classes: string[] = [];
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            classes.push(...scanDirectory(entryPath));
            continue;
        }
        if (!entry.isFile()) continue;

        const extension = path.extname(entry.name).toLowerCase();
        if (!SUPPORTED_EXTENSIONS.has(extension)) continue;
        classes.push(...scanFile(entryPath));
    }

    return classes;
}

export function scan(directory: string): string[] {
    return [...new Set(scanDirectory(directory))];
}

export function compile(directory: string): string {
    return generateCSS(parseClasses(scan(directory)));
}
