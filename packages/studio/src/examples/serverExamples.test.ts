import { describe, expect, it } from 'bun:test'
import { SERVER_EXAMPLES_INDEX } from './serverExamples'
import { buildServerExamplesIndex } from './serverExamplesBuilder'

describe('server-examples (índice distilado p/ o tutor)', () => {
  it('o gerado está em dia com os catálogos — senão rode `bun run gen:server-examples`', () => {
    expect(SERVER_EXAMPLES_INDEX).toEqual(buildServerExamplesIndex())
  })

  it('cobre os 149 exemplos e todo item tem mecânica pesquisável', () => {
    expect(SERVER_EXAMPLES_INDEX.length).toBe(149)
    for (const entry of SERVER_EXAMPLES_INDEX) {
      expect(entry.promise.length).toBeGreaterThan(0)
      expect(entry.scenario.length).toBeGreaterThan(0)
      expect(entry.blockTypes.length).toBeGreaterThan(0)
    }
  })
})
