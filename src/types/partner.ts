export type PartnerOrgCard = {
    /** Stable list key: `p-{householdId18}` or `d-{normalized name}`. */
    id: string;
    name: string;
    householdId18?: string | null;
    location: string;
    type: string;
};
