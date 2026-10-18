import { expect, test } from 'bun:test'
import { createEmptyProject, sanitizeProjectAssetLicense } from '#core'
import { buildPythonAssetBundle } from '../core/pythonAssets'
import { prepareEditableStudioProject } from './editableProjectValidation'
import { pythonEnvironmentFixture } from './fixtures/pythonEnvironment'
import { createProjectStore } from './projectStore'

const dataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNS0AAAAASUVORK5CYII='

for (const kind of ['javascript', 'classic', 'pro'] as const)
  test(`material insertion preserves detached attribution through ${kind} storage and export`, async () => {
    const store = createProjectStore()
    const project =
      kind === 'javascript'
        ? createEmptyProject('attribution', 'Meu jogo')
        : (await pythonEnvironmentFixture(kind)).project
    store.getState().hydrateProject(project)
    const license = {
      name: 'CC0',
      attribution: 'Desenho de qualificação',
      sourceUrl: 'https://example.test/drawing',
    }
    expect(store.getState().addAsset({ name: 'heroi', dataUrl, license })).toBeNull()
    license.name = 'changed outside the project'
    const current = store.getState().project
    if (!current) throw new Error('The material must belong to a project')
    const loaded = await prepareEditableStudioProject(current)
    expect(loaded?.assets?.[0]?.license).toEqual({
      name: 'CC0',
      attribution: 'Desenho de qualificação',
      sourceUrl: 'https://example.test/drawing',
    })
    if (kind !== 'javascript') {
      const bundle = await buildPythonAssetBundle(loaded?.assets ?? [])
      expect(bundle.manifest.assets[0]?.license).toEqual(loaded?.assets?.[0]?.license)
    }
    const before = store.getState().project
    expect(
      store.getState().addAsset({ name: 'invalido', dataUrl, license: { name: '' } }),
    ).toContain('licença')
    expect(store.getState().project).toBe(before)
  })

test('attribution uses the same bounded sanitizer on insertion and reopening', () => {
  expect(sanitizeProjectAssetLicense({ name: 'x'.repeat(121) })).toBeUndefined()
  expect(sanitizeProjectAssetLicense({ name: 'CC0', sourceUrl: 'javascript:alert(1)' })).toEqual({
    name: 'CC0',
  })
  expect(sanitizeProjectAssetLicense({ name: 'CC0', attribution: 'x'.repeat(601) })).toEqual({
    name: 'CC0',
  })
})
