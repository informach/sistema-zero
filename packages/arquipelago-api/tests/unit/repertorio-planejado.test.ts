import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { POSTOS_DA_JORNADA } from '@sistemazero/arquipelago-contracts'
import planejado from '../../src/infrastructure/config/repertorio-planejado.json'

test('fontes planejadas são listas reais de bases e missão, com hash semântico e sem curso inventado', () => {
  expect(planejado.versao).toBe(1)
  expect(planejado.fontes).toHaveLength(5)
  expect(new Set(planejado.fontes.map((f) => f.origem)).size).toBe(5)
  for (const fonte of planejado.fontes) {
    expect(['base2d', 'base3d', 'mission']).toContain(fonte.papel)
    expect(POSTOS_DA_JORNADA as readonly string[]).toContain(fonte.posto)
    expect(fonte.origem).toMatch(
      /^docs\/aulas-interativas\/(faisca|construtor|inventor)\/[^/]+\/blocos\.json$/,
    )
    const data = JSON.parse(
      readFileSync(new URL(`../../../../${fonte.origem}`, import.meta.url), 'utf8'),
    )
    const canonical = JSON.stringify(
      Object.fromEntries(
        Object.keys(data)
          .sort()
          .map((k) => [k, data[k]]),
      ),
    )
    expect(fonte.sha256).toBe(createHash('sha256').update(canonical).digest('hex'))
    expect(fonte.blocos).toEqual(
      [...new Set([...(data.blocks ?? data['2d'] ?? []), ...(data['3d'] ?? [])])].sort(),
    )
    expect(fonte).not.toHaveProperty('courseId')
    expect(fonte).not.toHaveProperty('publicado')
  }
})
