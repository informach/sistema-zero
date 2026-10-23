import { expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Contrato com o Messaging: toda chave de e-mail que o Members envia existe no seed versionado
 * (`packages/messaging/scripts/seed-templates.ts`) como e-mail. O seed conecta no banco ao ser
 * importado, então a conferência é no texto da fonte (como no funil e no referrals).
 */
const SEED = readFileSync(
  new URL('../../../messaging/scripts/seed-templates.ts', import.meta.url),
  'utf8',
)
const SRC = fileURLToPath(new URL('../../src/', import.meta.url))
const KEY = /'((?:gift|subscription|challenge|renewal|weekly)-[a-z0-9-]+)'/g

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.ts$/.test(name) ? [path] : []
  })
}

test('cada template de e-mail do Members existe no seed do Messaging', () => {
  const keys = new Set<string>()
  for (const path of sourceFiles(SRC)) {
    const text = readFileSync(path, 'utf8')
    if (!text.includes('sendEmail(')) continue
    for (const match of text.matchAll(KEY)) keys.add(match[1] as string)
  }
  for (const key of [
    'gift-expiry-2d',
    'gift-expired',
    'subscription-ended-kids',
    'subscription-ended-adult',
  ])
    expect(keys).toContain(key)
  for (const key of keys) expect(SEED).toMatch(new RegExp(`key: '${key}',\\s*channel: 'email'`))
})
