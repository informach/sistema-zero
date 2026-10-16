import { describe, expect, it } from 'bun:test'
import { createEmptyProject } from '../core/project'
import { buildStudioTutorContext } from './tutor'

it('shares confirmed project decisions with explain and investigate, never with classic', () => {
  const project = {
    ...createEmptyProject('decisions', 'Decisões'),
    kind: 'pro' as const,
    mode: 'code' as const,
    proMeta: {
      devScript: 'dev',
      templateId: 'vanilla-vite',
      assistance: {
        version: 1 as const,
        briefing: 'Uma arena sem violência',
        decisions: [
          { id: 'yes', text: 'Coletar estrelas', confirmed: true, provenance: 'learner' as const },
          {
            id: 'no',
            text: 'Adicionar inimigos',
            confirmed: false,
            provenance: 'suggestion' as const,
          },
        ],
        questions: [
          { id: 'q', text: 'Quantas estrelas?', status: 'answered' as const, answer: 'Cinco' },
        ],
      },
    },
  }
  for (const intent of ['explain', 'investigate'] as const) {
    const result = buildStudioTutorContext({
      project,
      intent,
      selectedBlockId: null,
      lastError: null,
    })
    expect(result.pro?.decisions).toEqual({
      version: 1,
      summary: 'Uma arena sem violência\nColetar estrelas\nQuantas estrelas? Cinco',
    })
  }
  expect(
    buildStudioTutorContext({
      project: { ...project, kind: 'classic', mode: 'blocks' },
      selectedBlockId: null,
      lastError: null,
    }).pro,
  ).toBeUndefined()
})

describe('buildStudioTutorContext', () => {
  it('identifica o kit Pro de origem sem enviar fontes completas nem contaminar blocos', () => {
    const project = {
      ...createEmptyProject('kit', 'Kit'),
      kind: 'pro' as const,
      mode: 'code' as const,
      proMeta: { devScript: 'dev', templateId: 'three-action' },
    }
    const context = buildStudioTutorContext({ project, selectedBlockId: null, lastError: null })
    expect(context.pro?.templateId).toBe('three-action')
    const classic = buildStudioTutorContext({
      project: { ...project, kind: 'classic', mode: 'blocks' },
      selectedBlockId: null,
      lastError: null,
    })
    expect(classic.pro).toBeUndefined()
  })
  it('prioriza arquivo ativo e erros mesmo fora dos primeiros arquivos; isola o projeto', () => {
    const project = {
      ...createEmptyProject('pro-context', 'Jogo grande'),
      kind: 'pro' as const,
      mode: 'code' as const,
      tree: Object.fromEntries(
        Array.from({ length: 50 }, (_, i) => [
          `src/file-${i}.ts`,
          { kind: 'file' as const, content: `export const item${i} = ${i}` },
        ]),
      ),
    }
    const editor = {
      projectId: project.id,
      activeFile: 'src/file-49.ts',
      installation: 'ready' as const,
      diagnostics: [
        { path: 'src/file-48.ts', code: 2322, line: 1, message: 'API_KEY="sk-test-secret"' },
        { path: '.env', code: 1, line: 1, message: 'secret' },
      ],
      installedPackages: [{ name: 'three', version: '0.180.0' }],
    }
    const context = buildStudioTutorContext({
      project,
      selectedBlockId: null,
      lastError: null,
      proEditor: editor,
    })
    expect(context.code?.slice(0, 2).map((file) => file.path)).toEqual([
      'src/file-49.ts',
      'src/file-48.ts',
    ])
    expect(context.pro?.diagnostics).toHaveLength(1)
    expect(JSON.stringify(context)).not.toContain('sk-test-secret')
    expect(context.pro?.installedPackages).toEqual(editor.installedPackages)
    const switched = buildStudioTutorContext({
      project,
      selectedBlockId: null,
      lastError: null,
      proEditor: { ...editor, projectId: 'other' },
    })
    expect(switched.pro?.activeFile).toBeUndefined()
    expect(switched.pro?.installedPackages).toEqual([])
  })
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

  it('a Ponte continua no modo normal e não envia código', () => {
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

    expect(context.code).toBeUndefined()
    expect(JSON.stringify(context)).not.toContain('NAO_VAI')
  })

  it('não envia arquivos secretos nem valores de credenciais ao BFF', () => {
    const project = {
      ...createEmptyProject('projeto-3', 'Ponte segura'),
      kind: 'pro' as const,
      mode: 'code' as const,
      tree: {
        'script.js': {
          kind: 'file' as const,
          content: 'const API_KEY = "sk-live-secret"\nconsole.log("ok")',
        },
        '.env': { kind: 'file' as const, content: 'OPENROUTER_API_KEY=sk-env-secret' },
        'image.js': {
          kind: 'file' as const,
          content: 'const img = "data:image/png;base64,NAO_VAI"',
        },
      },
    }

    const context = buildStudioTutorContext({ project, selectedBlockId: null, lastError: null })

    expect(context.code?.some((file) => file.path === '.env')).toBe(false)
    expect(JSON.stringify(context)).not.toContain('sk-live-secret')
    expect(JSON.stringify(context)).not.toContain('sk-env-secret')
    expect(JSON.stringify(context)).not.toContain('NAO_VAI')
    expect(context.code?.find((file) => file.path === 'script.js')?.content).toContain(
      '[segredo removido]',
    )
  })

  it('redige segredo com aspas incompletas antes de truncar o arquivo', () => {
    const project = {
      ...createEmptyProject('projeto-4', 'Ponte truncada'),
      kind: 'pro' as const,
      mode: 'code' as const,
      tree: {
        'script.js': {
          kind: 'file' as const,
          content: `const apiKey = "${'segredo-sem-fechar'.repeat(2_000)}`,
        },
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
      kind: 'pro' as const,
      mode: 'code' as const,
      tree: {
        'script.js': {
          kind: 'file' as const,
          content: 'conectar("postgres://alice:pw1234@db.internal/app")',
        },
      },
    }

    const context = buildStudioTutorContext({ project, selectedBlockId: null, lastError: null })
    const serialized = JSON.stringify(context)

    expect(serialized).not.toContain('alice')
    expect(serialized).not.toContain('pw1234')
    expect(serialized).toContain('[segredo removido]')
  })
})
