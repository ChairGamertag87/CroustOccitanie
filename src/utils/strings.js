export function titleCase(s) {
    if (s == null) return s;
    return String(s)
        .toLowerCase()
        .replace(/(^|[\s'\/-])(\S)/g, (_, sep, ch) => sep + ch.toUpperCase());
}


export function codeBlock(s) {
    const clean = String(s || '').replace(/;\s*/g, '\n').replace(/\s{2,}/g, ' ').trim();
    return clean ? '```' + clean + '```' : '```(non communiqué)```';
}