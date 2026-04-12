import { describe, expect, it } from 'vitest';

import {
    chipStyleFromDonutHex,
    foodTypeColorLookupFromComposition,
    foodTypeLabelForRow,
    processingChipStyle,
    processingDisplayLabel,
    resolveFoodTypeDonutHex,
} from '~/lib/chartCompositionColors';

describe('chart composition colors', () => {
    it('derives chip colors from a donut hex color', () => {
        expect(chipStyleFromDonutHex('#B7D7BD')).toEqual({
            backgroundColor: 'rgba(183, 215, 189, 0.42)',
            borderColor: 'rgba(183, 215, 189, 0.85)',
            color: '#0f172a',
        });
    });

    it('normalizes null or blank product type labels', () => {
        expect(foodTypeLabelForRow(null)).toBe('Other');
        expect(foodTypeLabelForRow('   ')).toBe('Other');
        expect(foodTypeLabelForRow('Produce')).toBe('Produce');
    });

    it('uses explicit API-provided color when available', () => {
        const lookup = foodTypeColorLookupFromComposition([
            { label: 'Produce', value: 42, color: '#123456' },
        ]);
        expect(resolveFoodTypeDonutHex('Produce', lookup)).toBe('#123456');
    });

    it('maps processing booleans to expected labels and styles', () => {
        expect(processingDisplayLabel(true)).toBe('Minimally Processed');
        expect(processingDisplayLabel(false)).toBe('Processed');
        expect(processingDisplayLabel(null)).toBe('Not Specified');
        expect(processingChipStyle(false).borderColor).toBe('rgba(231, 165, 78, 0.85)');
    });
});
