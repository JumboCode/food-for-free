/**
 * Partner row for Food For Free (the main organization) not a receiving partner.
 * Users linked only here should see aggregated metrics.
 */
export function isDistributorPartnerOrgName(organizationName: string | null | undefined): boolean {
    const n = organizationName?.trim().toLowerCase() ?? '';
    return n === 'food for free';
}
