import { describe, expect, it } from 'bun:test'
import type { ExtensionToolboxCategory } from '#extensions'
import { world3DPromptContext } from '../ai'
import { world3DToolboxCategory } from '../blocks'
import { world3DManifest } from '../manifest'
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
