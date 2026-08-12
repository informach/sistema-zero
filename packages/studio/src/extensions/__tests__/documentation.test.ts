import { describe, expect, it } from 'bun:test'
import { defineExtensionDocumentation, loadExtensionDocs } from '../documentation'
import { defineExtensionExamples } from '../examples'
import type { ExtensionDefinition } from '../types'

function extensionWith(documentation?: ExtensionDefinition['documentation']): ExtensionDefinition {
  return {
    manifest: {
      id: 'fixture-docs',
      name: 'Fixture Docs',
      version: '1.0.0',
      description: 'Extensão usada para testar documentação lazy.',
      category: 'tests',
      official: true,
      enabledByDefault: false,
      permissions: [],
      docs: 'Resumo imediato.',
    },
    documentation,
    examples: defineExtensionExamples(0, async () => []),
    blockly: {
      blocks: [],
      toolboxCategory: { kind: 'category', name: 'Fixture', colour: '#000', contents: [] },
    },
    runtime: { bootstrapScript: '', lifecycle: { target: 'core' } },
  }
}

describe('loadExtensionDocs', () => {
  it('usa a documentação curta do manifest quando não há chunk completo', async () => {
    expect(await loadExtensionDocs(extensionWith())).toBe('Resumo imediato.')
  })

  it('compartilha a Promise e carrega o manual completo uma única vez', async () => {
    let calls = 0
    const extension = extensionWith(
      defineExtensionDocumentation(async () => {
        calls += 1
        return '# Manual completo\n\nConteúdo carregado sob demanda.'
      }),
    )

    const first = loadExtensionDocs(extension)
    const second = loadExtensionDocs(extension)

    expect(first).toBe(second)
    expect(await first).toContain('Manual completo')
    expect(calls).toBe(1)
  })

  it('remove falhas do cache para permitir uma nova tentativa', async () => {
    let calls = 0
    const extension = extensionWith(
      defineExtensionDocumentation(async () => {
        calls += 1
        if (calls === 1) throw new Error('chunk indisponível')
        return '# Manual recuperado'
      }),
    )

    await expect(loadExtensionDocs(extension)).rejects.toThrow('chunk indisponível')
    expect(await loadExtensionDocs(extension)).toBe('# Manual recuperado')
    expect(calls).toBe(2)
  })

  it('rejeita documentação completa acima do teto do manifest', async () => {
    const extension = extensionWith(defineExtensionDocumentation(async () => 'x'.repeat(60_001)))

    await expect(loadExtensionDocs(extension)).rejects.toThrow()
  })
})
