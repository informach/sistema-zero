import { describe, expect, it } from 'bun:test'
import { unzipSync } from 'fflate'
import type { Project } from '#core'
import { createProProject } from '../../components/code/pro-templates'
import { type ExportStep, exportProject } from '../exportProject'
import { identityMinifiers } from '../minify'

function classicProject(): Project {
  return {
    id: '01',
    name: 'Meu Jogo Álé',
    createdAt: 0,
    updatedAt: 0,
    mode: 'blocks',
    files: {
      'index.html':
        '<!doctype html><html><head><link rel="stylesheet" href="style.css" /></head><body><script src="script.js"></script></body></html>',
      'style.css': 'body{color:red}',
      'script.js': 'console.log(1)',
    },
    extraFiles: [],
    ir: { html: [], css: [], js: [], extensions: [] },
    blocksState: null,
    installedExtensions: [],
  }
}

async function unzipBlob(blob: Blob): Promise<Record<string, Uint8Array>> {
  return unzipSync(new Uint8Array(await blob.arrayBuffer()))
}

describe('exportProject', () => {
  it('classico: ZIP com public/ + assets de deploy, nome de arquivo slugificado, progresso', async () => {
    const steps: ExportStep[] = []
    const result = await exportProject(classicProject(), {
      minifiers: identityMinifiers,
      onProgress: (step) => steps.push(step),
    })
    expect(result.kind).toBe('classic')
    expect(result.filename).toBe('meu-jogo-ale-deploy.zip')
    expect(result.blob).toBeInstanceOf(Blob)
    expect(steps).toContain('collecting')
    expect(steps).toContain('zipping')
    expect(steps).toContain('done')

    const entries = await unzipBlob(result.blob)
    const names = Object.keys(entries)
    expect(names).toContain('public/index.html')
    expect(names).toContain('public/style.css')
    expect(names).toContain('Dockerfile')
    expect(names).toContain('railway.json')
    expect(names).toContain('README.md')
  })

  it('pro: embarca a arvore Vite + Dockerfile multi-stage, sem warnings', async () => {
    const project = await createProProject('02', 'App Pro', 'vanilla-vite')
    const result = await exportProject(project, { minifiers: identityMinifiers })
    expect(result.kind).toBe('pro')
    expect(result.warnings).toEqual([])

    const entries = await unzipBlob(result.blob)
    const names = Object.keys(entries)
    expect(names).toContain('package.json')
    expect(names).toContain('vite.config.ts')
    expect(names).toContain('src/main.ts')
    expect(names).toContain('Dockerfile')
    expect(new TextDecoder().decode(entries.Dockerfile)).toContain('npm run build')
  })

  it('pro: nao sobrescreve um Dockerfile que ja existe na arvore', async () => {
    const project = await createProProject('03', 'App Pro', 'vanilla-vite')
    project.tree = { ...project.tree, Dockerfile: { kind: 'file', content: 'FROM scratch' } }
    const result = await exportProject(project, { minifiers: identityMinifiers })
    const entries = await unzipBlob(result.blob)
    expect(new TextDecoder().decode(entries.Dockerfile)).toBe('FROM scratch')
  })

  it('pro: ZIP conserva lock e documentos autorais; guia novo reconhece lock', async () => {
    const project = await createProProject('04', 'Com lock', 'vanilla-vite')
    project.tree = {
      ...project.tree,
      'package-lock.json': { kind: 'file', content: '{"lockfileVersion":3}' },
      'LEIA-ME.txt': { kind: 'file', content: 'Leia do autor' },
      'CREDITS.md': { kind: 'file', content: 'Permissões do autor' },
    }
    const result = await exportProject(project, { minifiers: identityMinifiers })
    const entries = await unzipBlob(result.blob)
    const text = (name: string) => new TextDecoder().decode(entries[name])
    expect(text('package-lock.json')).toBe('{"lockfileVersion":3}')
    expect(text('LEIA-ME.txt')).toBe('Leia do autor')
    expect(text('CREDITS.md')).toBe('Permissões do autor')
    expect(text('README.md')).toContain('Railway roda `npm ci`')
    project.tree['README.md'] = { kind: 'file', content: 'README do autor' }
    const preserved = await unzipBlob((await exportProject(project)).blob)
    expect(new TextDecoder().decode(preserved['README.md'])).toBe('README do autor')
  })
})
