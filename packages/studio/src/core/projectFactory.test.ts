import { beforeAll, describe, expect, test } from 'bun:test'
import { sha256Hex } from '@sistemazero/core/creations'
import { StudioProjectDocumentSchema } from '@sistemazero/core/studio/project-document'
import {
  createStudioRuntimeCatalog,
  createStudioRuntimeRelease,
  selectStudioRuntimeRelease,
} from '@sistemazero/core/studio/runtime-catalog'
import {
  createEditableStudioProject,
  createStudioProjectDocument,
  type StudioProjectFactoryContext,
} from './projectFactory'
import type { ProjectTree } from './proProject'

let javascript: StudioProjectFactoryContext
let python: StudioProjectFactoryContext
beforeAll(async () => {
  const contexts = await Promise.all(
    (['javascript', 'python'] as const).map(async (language) => {
      const release = await createStudioRuntimeRelease({
        manifestVersion: 1,
        profileId: `${language}-test`,
        releaseId: 'test-1',
        programmingLanguage: language,
        kinds: ['classic', 'pro'],
        modes: ['blocks', 'bridge', 'code'],
        capabilities: ['edit', 'export-source'],
        extensions: [],
        sourceTargets: ['browser', 'desktop'],
        requiredBrowserFeatures: [],
        artifacts: [
          {
            path: 'test-runtime.txt',
            sha256: await sha256Hex('Structural factory fixture; not executable.'),
          },
        ],
        ...(language === 'python'
          ? { python: { version: '3.14.2', packages: [], providedModules: [], features: [] } }
          : {}),
      })
      const catalog = await createStudioRuntimeCatalog({
        releases: [release],
        profiles: [
          {
            id: release.profileId,
            languages: [language],
            kinds: ['classic', 'pro'],
            modes: ['blocks', 'bridge', 'code'],
            levels: [],
            releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
          },
        ],
      })
      return {
        catalog,
        releaseStatus: 'active' as const,
        runtime: {
          profileId: release.profileId,
          releaseId: release.releaseId,
          manifestSha256: release.manifestSha256,
        },
      }
    }),
  )
  javascript = contexts[0]!
  python = contexts[1]!
})

