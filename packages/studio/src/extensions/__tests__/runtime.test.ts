import { describe, expect, it } from 'bun:test'
import { defineExtensionExamples } from '../examples'
import {
  loadExtensionBootstrapScript,
  loadExtensionBootstrapScripts,
  uniqueExtensionIds,
} from '../runtime'
import type { ExtensionDefinition } from '../types'

function extensionWith(loadBootstrapScript: () => Promise<string>): ExtensionDefinition {
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
    runtime: { lifecycle: { target: 'core' }, loadBootstrapScript },
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
