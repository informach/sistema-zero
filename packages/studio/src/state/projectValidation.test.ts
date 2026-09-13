import { describe, expect, it } from 'bun:test'
import { createEmptyProject } from '../core/project'
import { retainProjectTools } from '../core/projectDocument'
import { prepareProjectForHost, validateStudioCreationSnapshot } from './projectValidation'

describe('fronteira compartilhada de projetos', () => {
  it('preserva código manual, arquivos extras, áudio e referências da biblioteca', async () => {
    const source = {
      ...createEmptyProject('conteudo', 'Conteúdo'),
      formatVersion: 1,
      mode: 'bridge' as const,
      files: {
        'index.html': '<p>Oi</p>',
        'style.css': 'p { color: red }',
        'script.js': '// meu código\nSZGame2D.playJump();',
      },
      extraFiles: [
        {
          name: 'aux.js',
          language: 'javascript' as const,
          content: '// extra\nexport const a = 7;',
        },
      ],
      assets: [
        {
          id: 'som',
          kind: 'audio' as const,
          name: 'som',
          dataUrl: 'data:audio/wav;base64,AAAA',
          source: 'library' as const,
          libId: 'meu-som',
          libOrigin: 'pinta' as const,
          libRevision: 3,
        },
      ],
    }
    const project = await prepareProjectForHost(source)
    expect(project?.assets).toEqual(source.assets)
    expect(project?.extraFiles).toEqual(source.extraFiles)
    expect(project?.files['script.js']).toBe('// meu código\nSZGame2D.playFx("jump");')
    expect(project?.formatVersion).toBe(2)
    expect((await prepareProjectForHost(project))?.files).toEqual(project?.files)
    expect(source.formatVersion).toBe(1)
  })

  it('valida o formato do programa dentro do manifesto e a identidade da criação', () => {
    const project = createEmptyProject('manifesto', 'Recursos')
    const manifest = {
      format: 'sz-studio-parts',
      version: 1,
      program: project,
      assets: ['a'.repeat(64)],
    }
    expect(validateStudioCreationSnapshot(manifest, project.id).formatVersion).toBe(2)
    expect(() =>
      validateStudioCreationSnapshot(
        { ...manifest, program: { ...project, formatVersion: 1 } },
        project.id,
      ),
    ).toThrow('convertido')
    expect(() => validateStudioCreationSnapshot(manifest, 'outro')).toThrow('pertence')
    expect(() =>
      validateStudioCreationSnapshot({ ...manifest, assets: ['inválido'] }, project.id),
    ).toThrow('manifesto')
  })

  it('retém as ferramentas usadas depois de apagar sua última instância', () => {
    const state = {
      blocks: {
        blocks: [
          { type: 'sz_js_const_create', inputs: { VALUE: { shadow: { type: 'sz_val_number' } } } },
        ],
      },
    }
    const used = retainProjectTools([], state)
    expect(retainProjectTools(used, null)).toEqual(['sz_js_const_create', 'sz_val_number'])
    expect(retainProjectTools(used, { blocks: { blocks: [] } })).toEqual(used)
  })
})
