/**
 * When `AllInventoryTransactions.productType` is missing, many rows still use a
 * pantry / package name that is itself a standard food category (e.g. "Bakery").
 * Align with `scripts/import-newdata-to-neon.js` KNOWN_PRODUCT_TYPES.
 */
const PANTRY_NAME_TO_LABEL = new Map<string, string>([
    ['bakery', 'Bakery'],
    ['produce', 'Produce'],
    ['vegetables', 'Vegetables'],
    ['fruit', 'Fruit'],
    ['protein', 'Protein'],
    ['dairy', 'Dairy'],
    ['dry', 'Dry Goods'],
    ['grain', 'Grain'],
    ['grains', 'Grains'],
    ['dry goods', 'Dry Goods'],
    ['non-food', 'Non-Food'],
    ['non food', 'Non-Food'],
    ['prepared', 'Prepared'],
    ['other', 'Other'],
    ['misc cold', 'Misc. Cold'],
    ['misc. cold', 'Misc. Cold'],
    ['frozen meat', 'Frozen Meat'],
]);

function normalizePantryLookupKey(name: string): string {
    return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** @returns Canonical food-type label, or null if the name is not a known category. */
export function inferFoodTypeLabelFromProductName(
    pantryProductName: string | null | undefined
): string | null {
    if (pantryProductName == null) return null;
    const key = normalizePantryLookupKey(pantryProductName);
    if (!key) return null;
    return PANTRY_NAME_TO_LABEL.get(key) ?? null;
}

/**
 * Effective food type for inventory row `t` joined to package `p`.
 * Keep WHEN list in sync with PANTRY_NAME_TO_LABEL.
 */
export const EFFECTIVE_PRODUCT_TYPE_SQL_JOINED = `COALESCE(
    NULLIF(TRIM(t."productType"), ''),
    CASE LOWER(TRIM(COALESCE(NULLIF(TRIM(p."pantryProductName"), ''), NULLIF(TRIM(t."pantryProductName"), ''))))
        WHEN 'bakery' THEN 'Bakery'
        WHEN 'produce' THEN 'Produce'
        WHEN 'vegetables' THEN 'Vegetables'
        WHEN 'fruit' THEN 'Fruit'
        WHEN 'protein' THEN 'Protein'
        WHEN 'dairy' THEN 'Dairy'
        WHEN 'dry' THEN 'Dry Goods'
        WHEN 'grain' THEN 'Grain'
        WHEN 'grains' THEN 'Grains'
        WHEN 'dry goods' THEN 'Dry Goods'
        WHEN 'non-food' THEN 'Non-Food'
        WHEN 'non food' THEN 'Non-Food'
        WHEN 'prepared' THEN 'Prepared'
        WHEN 'other' THEN 'Other'
        WHEN 'misc cold' THEN 'Misc. Cold'
        WHEN 'misc. cold' THEN 'Misc. Cold'
        WHEN 'frozen meat' THEN 'Frozen Meat'
        ELSE NULL
    END
)`;

/** Orphan distribution row: only `t` is in scope (no package alias `p`). */
export const EFFECTIVE_PRODUCT_TYPE_SQL_ORPHAN = `COALESCE(
    NULLIF(TRIM(t."productType"), ''),
    CASE LOWER(TRIM(COALESCE(t."pantryProductName", '')))
        WHEN 'bakery' THEN 'Bakery'
        WHEN 'produce' THEN 'Produce'
        WHEN 'vegetables' THEN 'Vegetables'
        WHEN 'fruit' THEN 'Fruit'
        WHEN 'protein' THEN 'Protein'
        WHEN 'dairy' THEN 'Dairy'
        WHEN 'dry' THEN 'Dry Goods'
        WHEN 'grain' THEN 'Grain'
        WHEN 'grains' THEN 'Grains'
        WHEN 'dry goods' THEN 'Dry Goods'
        WHEN 'non-food' THEN 'Non-Food'
        WHEN 'non food' THEN 'Non-Food'
        WHEN 'prepared' THEN 'Prepared'
        WHEN 'other' THEN 'Other'
        WHEN 'misc cold' THEN 'Misc. Cold'
        WHEN 'misc. cold' THEN 'Misc. Cold'
        WHEN 'frozen meat' THEN 'Frozen Meat'
        ELSE NULL
    END
)`;
