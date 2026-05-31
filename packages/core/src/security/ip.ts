/**
 * Verificação de IP contra uma allowlist de IPs exatos e faixas CIDR, com
 * suporte a IPv4 e IPv6. IPv4 mapeado em IPv6 (`::ffff:a.b.c.d`) é normalizado
 * para IPv4. Regra e IP precisam ser da mesma família para casar.
 */
export function ipMatchesAny(ip: string, allow: readonly string[]): boolean {
  const normalized = normalizeIp(ip)
  return allow.some((rule) => ipMatches(normalized, rule.trim()))
}

function normalizeIp(ip: string): string {
  const lower = ip.trim().toLowerCase()
  return lower.startsWith('::ffff:') ? lower.slice('::ffff:'.length) : lower
}

function ipMatches(ip: string, rule: string): boolean {
  if (!rule) return false

  if (!rule.includes('/')) {
    return ip === normalizeIp(rule)
  }

  const slash = rule.lastIndexOf('/')
  const range = normalizeIp(rule.slice(0, slash))
  const bits = Number(rule.slice(slash + 1))

  const ipIsV6 = ip.includes(':')
  const ruleIsV6 = range.includes(':')
  if (ipIsV6 !== ruleIsV6) return false // famílias diferentes nunca casam

  const totalBits = ruleIsV6 ? 128 : 32
  if (!Number.isInteger(bits) || bits < 0 || bits > totalBits) return false

  const ipInt = ipToBigInt(ip, ruleIsV6)
  const rangeInt = ipToBigInt(range, ruleIsV6)
  if (ipInt === null || rangeInt === null) return false

  const mask = bits === 0 ? 0n : (~0n << BigInt(totalBits - bits)) & ((1n << BigInt(totalBits)) - 1n)
  return (ipInt & mask) === (rangeInt & mask)
}

/** Converte um IP (v4 ou v6) num inteiro de 32/128 bits; `null` se malformado. */
function ipToBigInt(ip: string, isV6: boolean): bigint | null {
  return isV6 ? ipv6ToBigInt(ip) : ipv4ToBigInt(ip)
}

function ipv4ToBigInt(ip: string): bigint | null {
  const octets = ip.split('.')
  if (octets.length !== 4) return null
  let result = 0n
  for (const octet of octets) {
    if (octet === '' || !/^\d+$/.test(octet)) return null
    const n = Number(octet)
    if (n < 0 || n > 255) return null
    result = (result << 8n) | BigInt(n)
  }
  return result
}

function ipv6ToBigInt(ip: string): bigint | null {
  // Suporta a forma abreviada com "::" (um único bloco de zeros).
  if (ip.indexOf('::') !== ip.lastIndexOf('::')) return null
  const [head, tail] = ip.split('::')
  const headParts = head ? head.split(':') : []
  const tailParts = tail !== undefined ? (tail ? tail.split(':') : []) : null

  let groups: string[]
  if (tailParts === null) {
    groups = headParts // sem "::" → precisa de 8 grupos
  } else {
    const missing = 8 - headParts.length - tailParts.length
    if (missing < 0) return null
    groups = [...headParts, ...Array(missing).fill('0'), ...tailParts]
  }
  if (groups.length !== 8) return null

  let result = 0n
  for (const group of groups) {
    if (group === '' || !/^[0-9a-f]{1,4}$/.test(group)) return null
    result = (result << 16n) | BigInt(parseInt(group, 16))
  }
  return result
}
