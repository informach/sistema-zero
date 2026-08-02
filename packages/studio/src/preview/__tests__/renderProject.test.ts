import { describe, expect, it } from 'bun:test'
import { createEmptyProject, type Project } from '#core'
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

  it('injeta cada extensão uma única vez mesmo em snapshot duplicado', async () => {
    const installation = { id: 'game-2d', version: '1.0.0', installedAt: 0 }
    const doc = await renderProjectToPreviewDocAsync(
      projectWith({ installedExtensions: [installation, { ...installation, installedAt: 1 }] }),
    )

    expect(doc.match(/window\.SZGame2D = \{/g)).toHaveLength(1)
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
