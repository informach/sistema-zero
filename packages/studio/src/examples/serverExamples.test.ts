import { describe, expect, it } from 'bun:test'
import { SERVER_EXAMPLES_INDEX } from './serverExamples'
import { buildServerExamplesIndex } from './serverExamplesBuilder'

describe('server-examples (índice distilado p/ o tutor)', () => {
  it('o gerado está em dia com os catálogos — senão rode `bun run gen:server-examples`', () => {
    expect(SERVER_EXAMPLES_INDEX).toEqual(buildServerExamplesIndex())
  })

  it('cobre os 183 exemplos e todo item tem mecânica pesquisável', () => {
    // 160 → 161 no lote 10 do review 3D ("Caça às Estrelas", Mundo 3D).
    // 161 → 163 no lote 12 ("Arena dos Cristais" e "Herói do Molda", Jogo 3D Avançado).
    // 163 → 164: "Noite das Fogueiras" (Jogo 3D Avançado, cobertura total dos blocos).
    // 164 → 183: 19 receitas executáveis fecham a cobertura dos blocos 2D.
    expect(SERVER_EXAMPLES_INDEX.length).toBe(183)
    for (const entry of SERVER_EXAMPLES_INDEX) {
      expect(entry.promise.length).toBeGreaterThan(0)
      expect(entry.scenario.length).toBeGreaterThan(0)
      expect(entry.blockTypes.length).toBeGreaterThan(0)
    }
  })
})
