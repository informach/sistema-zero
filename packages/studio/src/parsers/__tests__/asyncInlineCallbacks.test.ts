import { describe, expect, it } from 'bun:test'
import { compileStatements } from '#generators'
import { parseJS } from '../js'

/**
 * Nenhum bloco de callback guarda `async` nem `*`: aceitar essas funções como corpo de bloco
 * apagava o modificador na volta (o `await` de dentro deixava de ser válido). Elas ficam como
 * código avançado, inteiras.
 */
const CASES = {
  'evento do Jogo 3D com async': 'SZGame3D.onKey("Space", async () => {\n  await espera();\n});',
  'listener do DOM com async':
    'document.addEventListener("click", async () => {\n  await espera();\n});',
  'listener com function async':
    'document.addEventListener("click", async function () {\n  await espera();\n});',
  'listener com gerador': 'document.addEventListener("click", function* () {\n  yield 1;\n});',
  'a cada quadro com async': 'SZGame3D.animate(cena, async () => {\n  await espera();\n});',
}

describe('a Ponte não apaga async nem gerador de um callback', () => {
  for (const [name, code] of Object.entries(CASES)) {
    it(name, () => {
      const ir = parseJS(code)
      const out = compileStatements(ir, 0)
      const modifier = code.includes('function*') ? 'function*' : 'async'
      expect(out).toContain(modifier)
      expect(JSON.stringify(ir)).toContain('"rawJS"')
    })
  }

  it('o callback comum continua virando bloco', () => {
    const ir = parseJS('SZGame3D.onKey("Space", () => {\n  SZGame3D.addScore(1);\n});')
    expect(JSON.stringify(ir)).not.toContain('"rawJS"')
  })
})
