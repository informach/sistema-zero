export const IMPERSONATION_MODES = ['readonly', 'write'] as const

export type ImpersonationMode = (typeof IMPERSONATION_MODES)[number]
