import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'

const ROOT = join(import.meta.dir, '../../..')
const CONSOLES = ['admin', 'helpdesk-app', 'marketing-app'] as const

const folha = await Bun.file(join(ROOT, 'packages/ui/src/styles/console.css')).text()
const globals = await Promise.all(
  CONSOLES.map((app) => Bun.file(join(ROOT, `packages/${app}/src/app/globals.css`)).text()),
)

const semComentarios = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/**
 * Os três consoles carregavam o MESMO bloco de tokens copiado — o `:root` diferia por uma
 * palavra de comentário e o `.dark` era byte a byte igual. Este contrato impede a cópia de
 * voltar: é o modo de falha real (alguém ajusta uma cor num app e os outros dois ficam para
 * trás, em silêncio, até alguém reparar meses depois).
 */
describe('chassi console: uma fonte só para admin, helpdesk e marketing', () => {
  it('a folha declara os dois modos', () => {
    expect(folha).toContain(':root {')
    expect(folha).toContain('.dark {')
    expect(folha).toContain('--brand-lime:')
  })

  it('os três importam a folha, e nenhum redeclara os blocos', () => {
    for (const [i, css] of globals.entries()) {
      const app = CONSOLES[i]
      expect({ app, importa: css.includes('@import "@sistemazero/ui/console.css"') }).toEqual({
        app,
        importa: true,
      })
      const corpo = semComentarios(css)
      expect({ app, raiz: corpo.includes(':root {') }).toEqual({ app, raiz: false })
      expect({ app, escuro: corpo.includes('.dark {') }).toEqual({ app, escuro: false })
    }
  })

  it('⚠️ o import vem ANTES de qualquer outra regra', () => {
    // O Tailwind v4 DESCARTA em silêncio um `@import` depois de outra regra, e o sintoma é o
    // app inteiro sem cor. O `@import "tailwindcss"` é sempre a primeira linha.
    for (const [i, css] of globals.entries()) {
      const semCom = semComentarios(css)
      const importe = semCom.indexOf('@import "@sistemazero/ui/console.css"')
      const primeiraRegra = semCom.search(/^[.:@a-z[][^\n]*\{/m)
      expect({ app: CONSOLES[i], antes: importe < primeiraRegra || primeiraRegra < 0 }).toEqual({
        app: CONSOLES[i],
        antes: true,
      })
    }
  })
})
