/**
 * Conformância do MOLDA na nuvem ("Guardado na sua conta", 04/09/2026): o union da
 * ferramenta (`creation_tool`) vive espelhado em SEIS lugares fora do members, e um
 * espelho esquecido não quebra nada visível: o BFF/DTO recusa `molda` com 4xx, o item sai
 * da fila e o selo diz "não consegui" para sempre. Aqui cada espelho é lido por TEXTO (o
 * members não é dependência do kids), no molde do `palette-library-conformance`, e o
 * valor de verdade vem do domínio puro do members por caminho relativo.
 */

import { describe, expect, test } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  CREATION_ACCESS_REF,
  CREATION_TOOLS,
  emptyCountByTool,
} from '../../members/src/domain/creations/creation'

const ROOT = join(import.meta.dir, '..', '..')
const read = (relative: string) => readFileSync(join(ROOT, relative), 'utf8')
const MIGRATIONS = 'members/src/infrastructure/persistence/drizzle/migrations'

describe('a tool `molda` no members (fonte)', () => {
  test('é a ÚLTIMA da lista (o enum do Postgres só cresce no fim) e exige o produto `molda`', () => {
    expect(CREATION_TOOLS).toEqual(['studio', 'pinta', 'molda'])
    expect(CREATION_ACCESS_REF.molda).toBe('molda')
    expect(Object.keys(emptyCountByTool())).toEqual([...CREATION_TOOLS])
  })

  test('schema, DTO e migration 0072 com ADD VALUE IF NOT EXISTS (no journal)', () => {
    expect(read('members/src/infrastructure/persistence/drizzle/schema.ts')).toContain(
      "members.enum('creation_tool', ['studio', 'pinta', 'molda'])",
    )
    expect(read('members/src/interfaces/http/dtos.ts')).toContain(
      "t.Union([t.Literal('studio'), t.Literal('pinta'), t.Literal('molda')])",
    )
    const files = readdirSync(join(ROOT, MIGRATIONS)).filter((f) => f.endsWith('.sql'))
    const withMolda = files.filter((f) =>
      read(`${MIGRATIONS}/${f}`).includes(
        `ALTER TYPE "members"."creation_tool" ADD VALUE IF NOT EXISTS 'molda';`,
      ),
    )
    expect(withMolda).toEqual(['0072_molda_creation_tool.sql'])
    const journal = JSON.parse(read(`${MIGRATIONS}/meta/_journal.json`)) as {
      entries: Array<{ idx: number; tag: string; when: number }>
    }
    const entry = journal.entries.find((e) => e.tag === '0072_molda_creation_tool')
    expect(entry?.idx).toBe(72)
    // `when` crescente: uma migration abaixo da marca d'água é PULADA em silêncio (03/08).
    const previous = journal.entries.find((e) => e.idx === 71)
    expect((entry?.when ?? 0) > (previous?.when ?? 0)).toBe(true)
  })

  test('cache de posse e contagem por ferramenta são DERIVADOS da lista (nada listado à mão)', () => {
    const cache = read('members/src/application/creations/tool-ownership-cache.ts')
    expect(cache).toContain('for (const tool of CREATION_TOOLS)')
    expect(cache).not.toContain("keyOf(accountId, 'pinta')")
    for (const file of [
      'members/src/infrastructure/persistence/drizzle/creations.repository.ts',
      'members/tests/fakes/creations-in-memory.ts',
    ]) {
      const source = read(file)
      expect(source).toContain('emptyCountByTool()')
      expect(source).not.toContain('{ studio: 0, pinta: 0 }')
    }
    // O DDL do teste de banco nasce com os três E adiciona o valor no banco compartilhado.
    const dbTest = read('members/tests/db/creations.repository.test.ts')
    expect(dbTest).toContain("as enum ('studio', 'pinta', 'molda')")
    expect(dbTest).toContain("add value if not exists 'molda'")
  })
})

describe('os espelhos fora do members', () => {
  test('core (chaves do R2), member-shell (BFF) e kids (fila) conhecem a tool', () => {
    expect(read('core/src/creations/storage-keys.ts')).toContain(
      "export type CreationStorageTool = 'studio' | 'pinta' | 'molda'",
    )
    expect(read('member-shell/src/routes/creations.ts')).toContain(
      "z.enum(['studio', 'pinta', 'molda'])",
    )
    expect(read('member-shell/src/lib/types.ts')).toContain(
      "export type CreationToolView = 'studio' | 'pinta' | 'molda'",
    )
    expect(read('community-kids/src/lib/creations-cloud.ts')).toContain(
      "export type CreationTool = 'studio' | 'pinta' | 'molda'",
    )
  })

  test('o host do Molda liga a fila com a tool certa, o espelho e o selo; rota, proxy e prefixo embarcado', () => {
    const client = read('community-kids/src/components/kids/molda-client.tsx')
    expect(client).toContain("tool: 'molda'")
    expect(client).toContain('createCloudMirroredMoldaPersistence(')
    expect(client).toContain('<CloudSaveBadge cloud={cloud} syncing={syncing} />')
    expect(client).toContain('cloud.flush({ timeoutMs: 5000 })')
    expect(client).toContain('isAssetOpen: m.isMoldaAssetOpen')
    const wrapper = read('community-kids/src/lib/molda-cloud-persistence.ts')
    expect(wrapper).toContain('sz:creations-synced:molda:')
    expect(read('community-kids/src/proxy.ts')).toContain("'/molda'")
    expect(read('community-kids/src/lib/embedded-app-path.ts')).toContain("'/molda'")
    expect(read('catalog/scripts/seed.ts')).toContain("'molda'")
  })
})
