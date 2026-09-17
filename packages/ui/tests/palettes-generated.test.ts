import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { DEFAULT_PALETTE, PALETTES } from '@sistemazero/core/palette'
import { deltaE } from '../src/tokens/color'
import { derive, deriveWithoutOverrides } from '../src/tokens/derive'
import { toCss } from '../src/tokens/emit'
import { PALETTE_RECIPES } from '../src/tokens/palettes'
import { FIXED_TOKENS, PALETTE_TOKENS } from '../src/tokens/recipe'

const FOLHA = join(import.meta.dir, '../src/styles/palettes/community.css')

/**
 * ⭐ Este teste É a conferência de build.
 *
 * O `packages/ui` não tem passo de build de propósito (os apps transpilam o source), então a
 * folha gerada é COMPROMETIDA no repositório. O que impede alguém de editá-la à mão — ou de
 * mexer no registro e esquecer o `bun run tokens:gen` — é a comparação byte a byte aqui.
 */
describe('a folha gerada está em dia com o registro', () => {
  test('byte a byte contra o emissor — rodou `bun run tokens:gen`?', async () => {
    expect(await Bun.file(FOLHA).text()).toBe(toCss())
  })

  test('todo swatch do catálogo tem um bloco, e nenhum bloco sobra', async () => {
    const css = await Bun.file(FOLHA).text()
    const blocos = [...css.matchAll(/\[data-sz-palette="([a-z0-9-]+)"\]/g)].map((m) => m[1])
    expect([...new Set(blocos)].sort()).toEqual([...PALETTES].sort())
  })

  test('a rede de segurança existe e é a cor da casa', async () => {
    const css = await Bun.file(FOLHA).text()
    expect(css).toContain(':root:not([data-sz-palette])')
    const rede = css.slice(css.indexOf(':root:not([data-sz-palette])'))
    const casa = derive(DEFAULT_PALETTE)
    expect(rede).toContain(`--sz-action: ${casa.action};`)
    expect(rede).toContain(`--sz-ground: ${casa.ground};`)
  })

  test('⚠️ o tema pink de hoje continua alcançável pelo seletor antigo', () => {
    // Enquanto os apps não emitem `data-sz-palette`, é isto que mantém o kids e o funil de pé.
    // Ele sai na etapa de limpeza, junto com o `data-tema`.
    const rosa = PALETTE_RECIPES.find((r) => r.id === 'pink')
    expect(rosa?.legacySelectors).toContain(':root[data-tema="pink"]')
  })

  test('os tokens que nunca mudam ficam no :root, fora dos blocos de paleta', async () => {
    const css = await Bun.file(FOLHA).text()
    const primeiroBloco = css.indexOf('[data-sz-palette=')
    const raiz = css.slice(0, css.indexOf(':root:not('))
    for (const token of Object.keys(FIXED_TOKENS)) expect(raiz).toContain(`--sz-${token}:`)
    // E não se repetem lá embaixo: repetição é a porta de entrada da divergência.
    const depois = css.slice(primeiroBloco)
    for (const token of Object.keys(FIXED_TOKENS)) expect(depois).not.toContain(`--sz-${token}:`)
  })

  test('nenhum bloco de paleta esquece um token', () => {
    for (const id of PALETTES) {
      const tokens = derive(id)
      for (const token of PALETTE_TOKENS)
        expect({ id, token, valor: tokens[token] }).toMatchObject({ valor: expect.any(String) })
    }
  })
})

describe('o registro e o vocabulário andam juntos', () => {
  test('todo id do core tem receita de cor, e nenhuma receita sobra', () => {
    expect(PALETTE_RECIPES.map((r) => r.id).sort()).toEqual([...PALETTES].sort())
  })

  test('⭐ todo override está a ΔE ≤ 0,04 do que a fórmula geraria', () => {
    // É isto que faz do override "a palavra da designer", e não um esconderijo: uma cor fixada
    // longe da fórmula significa que a fórmula não descreve mais a família, e aí é a fórmula que
    // precisa mudar — não mais uma exceção.
    const longe: string[] = []
    for (const recipe of PALETTE_RECIPES) {
      const formula = deriveWithoutOverrides(recipe.id)
      for (const [token, valor] of Object.entries(recipe.overrides ?? {})) {
        const d = deltaE(valor, formula[token as keyof typeof formula])
        if (d > 0.04) longe.push(`${recipe.id}/${token}: ΔE ${d.toFixed(4)}`)
      }
    }
    expect(longe).toEqual([])
  })

  test('⚠️ a paleta azul reproduz, ao hexadecimal, o tema Padrão de hoje', () => {
    // A migração não pode mover um pixel. Estes são os valores aprovados em 11/09/2026.
    const azul = derive('blue')
    expect(azul.ground).toBe('#e9eef6')
    expect(azul.action).toBe('#1b5cf3')
    expect(azul.menu).toBe('#121a30')
    expect(azul['action-step']).toBe('#1343b8')
  })

  test('⚠️ a paleta rosa reproduz, ao hexadecimal, o tema Pink de hoje', () => {
    const rosa = derive('pink')
    expect(rosa.ground).toBe('#f4ecf2')
    expect(rosa.action).toBe('#c8246f')
    expect(rosa.menu).toBe('#25132b')
    expect(rosa['action-step']).toBe('#8e1650')
  })

  test('uma cor nova precisa de UMA linha — matiz e nada mais', () => {
    const semOverride = PALETTE_RECIPES.filter((r) => !r.overrides)
    expect(semOverride.length).toBeGreaterThan(0)
    const total = PALETTE_TOKENS.length + Object.keys(FIXED_TOKENS).length
    for (const recipe of semOverride) expect(Object.keys(derive(recipe.id)).length).toBe(total)
  })
})
