/** Content-independent identity for idempotent derived artifacts, scoped by project/run. */
export async function stableEditorialId(namespace: string) {
  const hash = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(namespace)),
  )
  hash[6] = ((hash[6] ?? 0) & 15) | 80
  hash[8] = ((hash[8] ?? 0) & 63) | 128
  const hex = Array.from(hash.slice(0, 16), (value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
