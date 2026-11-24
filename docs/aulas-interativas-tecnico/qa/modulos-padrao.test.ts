import { expect, test } from 'bun:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * Todo `modulos.md` de curso segue o mesmo padrão (decisão da Helena, 24/11/2026): é dele que sai o
 * cadastro do curso e dos módulos (docs/operations/cursos-passo-a-passo.md, Etapa 0).
 *
 *   **Título do curso:** ...      → título do curso
 *   **Descrição curta:** ...      → subtítulo
 *   **Descrição longa:** ...      → descrição
 *   ## Módulo N · <título>        → um por módulo, na ordem
 *   **Resumo:** ...               → resumo do módulo, logo depois do título dele
 */
const raiz = resolve(import.meta.dir, '../../aulas-interativas')
const cursos = readdirSync(raiz)
  .flatMap((app) => {
    const pasta = join(raiz, app)
    return statSync(pasta).isDirectory()
      ? readdirSync(pasta).map((curso) => join(pasta, curso, 'modulos.md'))
      : []
  })
  .filter((arquivo) => {
    try {
      return statSync(arquivo).isFile()
    } catch {
      return false
    }
  })

test('há cursos para conferir', () => {
  expect(cursos.length).toBeGreaterThan(10)
})

for (const arquivo of cursos) {
  const nome = arquivo.slice(raiz.length + 1).replaceAll('\\', '/')
  test(`${nome} segue o padrão`, () => {
    const md = readFileSync(arquivo, 'utf8').replaceAll('\r\n', '\n')
    const campo = (rotulo: string) =>
      [...md.matchAll(new RegExp(`^\\*\\*${rotulo}:\\*\\* *(.*)$`, 'gm'))].map((m) => m[1]!.trim())
    for (const rotulo of ['Título do curso', 'Descrição curta', 'Descrição longa']) {
      const valores = campo(rotulo)
      expect({ rotulo, quantos: valores.length }).toEqual({ rotulo, quantos: 1 })
      expect({ rotulo, vazio: valores[0] === '' }).toEqual({ rotulo, vazio: false })
    }
    // Módulos numerados a partir de 1, com " · ", cada um seguido do seu resumo.
    const modulos = [...md.matchAll(/^## Módulo (\d+) · (.+)$/gm)]
    expect(modulos.length).toBeGreaterThan(0)
    expect(modulos.map((m) => Number(m[1]))).toEqual(modulos.map((_, i) => i + 1))
    for (const [i, m] of modulos.entries()) {
      const ate = modulos[i + 1]?.index ?? md.length
      const trecho = md.slice(m.index, ate)
      expect({ modulo: m[2], temResumo: /^\*\*Resumo:\*\* *\S/m.test(trecho) }).toEqual({
        modulo: m[2],
        temResumo: true,
      })
    }
    // Nenhum título de módulo em outro formato ("Módulo 1:", "Módulo 1 —").
    const foraDoPadrao = [...md.matchAll(/^#{1,3} Módulo .*$/gm)]
      .map((m) => m[0])
      .filter((linha) => !/^## Módulo \d+ · /.test(linha))
    expect(foraDoPadrao).toEqual([])
  })
}
