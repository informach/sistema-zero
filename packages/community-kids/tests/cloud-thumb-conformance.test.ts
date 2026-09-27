/**
 * O teto da MINIATURA que viaja na nuvem (12 000 chars de data URL) vive em cinco lugares fora
 * do domínio do members, e um espelho desalinhado não quebra nada visível: acima do teto o
 * members DESCARTA a miniatura em silêncio, e o card do outro aparelho fica sem capa para sempre.
 * Cada espelho é lido por TEXTO (no molde do `molda-conformance`), e o valor de verdade vem do
 * domínio puro do members por caminho relativo.
 */
import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CREATION_LIMITS } from '../../members/src/domain/creations/creation'

const ROOT = join(import.meta.dir, '..', '..')
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8')

/** O número que uma constante declara no arquivo (`12_000` ou `12000`), ou `null` se não está lá. */
function declared(source: string, pattern: RegExp): number | null {
  const raw = source.match(pattern)?.[1]
  return raw === undefined ? null : Number(raw.replace(/_/g, ''))
}

const MIRRORS: Array<{ file: string; pattern: RegExp }> = [
  { file: 'member-shell/src/routes/creations.ts', pattern: /const MAX_THUMB_CHARS = (\d[\d_]*)/ },
  {
    file: 'studio/src/cover/cloudThumb.ts',
    pattern: /export const CLOUD_THUMB_MAX_CHARS = (\d[\d_]*)/,
  },
  {
    file: 'community-kids/src/lib/studio-cloud.ts',
    pattern: /const MAX_CLOUD_THUMB_CHARS = (\d[\d_]*)/,
  },
  {
    file: 'community-kids/src/lib/molda-cloud-persistence.ts',
    pattern: /const MAX_THUMB_CHARS = (\d[\d_]*)/,
  },
  { file: 'molda/src/core/limits.ts', pattern: /maxThumbChars: (\d[\d_]*)/ },
]

describe('o teto da miniatura na nuvem (CREATION_LIMITS.maxThumbChars) em lockstep', () => {
  test('o members declara 12 000 (e o texto do arquivo diz o mesmo que o módulo)', () => {
    expect(CREATION_LIMITS.maxThumbChars).toBe(12_000)
    expect(
      declared(read('members/src/domain/creations/creation.ts'), /maxThumbChars: (\d[\d_]*)/),
    ).toBe(CREATION_LIMITS.maxThumbChars)
  })

  test.each(MIRRORS)('$file declara o mesmo teto do members', ({ file, pattern }) => {
    const value = declared(read(file), pattern)
    // Anti-vácuo: a constante tem que EXISTIR com este nome (renomear é quebrar este teste).
    expect(value).not.toBeNull()
    expect(value).toBe(CREATION_LIMITS.maxThumbChars)
  })
})
