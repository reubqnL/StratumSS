/**
 * Fuzzy matching helpers, used to turn dead-end error messages
 * ("unknown option", "unknown class") into actionable ones.
 */

/** Levenshtein distance between two strings. */
export function editDistance(a: string, b: string): number {
    const rows = a.length + 1;
    const cols = b.length + 1;
    let previous = Array.from({ length: cols }, (_, index) => index);

    for (let i = 1; i < rows; i++) {
        const current = [i];
        for (let j = 1; j < cols; j++) {
            current[j] = Math.min(
                previous[j] + 1,
                current[j - 1] + 1,
                previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
            );
        }
        previous = current;
    }

    return previous[cols - 1];
}

function sharedPrefixLength(a: string, b: string): number {
    const limit = Math.min(a.length, b.length);
    let index = 0;
    while (index < limit && a[index].toLowerCase() === b[index].toLowerCase()) index++;
    return index;
}

/**
 * Picks the closest candidates to `input`, preferring small edit distances and
 * shared prefixes. Matching is case-insensitive.
 */
export function suggestFrom(candidates: readonly string[], input: string, limit = 3): string[] {
    const needle = input.toLowerCase();
    const scored: Array<{ name: string; score: number }> = [];

    for (const candidate of candidates) {
        const name = candidate.toLowerCase();
        const distance = editDistance(needle, name);
        const shared = sharedPrefixLength(needle, name);
        const score = distance - Math.min(shared, 8) * 0.6;

        // A single edit is always worth suggesting; larger distances only when
        // the names visibly start the same way, so "card" never suggests "grid".
        if (distance <= 1 || (distance <= 3 && shared >= 3) || shared >= 5) {
            scored.push({ name: candidate, score });
        }
    }

    scored.sort((a, b) => a.score - b.score || a.name.localeCompare(b.name));
    return scored.slice(0, limit).map(entry => entry.name);
}
