import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils';

describe('cn', () => {
    it('merges duplicate tailwind utility classes', () => {
        const merged = cn('p-2', 'p-4', 'text-sm', 'text-lg');
        expect(merged).toBe('p-4 text-lg');
    });

    it('handles conditional classes from clsx inputs', () => {
        const merged = cn('rounded', { hidden: false, block: true }, ['font-medium']);
        expect(merged).toBe('rounded block font-medium');
    });
});
