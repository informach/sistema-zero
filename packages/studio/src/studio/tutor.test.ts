import { describe, expect, it } from 'bun:test'
import { createEmptyProject } from '../core/project'
import { buildStudioTutorContext } from './tutor'

describe('buildStudioTutorContext', () => {
  it('envia estrutura compacta e nunca envia assets ou código no modo Blocos', () => {
    const project = {
      ...createEmptyProject('projeto-1', 'Jogo'),
      mode: 'blocks' as const,
      blocksState: {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              type: 'sz_js_on_start',
              id: 'start-1',
              inputs: {
                BODY: { block: { type: 'sz_js_log', id: 'log-1' } },
              },
            },
          ],
        },
      },
      files: {
        'index.html': '<img src="data:image/png;base64,SEGREDO">',
        'style.css': '',
        'script.js': 'console.log("não enviar")',
      },
      assets: [
        {
          id: 'asset-1',
          name: 'heroi',
          kind: 'image' as const,
          source: 'upload' as const,
          dataUrl: 'data:image/png;base64,SEGREDO',
        },
      ],
    }
    const context = buildStudioTutorContext({
      project,
      selectedBlockId: 'log-1',
      lastError: 'Falhou',
    })

    expect(context.code).toBeUndefined()
    expect(JSON.stringify(context)).not.toContain('SEGREDO')
    expect(context.blocks).toEqual([
      { id: 'start-1', type: 'sz_js_on_start', topLevel: true },
      { id: 'log-1', type: 'sz_js_log', parentId: 'start-1', input: 'BODY', topLevel: false },
    ])
  })

  it('inclui código curto na Ponte e remove data URLs embutidas', () => {
    const project = {
      ...createEmptyProject('projeto-2', 'Ponte'),
      mode: 'bridge' as const,
      files: {
        'index.html': '<p>Oi</p>',
        'style.css': '',
        'script.js': 'const img = "data:image/png;base64,NAO_VAI"',
      },
    }
    const context = buildStudioTutorContext({ project, selectedBlockId: null, lastError: null })

    expect(context.code?.find((file) => file.path === 'script.js')?.content).toContain(
      '[asset removido]',
    )
    expect(JSON.stringify(context)).not.toContain('NAO_VAI')
  })
})
