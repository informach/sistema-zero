export interface RecoveryPolicyView {
  configuration: {
    version: number
    windowDays: number
    reminderDays: number[]
    enabled: boolean
    activatedAt: string | null
    updatedAt: string
    updatedBy: string
  } | null
  configurationReady: boolean
}

export interface RecoveryReviewItem {
  kind: 'CASE' | 'ADMISSION' | 'OPERATION' | 'PERIOD'
  id: string
  subscriptionId: string | null
  paymentId: string | null
  audience: 'kids' | 'adult' | 'unknown'
  state: string
  reason: string | null
  amountInCents: string
  version: number
  openedAt: string
  deadlineAt: string | null
  customerName: string | null
  customerEmail: string | null
}
export interface RecoveryReviewPage {
  items: RecoveryReviewItem[]
  total: number
  limit: number
  offset: number
}

export function recoveryPolicyInput(input: {
  version: number
  days: string
  reminders: string
  enabled: boolean
}) {
  if (!/^\d+$/.test(input.days.trim())) return null
  const windowDays = Number(input.days)
  const raw = input.reminders.trim()
  if (raw && !/^\d+(?:\s*,\s*\d+)*$/.test(raw)) return null
  const reminderDays = raw ? raw.split(',').map(Number) : []
  if (
    !Number.isSafeInteger(windowDays) ||
    windowDays < 1 ||
    windowDays > 30 ||
    reminderDays.length > 3 ||
    reminderDays.some(
      (day, i) =>
        !Number.isSafeInteger(day) ||
        day <= 0 ||
        day >= windowDays ||
        (i > 0 && day <= reminderDays[i - 1]!),
    )
  )
    return null
  return { expectedVersion: input.version, windowDays, reminderDays, enabled: input.enabled }
}
