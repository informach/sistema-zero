import { afterAll, describe, expect, test } from 'bun:test'
import postgres from 'postgres'
import { latestCheckConstraint } from '../helpers/drizzle-migrations'
import { prepareTestDatabase } from './test-database'

type Probe = {
  audience: string
  level: string
  track: string
  careerSlot: number | null
}

// ⚠️ O snapshot ATUAL, resolvido pelo journal — nunca um número fixo. Fixado na `0063`, este
// teste continuaria provando a restrição ANTIGA depois da `0064` e passaria, porque a regra
// velha é coerente consigo mesma. Ver `tests/helpers/drizzle-migrations.ts`.
const checkExpression = latestCheckConstraint(
  'members.courses',
  'courses_career_slot_check',
).replaceAll('"members"."courses".', '')

const testDatabaseUrl = await prepareTestDatabase()
if (!testDatabaseUrl) {
  console.warn('[tests/db] Postgres indisponível (porta 5433?) — teste do CHECK PULADO.')
}

describe.skipIf(!testDatabaseUrl)('CHECK real das posições da carreira', () => {
  const sql = postgres(testDatabaseUrl as string, {
    max: 1,
    connect_timeout: 2,
    onnotice: () => {},
  })

  afterAll(async () => {
    await sql.end({ timeout: 1 })
  })

  async function accepts(row: Probe): Promise<boolean> {
    try {
      await sql.begin(async (tx) => {
        await tx.unsafe(`
          create temporary table career_slot_probe (
            audience text not null,
            level text not null,
            track text not null,
            career_slot smallint,
            constraint career_slot_probe_check check (${checkExpression})
          ) on commit drop`)
        await tx`
          insert into career_slot_probe (audience, level, track, career_slot)
          values (${row.audience}, ${row.level}, ${row.track}, ${row.careerSlot})`
      })
      return true
    } catch {
      return false
    }
  }

  test('espelha o domínio inclusive para Primeiros Passos 3D e Lenda com posição', async () => {
    expect(
      await accepts({ audience: 'kids', level: 'primeiros-passos', track: '2d', careerSlot: 1 }),
    ).toBe(true)
    expect(
      await accepts({ audience: 'kids', level: 'iniciante', track: '2d', careerSlot: 7 }),
    ).toBe(true)
    // ⭐ A posição 8 do Iniciante 2D VOLTOU (15/08). Ela existiu, sumiu na `0063` e a `0064` a
    // trouxe de volta — é o teste que prova o alargamento contra o Postgres de verdade.
    expect(
      await accepts({ audience: 'kids', level: 'iniciante', track: '2d', careerSlot: 8 }),
    ).toBe(true)
    expect(
      await accepts({ audience: 'kids', level: 'iniciante', track: '2d', careerSlot: 9 }),
    ).toBe(false)
    // O degrau de ENTRADA continua com uma posição só.
    expect(
      await accepts({ audience: 'kids', level: 'primeiros-passos', track: '2d', careerSlot: 2 }),
    ).toBe(false)
    expect(await accepts({ audience: 'kids', level: 'lenda', track: '2d', careerSlot: null })).toBe(
      true,
    )

    expect(
      await accepts({ audience: 'kids', level: 'primeiros-passos', track: '3d', careerSlot: null }),
    ).toBe(false)
    expect(
      await accepts({ audience: 'kids', level: 'primeiros-passos', track: '3d', careerSlot: 1 }),
    ).toBe(false)
    expect(await accepts({ audience: 'kids', level: 'lenda', track: '2d', careerSlot: 1 })).toBe(
      false,
    )
  })
})
