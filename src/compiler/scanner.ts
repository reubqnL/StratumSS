// npx tsc
// node dist/compiler/scanner.js

import fs from 'fs'; // File System - node module

const classRegex = /\bclass\s*=\s*['"](.*?)['"]/g; // Complicated RegEx

// The concept of the RegEx scanner is  to make the process simpler rather than using a massive while loop
// Tne RegEx patterns scan the file for: class = "" class= "" class ="" and the same with single quotes

const html = fs.readFileSync('examples/index.html', 'utf-8');
console.log(html);
const matches = html.matchAll(classRegex);
const classes: string[] = [];

for (const match of matches) {
    classes.push(...match[1].split(/\s+/));
}

const uniqueClasses = [...new Set(classes)];
console.log(uniqueClasses);