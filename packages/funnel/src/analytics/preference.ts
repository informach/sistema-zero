/** Shared client/server policy. Automatic collection never writes a consent receipt. */
export const ANALYTICS_PREFERENCE_COOKIE = 'sz_metrics'
export const ANALYTICS_CLEANUP_COOKIE = 'sz_metrics_cleanup'
export const analyticsEnabled = (choice: string | null | undefined) => choice !== 'rejected'
