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

  it('não envia arquivos secretos nem valores de credenciais ao BFF', () => {
    const project = {
      ...createEmptyProject('projeto-3', 'Ponte segura'),
      mode: 'bridge' as const,
      files: {
        'index.html': '<p>Oi</p>',
        'style.css': '',
        'script.js': 'const API_KEY = "sk-live-secret"\nconsole.log("ok")',
      },
      extraFiles: [
        {
          name: '.env',
          language: 'typescript' as const,
          content: 'OPENROUTER_API_KEY=sk-env-secret',
        },
      ],
    }

    const context = buildStudioTutorContext({ project, selectedBlockId: null, lastError: null })

    expect(context.code?.some((file) => file.path === '.env')).toBe(false)
    expect(JSON.stringify(context)).not.toContain('sk-live-secret')
    expect(JSON.stringify(context)).not.toContain('sk-env-secret')
    expect(context.code?.find((file) => file.path === 'script.js')?.content).toContain(
      '[segredo removido]',
    )
  })

  it('redige segredo com aspas incompletas antes de truncar o arquivo', () => {
    const project = {
      ...createEmptyProject('projeto-4', 'Ponte truncada'),
      mode: 'bridge' as const,
      files: {
        'index.html': '',
        'style.css': '',
        'script.js': `const apiKey = "${'segredo-sem-fechar'.repeat(2_000)}`,
      },
    }

    const context = buildStudioTutorContext({ project, selectedBlockId: null, lastError: null })
    const content = context.code?.find((file) => file.path === 'script.js')?.content ?? ''

    expect(content).toContain('[segredo removido]')
    expect(content).not.toContain('segredo-sem-fechar')
  })

  it('remove credenciais embutidas em URLs de conexão', () => {
    const project = {
      ...createEmptyProject('projeto-5', 'Ponte com banco'),
      mode: 'bridge' as const,
      files: {
        'index.html': '',
        'style.css': '',
        'script.js': 'conectar("postgres://alice:pw1234@db.internal/app")',
      },
    }

    const context = buildStudioTutorContext({ project, selectedBlockId: null, lastError: null })
    const serialized = JSON.stringify(context)

    expect(serialized).not.toContain('alice')
    expect(serialized).not.toContain('pw1234')
    expect(serialized).toContain('[segredo removido]')
  })
})
