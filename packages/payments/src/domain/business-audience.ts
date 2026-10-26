/** Reporting scope only. It is never an access grant or recovery admission. */
export type BusinessAudience = 'kids' | 'adult'
export type BusinessAudienceFilter = BusinessAudience | 'unassigned'