describe('project creation with an explicit host environment', () => {
  test('JavaScript classic is the default, retaining the current empty IR and web files', async () => {
    const project = await createStudioProjectDocument(
      { id: 'default', name: '<Meu jogo>', now: 123 },
      javascript,
    )
    expect(project).toMatchObject({
      programmingLanguage: 'javascript',
      kind: 'classic',
      mode: 'blocks',
      createdAt: 123,
      updatedAt: 123,
      runtime: javascript.runtime,
      installedExtensions: [],
    })
    if (project.programmingLanguage !== 'javascript') throw new Error('wrong language')
    expect(project.files['index.html']).toContain('&lt;Meu jogo&gt;')
    expect(project.ir).toMatchObject({ version: 2, behavior: { start: [], events: [], loops: [] } })
    expect(StudioProjectDocumentSchema.parse(project)).toEqual(project)
  })

  test('Python classic and Pro have ordinary Python source and no installed extension', async () => {
    for (const kind of ['classic', 'pro'] as const) {
      const project = await createStudioProjectDocument(
        { id: kind, name: 'Python', programmingLanguage: 'python', kind },
        python,
      )
      expect(project).toMatchObject({
        programmingLanguage: 'python',
        kind,
        mode: kind === 'pro' ? 'code' : 'blocks',
        installedExtensions: [],
        python: {
          entrypoint: 'main.py',
          dependencyLock: { packages: [], requirementsSha256: await sha256Hex('') },
        },
      })
      expect(project).not.toHaveProperty('extraFiles')
      if (kind === 'pro') {
        expect(project).not.toHaveProperty('files')
        expect(project).toHaveProperty('proMeta', { templateId: 'python-blank' })
      } else expect(project).toHaveProperty('files', { 'main.py': '', 'requirements.txt': '' })
      expect(StudioProjectDocumentSchema.parse(project)).toEqual(project)
    }
  })

  test('JavaScript Pro templates are copied and preserved, with the existing dev script', async () => {
    const tree: ProjectTree = {
      src: { kind: 'dir' },
      'src/main.ts': { kind: 'file', content: 'console.log(42)' },
    }
    const project = await createStudioProjectDocument(
      { id: 'pro', name: 'Pro', kind: 'pro', template: { tree, devScript: 'dev', id: 'vite' } },
      javascript,
    )
    expect(project).toMatchObject({
      programmingLanguage: 'javascript',
      kind: 'pro',
      mode: 'code',
      tree,
      proMeta: { devScript: 'dev', templateId: 'vite' },
    })
    tree['src/main.ts'] = { kind: 'file', content: 'changed' }
    expect(project).toMatchObject({
      tree: { 'src/main.ts': { kind: 'file', content: 'console.log(42)' } },
    })
  })

  test('unknown, retired, revoked, tampered and mismatched environments cannot create documents', async () => {
    for (const releaseStatus of ['retired', 'revoked'] as const)
      await expect(
        createStudioProjectDocument({ id: 'x', name: 'x' }, { ...javascript, releaseStatus }),
      ).rejects.toThrow('ambiente')
    for (const patch of [
      { releaseId: 'unknown' },
      { manifestSha256: 'b'.repeat(64) },
      { profileId: 'unknown' },
    ]) {
      const context = { ...javascript, runtime: { ...javascript.runtime, ...patch } }
      expect(selectStudioRuntimeRelease(context.catalog, context.runtime)).toBeNull()
      await expect(createStudioProjectDocument({ id: 'x', name: 'x' }, context)).rejects.toThrow(
        'ambiente',
      )
    }
    await expect(createStudioProjectDocument({ id: 'x', name: 'x' }, python)).rejects.toThrow(
      'linguagem',
    )
    await expect(
      createStudioProjectDocument(
        { id: 'x', name: 'x', programmingLanguage: 'python' },
        javascript,
      ),
    ).rejects.toThrow('linguagem')
  })

  test('the editable factory preserves detached template assets and rejects material loss', async () => {
    const asset = {
      id: 'drawing-1',
      name: 'heroi',
      kind: 'image' as const,
      source: 'library' as const,
      libOrigin: 'pinta' as const,
      libId: 'personal:drawing-1',
      dataUrl:
        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jH1QAAAAASUVORK5CYII=',
    }
    const template = {
      id: 'vite',
      devScript: 'dev',
      tree: { 'main.ts': { kind: 'file' as const, content: 'console.log(42)' } },
      assets: [asset],
    }
    const expected = structuredClone(asset)
    const pending = createEditableStudioProject(
      { id: 'material', name: 'Material', kind: 'pro', template },
      javascript,
    )
    asset.name = 'changed after creation'
    expect((await pending).assets).toEqual([expected])
    await expect(
      createEditableStudioProject(
        {
          id: 'bad-material',
          name: 'Material',
          kind: 'pro',
          template: { ...template, assets: [{ ...asset, kind: 'unknown' }] },
        },
        javascript,
      ),
    ).rejects.toThrow()
    for (const kind of ['classic', 'pro'] as const) {
      expect(
        await createEditableStudioProject(
          { id: kind, name: 'Python', kind, programmingLanguage: 'python' },
          python,
        ),
      ).toMatchObject({ programmingLanguage: 'python', kind, installedExtensions: [] })
    }
  })

  test('a JavaScript template that would lose or normalize source is rejected', async () => {
    await expect(
      createStudioProjectDocument(
        {
          id: 'x',
          name: 'x',
          kind: 'pro',
          template: {
            id: 'bad',
            devScript: 'dev',
            tree: { '../main.ts': { kind: 'file', content: 'preserve me' } },
          },
        },
        javascript,
      ),
    ).rejects.toThrow('inválidos')
  })
})
