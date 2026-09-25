// npx tsc
// node dist/compiler/scanner.js

import fs from 'fs'; // File System - node module

// The concept of the RegEx scanner is to make the process simpler rather than using a massive while loop
// The RegEx patterns scan the file for: class = "" class= "" class ="" and the same with single quotes

function scanFile(filePath: string) {
    const html = fs.readFileSync(filePath, 'utf-8');

    const matches = html.matchAll(classRegex);
    const classes: string[] = [];

    for (const match of matches) {
        classes.push(...match[1].split(/\s+/));
    }

    return classes;
}

const classRegex = /\bclass\s*=\s*['"](.*?)['"]/g;

const files = fs.readdirSync('examples');

const allClasses: string[] = [];

for (const file of files) {
    if (!file.endsWith('.html')) {
        continue;
    }

    const filePath = `examples/${file}`;
    const fileClasses = scanFile(filePath);

    allClasses.push(...fileClasses);
}

const uniqueClasses = [...new Set(allClasses)];

console.log(uniqueClasses);