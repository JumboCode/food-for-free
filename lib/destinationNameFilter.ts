export function normalizeDestinationName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

export function uniqueNormalizedNames(values: string[]): string[] {
    const byNormalized = new Map<string, string>();
    for (const value of values) {
        const trimmed = value.trim();
        if (!trimmed) continue;
        const normalized = normalizeDestinationName(trimmed);
        if (!normalized) continue;
        if (!byNormalized.has(normalized)) {
            byNormalized.set(normalized, trimmed);
        }
    }
    return [...byNormalized.values()];
}

export function readDestinationNames(searchParams: URLSearchParams): string[] {
    const raw = [
        ...searchParams.getAll('destinationName'),
        ...searchParams.getAll('destinationNames').flatMap(value => value.split(',')),
    ];
    return uniqueNormalizedNames(raw);
}
