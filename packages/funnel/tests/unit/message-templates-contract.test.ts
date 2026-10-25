import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Contrato com o Messaging: toda chave de template que o Funil envia existe no seed versionado
 * (`packages/messaging/scripts/seed-templates.ts`), no canal em que o Funil a usa. O seed conecta
 * no banco ao ser importado, então a conferência é no texto da fonte.
 */
const SEED = new URL('../../../messaging/scripts/seed-templates.ts', import.meta.url)
const SRC = fileURLToPath(new URL('../../src/', import.meta.url))

/** Chaves com forma de template nos arquivos que chamam o Messaging. */
const TEMPLATE_LITERAL =
  /'((?:kids|referrals|challenge|subscription)-[a-z0-9-]+|welcome|new-access)'/g

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

/** Canais semeados de cada chave: `key: 'x', channel: '…'` e os pares do `flatMap`. */
function seededChannels(source: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  const add = (key: string, channel: string) => {
    const set = out.get(key) ?? new Set<string>()
    set.add(channel)
    out.set(key, set)
  }
  for (const m of source.matchAll(/\bkey:\s*'([a-z0-9-]+)',\s*channel:\s*'(email|whatsapp)'/g))
    add(m[1] as string, m[2] as string)
  for (const m of source.matchAll(/\(\[((?:\s*'[a-z0-9-]+',?)+)\s*\]\s*as const\)\.flatMap/g)) {
    const start = m.index ?? 0
    const block = source.slice(start, source.indexOf('\n  }),\n', start))
    const channels = [...block.matchAll(/channel:\s*'(email|whatsapp)'/g)].map((c) => c[1])
    for (const k of (m[1] as string).matchAll(/'([a-z0-9-]+)'/g))
      for (const channel of channels) add(k[1] as string, channel as string)
  }
  return out
}

const seed = readFileSync(SEED, 'utf8')
const channels = seededChannels(seed)
const senders = sourceFiles(SRC).filter((path) =>
  /\.sendMessage\(/.test(readFileSync(path, 'utf8')),
)
const used = new Set(
  senders.flatMap((path) =>
    [...readFileSync(path, 'utf8').matchAll(TEMPLATE_LITERAL)].map((m) => m[1] as string),
  ),
)

describe('templates do Messaging usados pelo Funil', () => {
  test('a varredura encontra os envios do pós-compra, sem outro dono de regularização', () => {
    for (const key of [
      'welcome',
      'new-access',
      'kids-welcome',
      'kids-new-access',
      'challenge-access-approved',
    ])
      expect(used).toContain(key)
    expect(used).not.toContain('subscription-charge-failed')
  })

  test('toda chave usada existe no seed, em e-mail E WhatsApp (o Funil envia nos dois)', () => {
    for (const key of used) {
      expect({ key, channels: [...(channels.get(key) ?? [])].sort() }).toEqual({
        key,
        channels: ['email', 'whatsapp'],
      })
    }
  })
})
