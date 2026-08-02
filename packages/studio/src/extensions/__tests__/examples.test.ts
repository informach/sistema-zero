import { describe, expect, it } from 'bun:test'
import {
  defineExtensionExamples,
  loadExtensionExampleCatalogs,
  loadExtensionExamples,
} from '../examples'
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
    expect(Object.isFrozen(examples[0])).toBe(true)
    expect(Object.isFrozen(examples[0]?.ir)).toBe(true)
    expect(Object.isFrozen(examples[0]?.ir.behavior)).toBe(true)
  })

  it('devolve a saída sanitizada pelo schema em vez do objeto de entrada', async () => {
    const input = { ...validExample, campoDesconhecido: 'não deve escapar' }
    const [example] = await loadExtensionExamples(extensionWith(1, async () => [input]))

    expect(example).not.toBe(input)
    expect(Reflect.has(example ?? {}, 'campoDesconhecido')).toBe(false)
  })

  it('preserva metadados editoriais válidos e limita listas malformadas', async () => {
    const editorial: ExtensionExample = {
      ...validExample,
      difficulty: 'beginner',
      concepts: ['sprites', 'colisão'],
      genre: 'arcade',
      recommendedOrder: 1,
      featured: true,
    }
    const [example] = await loadExtensionExamples(extensionWith(1, async () => [editorial]))

    expect(example).toMatchObject({
      difficulty: 'beginner',
      concepts: ['sprites', 'colisão'],
      genre: 'arcade',
      recommendedOrder: 1,
      featured: true,
    })
    await expect(
      loadExtensionExamples(
        extensionWith(1, async () => [
          { ...validExample, concepts: Array.from({ length: 9 }, () => 'conceito') },
        ]),
      ),
    ).rejects.toThrow()
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

  it('isola falhas e preserva os catálogos carregados com sucesso', async () => {
    const working = extensionWith(1, async () => [validExample])
    working.manifest.id = 'working'
    const failing = extensionWith(1, async () => {
      throw new Error('chunk indisponível')
    })
    failing.manifest.id = 'failing'

    const result = await loadExtensionExampleCatalogs([working, failing])

    expect(result.loaded).toEqual([['working', [validExample]]])
    expect(result.failed.map((failure) => failure.extensionId)).toEqual(['failing'])
    expect(result.failed[0]?.error).toBeInstanceOf(Error)
  })
})
