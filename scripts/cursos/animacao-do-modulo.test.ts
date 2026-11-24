import { expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

/**
 * As receitas das animações dos módulos (docs/aulas-interativas-tecnico/recursos/<curso>/
 * animacao-dos-modulos.ts) contra o modulos.md e o acervo: o título de cada módulo é o do
 * modulos.md, o projeto montado está em art/edisvg/sources e a exportação guardada é a desse
 * projeto. Não monta nada (montar e exportar precisam do ediSVG, que não está no CI).
 */
const raiz = resolve(import.meta.dir, '../..')
const recursos = join(raiz, 'docs/aulas-interativas-tecnico/recursos')
const receitas = readdirSync(recursos)
  .map((curso) => join(recursos, curso, 'animacao-dos-modulos.ts'))
  .filter((arquivo) => existsSync(arquivo))
const manifesto = JSON.parse(
  readFileSync(join(raiz, 'art/edisvg/exports/manifest.json'), 'utf8'),
) as {
  artifacts: { key: string; sourceSha256: string; file: string }[]
}
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex')

test('há receitas para conferir', () => {
  expect(receitas.length).toBeGreaterThanOrEqual(2)
})

for (const arquivo of receitas) {
  const nome = arquivo.slice(recursos.length + 1).replaceAll('\\', '/')
  test(`${nome}: módulos do modulos.md e exportação do projeto atual`, async () => {
    const r = (await import(arquivo)) as {
      curso: { slug: string; pasta: string }
      animacoes: { modulo: number; titulo: string; montar: () => { opcoes: { chave: string } } }[]
    }
    const md = readFileSync(join(raiz, r.curso.pasta, 'modulos.md'), 'utf8')
    const titulos = [...md.matchAll(/^## Módulo \d+ · (.+)$/gm)].map((m) => m[1]!.trim())
    expect(r.animacoes.map((a) => [a.modulo, a.titulo])).toEqual(
      r.animacoes.map((a) => [a.modulo, titulos[a.modulo - 1]]),
    )
    for (const a of r.animacoes) {
      const { chave } = a.montar().opcoes
      const fonte = join(raiz, 'art/edisvg/sources', `${chave}.edisvg`)
      expect({ chave, montado: existsSync(fonte) }).toEqual({ chave, montado: true })
      const exportada = manifesto.artifacts.find((x) => x.key === `${chave}-b1-a1`)
      expect({ chave, exportadaDoProjetoAtual: exportada?.sourceSha256 }).toEqual({
        chave,
        exportadaDoProjetoAtual: sha(readFileSync(fonte)),
      })
      expect(existsSync(join(raiz, 'art/edisvg/exports', exportada!.file))).toBe(true)
    }
  })
}
