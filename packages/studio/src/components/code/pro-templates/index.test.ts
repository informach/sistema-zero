import { describe, expect, it } from 'bun:test'
import { normalizeProPath } from '#core'
import {
  createProProject,
  getProTemplate,
  listProTemplates,
  loadProTemplate,
  PRO_TEMPLATES,
} from './index'

describe('PRO_TEMPLATES', () => {
  const templates = listProTemplates()

  it('oferece os modelos web e os kits 2D e 3D', () => {
    expect(Object.keys(PRO_TEMPLATES).sort()).toEqual([
      'canvas-grid-arena',
      'canvas-puzzle',
      'canvas-survival',
      'phaser-arcade',
      'phaser-platformer',
      'phaser-tactics',
      'react-ts',
      'three-action',
      'three-exploration',
      'three-js',
      'three-tactics',
      'three-ts',
      'vanilla-js',
      'vanilla-vite',
    ])
  })

  for (const metadata of listProTemplates()) {
    describe(metadata.id, () => {
      it('package.json é parseável, module e tem scripts.dev', async () => {
        const template = await loadProTemplate(metadata.id)
        const pkgNode = template.tree['package.json']
        expect(pkgNode?.kind).toBe('file')
        const pkg = JSON.parse(pkgNode?.kind === 'file' ? pkgNode.content : '{}') as {
          type: string
          scripts: Record<string, string>
          dependencies: Record<string, string>
          devDependencies: Record<string, string>
        }
        expect(pkg.type).toBe('module')
        expect(pkg.scripts.dev).toContain('vite')
        expect(pkg.scripts.dev).toContain('--host')
      })

      it('todas as deps são versões fixas (sem ^ ~ ranges)', async () => {
        const template = await loadProTemplate(metadata.id)
        const pkgNode = template.tree['package.json']
        const pkg = JSON.parse(pkgNode?.kind === 'file' ? pkgNode.content : '{}') as {
          dependencies: Record<string, string>
          devDependencies: Record<string, string>
        }
        for (const version of [
          ...Object.values(pkg.dependencies ?? {}),
          ...Object.values(pkg.devDependencies ?? {}),
        ]) {
          expect(version).toMatch(/^\d+\.\d+\.\d+$/)
        }
      })

      it('todo caminho é normalizável e toda pasta-pai existe como dir', async () => {
        const template = await loadProTemplate(metadata.id)
        for (const [path, node] of Object.entries(template.tree)) {
          const norm = normalizeProPath(path, { expectFile: node.kind === 'file' })
          expect(norm).toBe(path)
          // pais explícitos
          const segments = path.split('/')
          for (let i = 1; i < segments.length; i++) {
            const dir = segments.slice(0, i).join('/')
            expect(template.tree[dir]?.kind).toBe('dir')
          }
        }
      })
    })
  }

  it('expõe templates por listagem e lookup', () => {
    expect(templates.length).toBe(14)
    expect(getProTemplate('react-ts')?.id).toBe('react-ts')
    expect(getProTemplate('vanilla-js')?.id).toBe('vanilla-js')
    expect(getProTemplate('three-js')?.id).toBe('three-js')
    expect(getProTemplate('inexistente')).toBeUndefined()
    expect(getProTemplate('__proto__')).toBeUndefined()
    expect(templates.every((template) => !('tree' in template))).toBe(true)
  })
})

describe('createProProject', () => {
  it('produz um Project pro válido a partir do template', async () => {
    const project = await createProProject('p1', 'Meu App', 'react-ts')
    expect(project.kind).toBe('pro')
    expect(project.mode).toBe('code')
    expect(project.proMeta?.templateId).toBe('react-ts')
    expect(project.proMeta?.devScript).toBe('dev')
    expect(project.tree?.src?.kind).toBe('dir')
    expect(project.tree?.['src/App.tsx']?.kind).toBe('file')
    // files canônico segue válido (nunca usado em pro, mas satisfaz o tipo)
    expect(typeof project.files['index.html']).toBe('string')
  })

  it('lança para template desconhecido', async () => {
    await expect(createProProject('p2', 'X', 'nope')).rejects.toThrow()
  })
})
