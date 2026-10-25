import { describe, expect, it } from 'bun:test'
import { defineExtensionExamples } from '../examples'
import {
  extensionBootstrapContext,
  extensionBootstrapVariant,
  extensionBootstrapVariantsKey,
  loadExtensionBootstrapScript,
  loadExtensionBootstrapScripts,
  uniqueExtensionIds,
} from '../runtime'
import type { ExtensionBootstrapContext, ExtensionDefinition } from '../types'

function extensionWith(
  loadBootstrapScript: (context?: ExtensionBootstrapContext) => Promise<string>,
  bootstrapVariant?: (context: ExtensionBootstrapContext) => string,
): ExtensionDefinition {
  return {
    manifest: {
      id: 'runtime-fixture',
      name: 'Runtime fixture',
      version: '1.0.0',
      description: 'Fixture',
      category: 'tests',
      official: true,
      enabledByDefault: false,
      permissions: [],
      docs: '',
    },
    examples: defineExtensionExamples(0, async () => []),
    blockly: {
      blocks: [],
      toolboxCategory: { kind: 'category', name: 'Fixture', colour: '#000', contents: [] },
    },
    runtime: { lifecycle: { target: 'core' }, loadBootstrapScript, bootstrapVariant },
  }
}

describe('loadExtensionBootstrapScript', () => {
  it('compartilha uma única carga entre consumidores concorrentes', async () => {
    let calls = 0
    const extension = extensionWith(async () => {
      calls += 1
      return 'window.RuntimeFixture = {};'
    })

    const first = loadExtensionBootstrapScript(extension)
    const second = loadExtensionBootstrapScript(extension)
    expect(first).toBe(second)
    expect(await first).toContain('RuntimeFixture')
    expect(calls).toBe(1)
  })

  it('remove falhas do cache para permitir nova tentativa', async () => {
    let calls = 0
    const extension = extensionWith(async () => {
      calls += 1
      if (calls === 1) throw new Error('chunk indisponível')
      return 'window.RuntimeFixture = {};'
    })

    await expect(loadExtensionBootstrapScript(extension)).rejects.toThrow('chunk indisponível')
    expect(await loadExtensionBootstrapScript(extension)).toContain('RuntimeFixture')
    expect(calls).toBe(2)
  })

  it('deduplica runtimes por id preservando a primeira ordem', async () => {
    const extension = extensionWith(async () => 'window.RuntimeFixture = {};')

    expect(await loadExtensionBootstrapScripts([extension, extension])).toEqual([
      'window.RuntimeFixture = {};',
    ])
    expect(uniqueExtensionIds(['game-2d', 'game-3d', 'game-2d', '', 'game-3d'])).toEqual([
      'game-2d',
      'game-3d',
    ])
  })
})

describe('loadExtensionBootstrapScript com contexto (variantes)', () => {
  /** Fixture no molde do Jogo 3D: `usaKit` no código = completo; senão, a variante enxuta. */
  function variantFixture() {
    const received: (ExtensionBootstrapContext | undefined)[] = []
    const extension = extensionWith(
      async (context) => {
        received.push(context)
        return context && !context.code.includes('usaKit') ? 'enxuto' : 'completo'
      },
      (context) => (context.code.includes('usaKit') ? '' : 'enxuto'),
    )
    return { extension, received }
  }

  it('memoiza por variante: dois códigos com a mesma variante não recompõem', async () => {
    const { extension, received } = variantFixture()
    const a = loadExtensionBootstrapScript(extension, { code: 'mover()' })
    const b = loadExtensionBootstrapScript(extension, { code: 'pular()' })
    expect(a).toBe(b)
    expect(await a).toBe('enxuto')
    expect(received).toHaveLength(1)
  })

  it('a variante padrão é a mesma entrada de quem chama sem contexto', async () => {
    const { extension, received } = variantFixture()
    const semContexto = loadExtensionBootstrapScript(extension)
    const comKit = loadExtensionBootstrapScript(extension, { code: 'usaKit()' })
    expect(comKit).toBe(semContexto)
    expect(await comKit).toBe('completo')
    // A variante padrão é carregada SEM contexto: o texto não pode depender do código.
    expect(received).toEqual([undefined])
    expect(await loadExtensionBootstrapScript(extension, { code: 'mover()' })).toBe('enxuto')
    expect(received).toHaveLength(2)
  })

  it('a falha de uma variante sai do cache sem levar a outra junto', async () => {
    let fail = true
    const extension = extensionWith(
      async (context) => {
        if (context && fail) throw new Error('chunk indisponível')
        return context ? 'enxuto' : 'completo'
      },
      () => 'enxuto',
    )
    expect(await loadExtensionBootstrapScript(extension)).toBe('completo')
    await expect(loadExtensionBootstrapScript(extension, { code: '' })).rejects.toThrow()
    fail = false
    expect(await loadExtensionBootstrapScript(extension, { code: '' })).toBe('enxuto')
  })

  it('sem bootstrapVariant a extensão tem uma variante só', async () => {
    let calls = 0
    const extension = extensionWith(async () => {
      calls += 1
      return 'unico'
    })
    expect(extensionBootstrapVariant(extension, { code: 'x' })).toBe('')
    await loadExtensionBootstrapScript(extension, { code: 'x' })
    await loadExtensionBootstrapScript(extension)
    expect(calls).toBe(1)
  })

  it('o contexto junta html, script e extras; a chave lista id=variante', async () => {
    const context = extensionBootstrapContext({
      html: '<p>a</p>',
      js: 'b()',
      extraFiles: [{ content: 'c()' }],
    })
    expect(context.code).toBe('<p>a</p>\nb()\nc()')
    expect(extensionBootstrapContext({}).code).toBe('\n')
    const { extension } = variantFixture()
    expect(extensionBootstrapVariantsKey([extension, extension], context)).toBe(
      'runtime-fixture=enxuto',
    )
    expect(extensionBootstrapVariantsKey([extension])).toBe('runtime-fixture=')
    expect(await loadExtensionBootstrapScripts([extension, extension], { code: 'usaKit' })).toEqual(
      ['completo'],
    )
  })
})
