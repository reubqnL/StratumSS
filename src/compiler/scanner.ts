// npx tsc
// node dist/compiler/scanner.js

import fs from 'fs'; // File System - node module

const html = fs.readFileSync('examples/index.html', 'utf-8');

let classIndex = html.indexOf('class');

const classes: string[] = [];

while (classIndex !== -1) {
    let firstQuote = html.indexOf('"', classIndex);
    let quote = '"';
    const firstSingleQuote = html.indexOf("'", classIndex);

    if (firstSingleQuote == -1 && firstQuote == -1) {
        classIndex = html.indexOf('class', classIndex + 1);
        continue;
    }

    if (firstSingleQuote != -1 && firstSingleQuote < firstQuote) {
        firstQuote = firstSingleQuote;
        quote = "'";
    }

    const secondQuote = html.indexOf(quote, firstQuote + 1);

    if (secondQuote == -1) {
        classIndex = html.indexOf('class', classIndex + 1);
        continue;
    }

    const classContent = html.slice(firstQuote + 1, secondQuote);
    const classNames = classContent.split(/\s+/);
    classes.push(...classNames)

    classIndex = html.indexOf('class', classIndex + 1);
}

const uniqueClasses = [...new Set(classes)];

console.log(uniqueClasses);