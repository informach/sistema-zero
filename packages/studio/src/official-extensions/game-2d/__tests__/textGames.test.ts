import { describe, expect, it } from 'bun:test'
import { generateJS } from '#generators'
import { normalizeSZIR, SZIRV2Schema } from '#ir'
import { parseJS } from '../../../parsers/js'
import { NUMEROS_SOURCE, QUIZ_SOURCE } from '../__gen_textGames'
import { numberRainExample, textQuizExample } from '../examples/textGames'
import { registerExampleContractTests, setupGameTwoDExampleTests } from './exampleContractHarness'

setupGameTwoDExampleTests()
for (const [example, source] of [
  [numberRainExample, NUMEROS_SOURCE],
  [textQuizExample, QUIZ_SOURCE],
] as const) {
  describe(example.name, () => {
    registerExampleContractTests({
      example,
      source,
      stage: { width: 600, height: 400, bg: '#102030' },
    })
    it('o projeto com dados e sprites locais valida e gera código executável', () => {
      expect(SZIRV2Schema.safeParse(example.ir).success).toBe(true)
      const generated = generateJS(example.ir)
      expect(generated).toContain('SZGame2D.spawnTextInGroup')
      expect(generated).toContain('SZGame2D.spriteData')
      const recovered = normalizeSZIR({
        html: [],
        css: [],
        js: parseJS(source),
        extensions: [{ extensionId: 'game-2d' }],
      })
      expect(SZIRV2Schema.safeParse(recovered).success).toBe(true)
    })
  })
}
