import { describe, expect, test } from 'bun:test'
import {
  lastMigrationTouching,
  latestCheckConstraint,
  migrationSql,
} from '../helpers/drizzle-migrations'

const CONSTRAINT = 'courses_career_slot_check'

describe('contrato do CHECK das posições da carreira', () => {
  test('a última migration que o escreveu carrega exatamente o CHECK do snapshot atual', () => {
    // ⚠️ Nada de número fixo aqui. Este teste já apontou para a `0063` por caminho literal e,
    // quando a `0064` alargou a restrição, teria continuado validando a regra ANTIGA — passando,
    // porque a regra velha é coerente consigo mesma. Ver `tests/helpers/drizzle-migrations.ts`.
    const constraint = latestCheckConstraint('members.courses', CONSTRAINT)
    const { sql, tag } = lastMigrationTouching(CONSTRAINT)
    expect(sql, `a migration ${tag} deveria escrever o CHECK do snapshot`).toContain(
      `CHECK (${constraint})`,
    )
  })

  test('o teto vigente é 1 na entrada e 8 em todos os demais degraus', () => {
    // A decisão de produto de 15/08: o Iniciante 2D voltou a 8 (teve 7 por um dia). Sem esta
    // asserção o teste acima passaria com QUALQUER número, desde que migration e snapshot
    // concordassem entre si.
    const constraint = latestCheckConstraint('members.courses', CONSTRAINT)
    expect(constraint).toContain("'primeiros-passos' then 1")
    expect(constraint).toContain('else 8 end')
    expect(constraint).not.toContain('then 7')
  })
})

describe('contrato da migration 0063 (degrau de entrada)', () => {
  // Estas asserções são legitimamente SOBRE a 0063 — ela é quem soltou o retrato congelado dos
  // marcos do curso-base. Ficam fixadas nela de propósito.
  const migration = migrationSql('0063_deep_psylocke')

  test('solta snapshots somente do curso-base vivo que será finalizado', () => {
    expect(migration).toContain('FROM "members"."courses" AS "course"')
    expect(migration).toContain('"course"."id" = "event"."source_id"')
    expect(migration).toContain('"course"."career_slot" = 1')
  })
})
