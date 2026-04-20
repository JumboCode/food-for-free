/**
 * Colors for overview “Food Types Donated” and “Processing Breakdown” donuts.
 * Keep in sync with usage in `/api/overview/food-types` and distribution tag chips.
 */
export const FOOD_TYPE_DONUT_COLORS = [
    '#B7D7BD',
    '#6CAEE6',
    '#F9DC70',
    '#E7A54E',
    '#F4A6B8',
    '#B39DDB',
] as const;

const FOOD_TYPE_FIXED_COLOR_BY_LABEL: Record<string, string> = {
    produce: '#B7D7BD',
    vegetables: '#B7D7BD',
    fruit: '#B7D7BD',
    'misc. cold': '#6CAEE6',
    'misc cold': '#6CAEE6',
    protein: '#6CAEE6',
    'frozen meat': '#F9DC70',
    dairy: '#F9DC70',
    grain: '#E7A54E',
    grains: '#E7A54E',
    'dry goods': '#E7A54E',
    prepared: '#F4A6B8',
    other: '#B39DDB',
};

/** Theme colors for overview processing donut. */
export const PROCESSING_OVERVIEW_COLOR_BY_LABEL: Record<string, string> = {
    'Minimally Processed': '#B7D7BD',
    Processed: '#FAC87D',
    'Not Specified': '#64748B',
};

/** Distribution chip colors: distinct from food-type chips and consistent. */
export const PROCESSING_DISTRIBUTION_COLOR_BY_LABEL: Record<string, string> = {
    'Minimally Processed': '#A78BFA',
    Processed: '#E11D48',
    'Not Specified': '#64748B',
};

export type FoodTypeCompositionEntry = { label: string; value: number; color: string };

/** Donut placeholder when there is no data in range. */
export const COMPOSITION_EMPTY_SEGMENT_COLOR = '#CBD5E1';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
    };
}

/**
 * Tag chip styles derived from a donut segment color (matches legend text: slate-800).
 */
export function chipStyleFromDonutHex(hex: string): {
    backgroundColor: string;
    borderColor: string;
    color: string;
} {
    const { r, g, b } = hexToRgb(hex);
    return {
        backgroundColor: `rgba(${r}, ${g}, ${b}, 0.42)`,
        borderColor: `rgba(${r}, ${g}, ${b}, 0.85)`,
        color: '#0f172a',
    };
}

export function foodTypeFallbackHex(label: string): string {
    let h = 0;
    for (let i = 0; i < label.length; i += 1) {
        h = (h * 31 + label.charCodeAt(i)) | 0;
    }
    return FOOD_TYPE_DONUT_COLORS[Math.abs(h) % FOOD_TYPE_DONUT_COLORS.length];
}

export function foodTypeFixedHex(label: string): string {
    const key = label.trim().toLowerCase();
    return FOOD_TYPE_FIXED_COLOR_BY_LABEL[key] ?? foodTypeFallbackHex(label);
}

export function foodTypeColorLookupFromComposition(
    foodTypes: FoodTypeCompositionEntry[]
): Map<string, string> {
    const m = new Map<string, string>();
    for (const ft of foodTypes) {
        if (ft.label === 'No data') continue;
        m.set(ft.label.trim().toLowerCase(), ft.color);
    }
    return m;
}

/** Same default label as food-types API when `productType` is null. */
export function foodTypeLabelForRow(productType: string | null | undefined): string {
    return productType?.trim() || 'Other';
}

export function resolveFoodTypeDonutHex(
    productType: string | null | undefined,
    lookup: Map<string, string>
): string {
    const label = foodTypeLabelForRow(productType);
    return lookup.get(label.toLowerCase()) ?? foodTypeFixedHex(label);
}

export function processingDisplayLabel(minimallyProcessedFood: boolean | null): string {
    if (minimallyProcessedFood === true) return 'Minimally Processed';
    if (minimallyProcessedFood === false) return 'Processed';
    return 'Not Specified';
}

export function processingChipStyle(minimallyProcessedFood: boolean | null): {
    backgroundColor: string;
    borderColor: string;
    color: string;
} {
    const label = processingDisplayLabel(minimallyProcessedFood);
    const hex = PROCESSING_DISTRIBUTION_COLOR_BY_LABEL[label];
    return chipStyleFromDonutHex(hex);
}
