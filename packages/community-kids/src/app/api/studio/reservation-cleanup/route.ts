import { shell } from '@/server/shell'

// Dedicated signed retirement attestation; no browser-session authorization.
export const { POST } = shell.routes.studioReservationCleanup
