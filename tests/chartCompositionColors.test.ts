import { describe, expect, it } from 'vitest';

import {
    chipStyleFromDonutHex,
    foodTypeColorLookupFromComposition,
    foodTypeFixedHex,
    foodTypeLabelForRow,
    processingChipStyle,
    processingDisplayLabel,
    PROCESSING_OVERVIEW_COLOR_BY_LABEL,
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

    it('uses stable fixed color mapping for known food labels', () => {
        expect(foodTypeFixedHex('Produce')).toBe('#B7D7BD');
        expect(foodTypeFixedHex('Grains')).toBe('#E7A54E');
        expect(foodTypeFixedHex('Dry Goods')).toBe('#E7A54E');
        expect(foodTypeFixedHex('Frozen Meat')).toBe('#F9DC70');
        expect(foodTypeFixedHex('Misc. Cold')).toBe('#6CAEE6');
    });

    it('maps processing booleans to expected labels and styles', () => {
        expect(processingDisplayLabel(true)).toBe('Minimally Processed');
        expect(processingDisplayLabel(false)).toBe('Processed');
        expect(processingDisplayLabel(null)).toBe('Not Specified');
        expect(processingChipStyle(true).borderColor).toBe('rgba(225, 29, 72, 0.85)');
        expect(processingChipStyle(false).borderColor).toBe('rgba(139, 92, 246, 0.85)');
        expect(PROCESSING_OVERVIEW_COLOR_BY_LABEL['Minimally Processed']).toBe('#B7D7BD');
        expect(PROCESSING_OVERVIEW_COLOR_BY_LABEL.Processed).toBe('#FAC87D');
    });
});
