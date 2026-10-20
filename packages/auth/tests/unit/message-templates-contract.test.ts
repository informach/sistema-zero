import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Contrato com o Messaging: toda chave de template que o Auth envia existe no seed versionado
 * (`packages/messaging/scripts/seed-templates.ts`) como e-mail (o Auth só envia e-mail). O seed
 * conecta no banco ao ser importado, então a conferência é no texto da fonte (mesmo idioma dos
 * contratos do Funil e do Referrals).
 */
const SEED = new URL('../../../messaging/scripts/seed-templates.ts', import.meta.url)
const SRC = fileURLToPath(new URL('../../src/', import.meta.url))

/** Chaves com forma de template nos arquivos que chamam o Messaging. */
const TEMPLATE_LITERAL = /'(welcome|otp|password-reset|profile-[a-z0-9-]+)'/g

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.ts$/.test(name) ? [path] : []
  })
}

/**
 * Canais semeados de cada chave: `key: 'x', channel: '…'`, os pares gerados por
 * `(['a', 'b'] as const).flatMap(…)` e as listas `[{ key: 'a', … }].map(…)`.
 */
function seededChannels(source: string): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>()
  const add = (key: string, channel: string) => {
    const set = out.get(key) ?? new Set<string>()
    set.add(channel)
    out.set(key, set)
  }
  const channelsUntil = (start: number, end: string) =>
    [
      ...source.slice(start, source.indexOf(end, start)).matchAll(/channel:\s*'(email|whatsapp)'/g),
    ].map((c) => c[1] as string)
  for (const m of source.matchAll(/\bkey:\s*'([a-z0-9-]+)',\s*channel:\s*'(email|whatsapp)'/g))
    add(m[1] as string, m[2] as string)
  for (const m of source.matchAll(/\(\[((?:\s*'[a-z0-9-]+',?)+)\s*\]\s*as const\)\.flatMap/g)) {
    const channels = channelsUntil(m.index ?? 0, '\n  }),\n')
    for (const k of (m[1] as string).matchAll(/'([a-z0-9-]+)'/g))
      for (const channel of channels) add(k[1] as string, channel)
  }
  for (const m of source.matchAll(
    /\.\.\.\[((?:\s*\{\s*key:\s*'[a-z0-9-]+'[^}]*\},?)+)\s*\]\.map\(/g,
  )) {
    const channels = channelsUntil(m.index ?? 0, '\n  })),\n')
    for (const k of (m[1] as string).matchAll(/key:\s*'([a-z0-9-]+)'/g))
      for (const channel of channels) add(k[1] as string, channel)
  }
  return out
}

const seed = readFileSync(SEED, 'utf8')
const channels = seededChannels(seed)
const senders = sourceFiles(SRC).filter((path) => /\.sendEmail\(/.test(readFileSync(path, 'utf8')))
const used = new Set(
  senders.flatMap((path) =>
    [...readFileSync(path, 'utf8').matchAll(TEMPLATE_LITERAL)].map((m) => m[1] as string),
  ),
)

describe('templates do Messaging usados pelo Auth', () => {
  test('a varredura encontra reset, código, convite e o aviso de 18 anos', () => {
    for (const key of ['password-reset', 'otp', 'welcome', 'profile-turned-18'])
      expect(used).toContain(key)
  })

  test('toda chave usada existe no seed como e-mail', () => {
    for (const key of used) {
      expect({ key, email: channels.get(key)?.has('email') === true }).toEqual({
        key,
        email: true,
      })
    }
  })
})
