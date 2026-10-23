import { describe, expect, it } from 'bun:test'
import { createEmptyProject, type Project } from '#core'
import { refineJavaScriptProjectDocument } from '../../state/javaScriptProjectValidation'
import { renderProjectToPreviewDoc, renderProjectToPreviewDocAsync } from '../renderProject'

function projectWith(overrides: Partial<Project> = {}): Project {
  const base = createEmptyProject('p1', 'Meu Jogo')
  return {
    ...base,
    files: {
      'index.html': '<body><canvas id="c"></canvas></body>',
      'style.css': 'body{margin:0}',
      'script.js': 'console.log("MARCADOR_DO_ALUNO")',
    },
    ...overrides,
  }
}

describe('renderProjectToPreviewDoc', () => {
  it('captures v3 source and host policy before loading its adapter or resources', async () => {
    const project = refineJavaScriptProjectDocument({
      ...projectWith(),
      formatVersion: 3,
      programmingLanguage: 'javascript',
      kind: 'classic',
      runtime: {
        profileId: 'javascript-test',
        releaseId: 'test-1',
        manifestSha256: 'a'.repeat(64),
      },
    })
    const options = {
      parentOrigin: 'https://example.test',
      fetchAllowedOrigins: ['https://allowed.test'],
    }
    const expected = await renderProjectToPreviewDocAsync(project, options)
    const pending = renderProjectToPreviewDocAsync(project, options)
    project.files['script.js'] = 'console.log("changed after capture")'
    options.parentOrigin = 'https://changed.test'
    options.fetchAllowedOrigins.push('https://changed.test')
    expect(await pending).toBe(expected)
  })

  it('uses the same public-player recipe for current and v3 JavaScript documents', async () => {
    const source = projectWith({
      installedExtensions: [{ id: 'game-2d', version: '1.0.0', installedAt: 0 }],
      assets: [
        {
          id: 'heroi',
          name: 'heroi',
          kind: 'image',
          dataUrl: 'data:image/png;base64,AAAA',
          source: 'upload',
        },
      ],
      extraFiles: [{ name: 'helper.js', language: 'javascript', content: 'var helper = 42' }],
    })
    const document = refineJavaScriptProjectDocument({
      ...source,
      formatVersion: 3,
      programmingLanguage: 'javascript',
      kind: 'classic',
      runtime: {
        profileId: 'javascript-test',
        releaseId: 'test-1',
        manifestSha256: 'a'.repeat(64),
      },
    })
    const options = { securityProfile: 'strict' as const, parentOrigin: 'https://example.test' }
    expect(await renderProjectToPreviewDocAsync(document, options)).toBe(
      await renderProjectToPreviewDocAsync(source, options),
    )
  })

  it('diagnóstico do host é opt-in e não aparece no player comum', async () => {
    const source = projectWith()
    expect(await renderProjectToPreviewDocAsync(source)).not.toContain(
      'window.__SZSTUDIO_RUNTIME_INSPECTORS =',
    )
    expect(await renderProjectToPreviewDocAsync(source, { runtimeInspection: true })).toContain(
      'window.__SZSTUDIO_RUNTIME_INSPECTORS = Object.create(null)',
    )
  })
  it('monta um doc auto-suficiente com CSP e o JS do aluno', async () => {
    const doc = await renderProjectToPreviewDocAsync(projectWith())
    expect(typeof doc).toBe('string')
    expect(doc.length).toBeGreaterThan(0)
    // A CSP do preview viaja DENTRO do doc (independente do host).
    expect(doc).toContain('Content-Security-Policy')
    // O JS do aluno é externalizado para data: URL — decodifica e confere o marcador.
    const matches = [...doc.matchAll(/src="data:text\/javascript;base64,([^"]+)"/gi)]
    const decoded = matches
      .map((m) => Buffer.from(m[1] ?? '', 'base64').toString('utf-8'))
      .join('\n')
    expect(decoded).toContain('MARCADOR_DO_ALUNO')
  })

  it('NUNCA habilita allow-same-origin (o sandbox é do iframe; o doc não o concede)', async () => {
    const doc = await renderProjectToPreviewDocAsync(projectWith())
    expect(doc).not.toContain('allow-same-origin')
  })

  it('inclui o runtime da extensão instalada (game-2d) e o manifesto de assets', async () => {
    const doc = await renderProjectToPreviewDocAsync(
      projectWith({
        installedExtensions: [{ id: 'game-2d', version: '1.0.0', installedAt: 0 }],
        assets: [
          {
            id: 'heroi',
            name: 'heroi',
            kind: 'image',
            dataUrl: 'data:image/png;base64,AAAA',
            source: 'upload',
          },
        ],
      }),
    )
    // O bootstrap da extensão expõe a API global do game-2d.
    expect(doc).toContain('SZGame2D')
    // O asset entra no manifesto semeado em window.__SZGAME_ASSETS.
    expect(doc).toContain('heroi')
    expect(doc).toContain('data:image/png;base64,AAAA')
  })

  it('recusa instalações conflitantes antes de executar o projeto', async () => {
    const installation = { id: 'game-2d', version: '1.0.0', installedAt: 0 }
    await expect(
      renderProjectToPreviewDocAsync(
        projectWith({ installedExtensions: [installation, { ...installation, installedAt: 1 }] }),
      ),
    ).rejects.toThrow('$.installedExtensions')
  })

  it('expõe nome assíncrono explícito e mantém o alias depreciado', async () => {
    const project = projectWith()
    const explicitPromise = renderProjectToPreviewDocAsync(project)
    const legacyAliasPromise = renderProjectToPreviewDoc(project)

    expect(explicitPromise).toBeInstanceOf(Promise)
    expect(legacyAliasPromise).toBeInstanceOf(Promise)
    expect(await legacyAliasPromise).toBe(await explicitPromise)
  })

  it('renderiza projetos legados incompletos sem quebrar o player público', async () => {
    const doc = await renderProjectToPreviewDocAsync({
      name: 'Projeto legado',
      files: { 'index.html': '', 'style.css': '', 'script.js': '' },
    } as Project)
    expect(doc).toContain('Content-Security-Policy')
  })

  it('dois projetos diferentes produzem docs diferentes', async () => {
    const a = await renderProjectToPreviewDocAsync(
      projectWith({ files: { 'index.html': '', 'style.css': '', 'script.js': 'var A=1' } }),
    )
    const b = await renderProjectToPreviewDocAsync(
      projectWith({ files: { 'index.html': '', 'style.css': '', 'script.js': 'var B=2' } }),
    )
    expect(a).not.toBe(b)
  })
})
