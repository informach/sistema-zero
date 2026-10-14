export function validBrowserLease(leaseEndsAt: number, hardEndsAt: number, now = Date.now()) {
  return (
    Number.isSafeInteger(leaseEndsAt) &&
    Number.isSafeInteger(hardEndsAt) &&
    leaseEndsAt > now &&
    leaseEndsAt <= now + 30_000 &&
    leaseEndsAt <= hardEndsAt
  )
}
