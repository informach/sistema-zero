import { describe, expect, it } from 'bun:test'
import { join } from 'node:path'
import { DEFAULT_PALETTE } from '@sistemazero/core/palette'
import { derive } from '../src/tokens/derive'
import { toConsoleCss } from '../src/tokens/emit'

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
  it('⚠️ UM tema só: um `:root`, nenhum `.dark`, nenhum bloco por paleta', () => {
    // O console não tem cor por pessoa nem claro/escuro (17/09/2026). Um `.dark` reaparecendo
    // aqui é sinal de que alguém recolou o modo escuro num app só.
    expect(folha).toContain(':root {')
    expect(semComentarios(folha)).not.toContain('.dark')
    expect(semComentarios(folha)).not.toContain('data-sz-palette')
  })

  it('⭐ a logo do console lê o tema, como a da comunidade', () => {
    // O `BrandLogo` compartilhado pinta o ZERO com `var(--logo-zero-<fundo>-{de,ate})`. Sem os
    // quatro aqui, o degradê vira valor inválido e o ZERO some nos três painéis.
    for (const fundo of ['escuro', 'claro'])
      for (const ponta of ['de', 'ate']) expect(folha).toContain(`--logo-zero-${fundo}-${ponta}:`)
  })

  it('⚠️ o verde-lima da marca antiga não voltou, e o CTA não tem degradê', () => {
    // 18/09/2026: o console passou a ser FIEL à comunidade — botão chapado em pílula e a logo
    // oficial lendo o tema. `--brand-lime`/`--brand-cyan` (o verde da wordmark antiga) e
    // `--sz-gradient` saíram; se um deles reaparecer, é a identidade velha voltando.
    expect(folha).not.toContain('--brand-lime')
    expect(folha).not.toContain('--brand-cyan')
    expect(folha).not.toContain('--sz-gradient')
    for (const [i, css] of globals.entries()) {
      const corpo = semComentarios(css)
      expect({
        app: CONSOLES[i],
        degrade: /background-image:\s*var\(--sz-gradient\)/.test(corpo),
      }).toEqual({ app: CONSOLES[i], degrade: false })
      expect({ app: CONSOLES[i], lima: corpo.includes('--brand-lime') }).toEqual({
        app: CONSOLES[i],
        lima: false,
      })
    }
  })

  it('⭐ o botão primário é a pílula CHAPADA do Pen nos três', () => {
    // A regra mora FORA de `@layer` de propósito (é o que a faz vencer as utilitárias do
    // `Button`); o contrato é o desenho: cor lisa, pílula e o hover pela cor.
    for (const [i, css] of globals.entries()) {
      const corpo = semComentarios(css)
      const inicio = corpo.indexOf('button.bg-primary.text-primary-foreground')
      const regra = inicio < 0 ? '' : corpo.slice(inicio, corpo.indexOf('}', inicio))
      expect({ app: CONSOLES[i], achou: inicio >= 0 }).toEqual({ app: CONSOLES[i], achou: true })
      expect({
        app: CONSOLES[i],
        chapado: regra.includes('background-image: none'),
        pilula: regra.includes('border-radius: 9999px'),
      }).toEqual({ app: CONSOLES[i], chapado: true, pilula: true })
      expect({ app: CONSOLES[i], hover: corpo.includes('var(--primary-hover)') }).toEqual({
        app: CONSOLES[i],
        hover: true,
      })
    }
  })

  it('⭐ a folha está em dia com o registro — rodou `bun run tokens:gen`?', () => {
    // O mesmo portão da folha da comunidade: o teste É a conferência de build.
    expect(folha).toBe(toConsoleCss())
  })

  it('veste a paleta do Pen, não a paleta antiga do admin', () => {
    const pen = derive(DEFAULT_PALETTE)
    expect(folha).toContain(`--primary: ${pen.action};`)
    expect(folha).toContain(`--background: ${pen.ground};`)
    expect(folha).toContain(`--border: ${pen.line};`)
  })

  it('⚠️ os `dark:` do ui e do member-shell continuam INERTES nos três', () => {
    // Sem a variante declarada, o Tailwind v4 volta ao `prefers-color-scheme` e os `dark:` que os
    // pacotes compartilhados ainda trazem passariam a seguir o sistema operacional — o app
    // inteiro mudaria de cara na máquina de quem usa tema escuro no SO.
    for (const [i, css] of globals.entries())
      expect({ app: CONSOLES[i], tem: css.includes('@custom-variant dark') }).toEqual({
        app: CONSOLES[i],
        tem: true,
      })
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
      // ⚠️⚠️ A primeira versão desta guarda procurava a 1ª regra com `/^[.:@a-z[][^\n]*\{/m` e
      // aceitava "não achei regra nenhuma" como APROVAÇÃO. Então `* { … }`, `#root {`, um
      // seletor em maiúscula ou uma chave na linha de baixo passavam batido — que é exatamente
      // o caso que quebra o app. Agora a busca não depende do 1º caractere nem da linha, e não
      // achar regra nenhuma é FALHA (a folha TEM regras; não achar significa busca cega).
      const primeiraRegra = semCom.search(
        /^[ \t]*(?!@import\b|@charset\b|@source\b|@custom-variant\b)\S[\s\S]*?\{/m,
      )
      expect({ app: CONSOLES[i], importado: importe >= 0 }).toEqual({
        app: CONSOLES[i],
        importado: true,
      })
      expect({ app: CONSOLES[i], achouRegra: primeiraRegra >= 0 }).toEqual({
        app: CONSOLES[i],
        achouRegra: true,
      })
      expect({ app: CONSOLES[i], antes: importe < primeiraRegra }).toEqual({
        app: CONSOLES[i],
        antes: true,
      })
    }
  })
  it('⭐ a folha ENTREGA todo token que os apps consomem pelo `@theme inline`', () => {
    // Sem isto, apagar uma linha de `console.css` não quebra teste nenhum: o `var()` do app vira
    // valor inválido no tempo de computação e a cor some da tela em silêncio.
    const declarados = new Set(
      [...folha.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gm)].map((m) => m[1] as string),
    )
    const faltando: string[] = []
    for (const [i, css] of globals.entries()) {
      const inicio = css.indexOf('@theme inline')
      if (inicio < 0) continue
      const bloco = css.slice(inicio, css.indexOf('\n}', inicio))
      for (const [, consumido] of bloco.matchAll(/var\((--[a-z0-9-]+)\)/g))
        if (!declarados.has(consumido as string)) faltando.push(`${CONSOLES[i]}: ${consumido}`)
    }
    expect(faltando).toEqual([])
    expect(declarados.size).toBeGreaterThan(30)
  })
})
