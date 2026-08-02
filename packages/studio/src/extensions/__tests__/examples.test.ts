import { describe, expect, it } from 'bun:test'
import { defineExtensionExamples, loadExtensionExamples } from '../examples'
import type { ExtensionDefinition, ExtensionExample } from '../types'

const validExample: ExtensionExample = {
  name: 'Exemplo mínimo',
  experience: 'game',
  ir: {
    version: 2,
    html: [],
    css: [],
    behavior: { start: [], events: [], loops: [] },
    extensions: [],
  },
}

function extensionWith(
  count: number,
  load: () => Promise<readonly ExtensionExample[]>,
): ExtensionDefinition {
  return {
    manifest: {
      id: 'fixture',
      name: 'Fixture',
      version: '1.0.0',
      description: 'Extensão usada somente no teste.',
      category: 'tests',
      official: true,
      enabledByDefault: false,
      permissions: [],
      docs: '',
    },
    examples: defineExtensionExamples(count, load),
    blockly: {
      blocks: [],
      toolboxCategory: { kind: 'category', name: 'Fixture', colour: '#000', contents: [] },
    },
    runtime: {
      bootstrapScript: '',
      lifecycle: { target: 'core' },
    },
  }
}

describe('loadExtensionExamples', () => {
  it('compartilha a Promise entre consumidores concorrentes e congela a ordem validada', async () => {
    let calls = 0
    const extension = extensionWith(2, async () => {
      calls += 1
      return [validExample, { ...validExample, name: 'Segundo' }]
    })

    const first = loadExtensionExamples(extension)
    const second = loadExtensionExamples(extension)
    expect(first).toBe(second)

    const examples = await first
    expect(calls).toBe(1)
    expect(examples.map((example) => example.name)).toEqual(['Exemplo mínimo', 'Segundo'])
    expect(Object.isFrozen(examples)).toBe(true)
  })

  it('rejeita quantidade divergente e exemplos malformados', async () => {
    await expect(
      loadExtensionExamples(extensionWith(2, async () => [validExample])),
    ).rejects.toThrow('2')
    await expect(
      loadExtensionExamples(
        extensionWith(1, async () => [{ ...validExample, experience: 'invalid' } as never]),
      ),
    ).rejects.toThrow()
  })

  it('remove falhas do cache para permitir uma nova tentativa', async () => {
    let calls = 0
    const extension = extensionWith(1, async () => {
      calls += 1
      if (calls === 1) throw new Error('falha transitória')
      return [validExample]
    })

    await expect(loadExtensionExamples(extension)).rejects.toThrow('falha transitória')
    expect(await loadExtensionExamples(extension)).toHaveLength(1)
    expect(calls).toBe(2)
  })
})
