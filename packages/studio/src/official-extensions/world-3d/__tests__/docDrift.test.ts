import { describe, expect, it } from 'bun:test'
import type { ExtensionToolboxCategory } from '#extensions'
import {
  NO_PALETTE_TREE_DRIFT,
  NO_TOOLBOX_DRIFT,
  paletteTreeDrift,
  toolboxDrift,
} from '../../__tests__/paletteDrift'
import { world3DPromptContext } from '../ai'
import { world3DBlocks, world3DToolboxCategory } from '../blocks'
import { world3DManifest } from '../manifest'
import { WORLD_THREE_D_PALETTE } from '../palette'
import { world3DRuntime } from '../runtime'

/**
 * Mata a CLASSE de drift, não o caso: a doc do aluno (manifest.docs) cita as
 * sub-categorias (chips) pelo emoji-líder; o contexto da IA (ai.ts) cita os
 * métodos do window.SZWorld3D. Quando um bloco novo estreia uma subcat ou um
 * método e o texto não acompanha, a criança procura um chip que não existe e a
 * IA gera código que não roda. Este arquivo cruza os textos contra as fontes da
 * verdade (a toolbox real + as chaves reais do runtime). Nome legítimo caiu
 * aqui? Conserte o TEXTO, não afrouxe o teste.
 */

/** Nome de cada sub-categoria da toolbox (2º nível). */
function subcatNames(cat: ExtensionToolboxCategory): string[] {
  const out: string[] = []
  for (const c of cat.contents) if (c.kind === 'category') out.push(c.name)
  return out
}

/** Primeiro "caractere" (emoji) do nome do chip. */
function leadEmoji(name: string): string {
  return Array.from(name)[0] ?? ''
}

/** Métodos reais do window.SZWorld3D (avaliando o runtime com stub). */
function runtimeMethods(): string[] {
  const body = world3DRuntime.replace(/^import \* as THREE from 'three';\n/, '')
  const win = { addEventListener() {}, SZWorld3D: undefined } as unknown as Record<string, unknown>
  new Function('THREE', 'window', body)({}, win)
  const api = win.SZWorld3D as Record<string, unknown> | undefined
  if (!api) throw new Error('runtime não montou window.SZWorld3D')
  return Object.keys(api)
}

describe('Mundo 3D — doc × blocos (docDrift)', () => {
  it('cada sub-categoria (chip) da toolbox aparece nos docs do aluno pelo emoji', () => {
    const docs = world3DManifest.docs
    const missing = subcatNames(world3DToolboxCategory).filter((name) => {
      const emoji = leadEmoji(name)
      return emoji && !docs.includes(emoji)
    })
    expect(missing).toEqual([])
  })

  it('o manual tem uma seção por família, na MESMA ordem da árvore, e cada seção de verdade', () => {
    const docs = world3DManifest.docs
    const at = WORLD_THREE_D_PALETTE.map((family) => docs.indexOf(`### ${family.name}\n`))
    expect(at.filter((index) => index < 0)).toEqual([])
    expect([...at].sort((a, b) => a - b)).toEqual(at)
    for (const family of WORLD_THREE_D_PALETTE) {
      if (family.sections.length < 2) continue
      for (const section of family.sections) expect(docs).toContain(`**${section.name}**`)
    }
    // O despejo antigo "⏱️ Jogo & tela" não volta.
    expect(docs).not.toContain('Jogo & tela')
  })

  it('marcas e estúdios de fora só aparecem em "Créditos e inspirações", nunca nos blocos', () => {
    const brands = /folio|bruno simon|coastal|vocation vista|profissiona|animal crossing/i
    const docs = world3DManifest.docs
    const credits = docs.indexOf('### Créditos e inspirações')
    expect(credits).toBeGreaterThan(0)
    expect(docs.slice(0, credits)).not.toMatch(brands)
    expect(world3DManifest.description ?? '').not.toMatch(/rapier|wasm|instanciad/i)
    const texts = world3DBlocks.map((block) => `${block.message0 ?? ''} ${block.tooltip ?? ''}`)
    expect(texts.filter((text) => brands.test(text))).toEqual([])
  })

  it('o som é carregado em ⚙️ Ao iniciar (não em 🧩 Meus moldes) no manual e na IA', () => {
    // A área é citada (o contrato das áreas exige), mas para dizer que o mundo NÃO a usa.
    expect(world3DManifest.docs).toContain('**🧩 Meus moldes** não é usada pelo Mundo 3D')
    expect(world3DManifest.docs).not.toContain('Meus moldes** ficam as receitas')
    expect(world3DPromptContext).toContain(
      'loadSound é preparação de\npartida e vai em ⚙️ Ao iniciar',
    )
    expect(world3DPromptContext).not.toContain('só receitas: carregar som')
  })

  it('todo bloco está na paleta em UM lugar só, sem fantasma e sem categoria "Mais"', () => {
    // Bloco fora da árvore some da paleta sem erro nenhum. A rede é a comum das
    // extensões (`paletteDrift.ts`); o `sz_w3d_start` oculto pode seguir citado.
    expect(paletteTreeDrift(WORLD_THREE_D_PALETTE, world3DBlocks)).toEqual(NO_PALETTE_TREE_DRIFT)
    expect(toolboxDrift(world3DToolboxCategory, world3DBlocks)).toEqual(NO_TOOLBOX_DRIFT)
  })

  it('cada método do runtime é citado no contexto da IA (ai.ts)', () => {
    const ctx = world3DPromptContext
    const missing = runtimeMethods().filter((m) => !ctx.includes(m))
    expect(missing).toEqual([])
  })

  it('os textos existem e cabem nos tetos do Zod', () => {
    expect(world3DManifest.docs.length).toBeGreaterThan(1000)
    expect(world3DManifest.docs.length).toBeLessThan(48_000)
    expect(world3DPromptContext.length).toBeGreaterThan(500)
    expect(world3DPromptContext.length).toBeLessThan(36_000)
    expect((world3DManifest.description ?? '').length).toBeLessThanOrEqual(500)
  })
})
