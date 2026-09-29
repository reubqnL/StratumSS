#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import process from 'process';

import { compile } from './scanner.js';

const VERSION = '1.0.0';

function printHelp(): void {
    console.log(`
StratumSS ${VERSION}

Usage:
  stratumss build [source] [options]

Commands:
  build              Scan source files and generate CSS.
  help               Show this help message.
  --help             Show this help message.
  --version          Show the installed StratumSS version.

Options:
  --output <file>    Output CSS file. Default: ./dist/stratum.css
`);
}

function getOption(args: string[], name: string): string | undefined {
    const index = args.indexOf(name);

    if (index === -1) {
        return undefined;
    }

    const value = args[index + 1];

    if (!value || value.startsWith('--')) {
        throw new Error(`Missing value for ${name}.`);
    }

    return value;
}

function runBuild(args: string[]): void {
    const positional: string[] = [];

    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--output') {
            i++;
            continue;
        }

        if (!args[i].startsWith('--')) {
            positional.push(args[i]);
        }
    }
    const sourceArgument = positional[0] ?? '.';
    const outputArgument = getOption(args, '--output') ?? './dist/stratum.css';

    if (positional.length > 1) {
        throw new Error(`Unexpected argument: ${positional[1]}`);
    }

    const sourceDirectory = path.resolve(sourceArgument);
    const outputFile = path.resolve(outputArgument);

    if (!fs.existsSync(sourceDirectory)) {
        throw new Error(`Source directory does not exist: ${sourceDirectory}`);
    }

    if (!fs.statSync(sourceDirectory).isDirectory()) {
        throw new Error(`Source path is not a directory: ${sourceDirectory}`);
    }

    const css = compile(sourceDirectory);

    fs.mkdirSync(path.dirname(outputFile), { recursive: true });
    fs.writeFileSync(outputFile, css, 'utf-8');

    console.log('StratumSS built successfully.');
    console.log(`Source: ${sourceDirectory}`);
    console.log(`Output: ${outputFile}`);
}

function main(): void {
    const args = process.argv.slice(2);
    const command = args[0];

    if (!command || command === 'help' || command === '--help' || command === '-h') {
        printHelp();
        return;
    }

    if (command === '--version' || command === '-v') {
        console.log(VERSION);
        return;
    }

    if (command === 'build') {
        runBuild(args.slice(1));
        return;
    }

    throw new Error(`Unknown command: ${command}`);
}

try {
    main();
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`StratumSS error: ${message}`);
    process.exit(1);
}
