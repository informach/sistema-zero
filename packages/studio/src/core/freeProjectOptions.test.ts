import { expect, test } from 'bun:test'
import type { StudioProjectCuration } from '@sistemazero/core/studio/project-capabilities'
import { loadPythonAuthoring, selectPythonPalette } from '../python/blocks/authoring'
import { TURTLE_EXTENSION } from '../runtime/python/turtle/contract'
import { pythonEnvironmentFixture } from '../state/fixtures/pythonEnvironment'
import { prepareStudioFreeOptions } from './freeProjectOptions'

async function discovery(pro = false) {
  const fixture = await pythonEnvironmentFixture('classic')
  return {
    legacyJavaScript: true,
    canCreatePro: pro,
    canCreatePython: true,
    pythonGrantedExtensionIds: ['python-turtle'],
    pythonCuration: {
      pythonLevel: 3,
      allowedModes: ['blocks'],
      allowLevelReveal: false,
    } satisfies StudioProjectCuration,
    catalog: {
      version: 1,
      catalog: fixture.environment.catalog,
      releases: [
        {
          runtime: fixture.project.runtime,
          status: 'active',
          proTemplateIds: ['python-blank'],
          blockIds: ['sz_py_pass'],
          categoryIds: ['python-basics'],
        },
      ],
    },
  }
}

test('free discovery verifies exact approved releases and offers Python only for available kinds', async () => {
  const raw = await discovery()
  const prepared = await prepareStudioFreeOptions(raw)
  expect(prepared.environments.map(({ kind }) => kind)).toEqual(['classic'])
  expect(prepared.environments[0]?.context.runtime).toEqual(raw.catalog.releases[0]!.runtime)
  expect(prepared.environments[0]?.context.authoringBlockIds).toEqual(['sz_py_pass'])
  expect(prepared.environments[0]?.context.authoringCuration).toEqual(raw.pythonCuration)
  expect(prepared.environments[0]?.context.grantedExtensionIds).toEqual(['python-turtle'])
  expect(
    (await prepareStudioFreeOptions(await discovery(true))).environments.map(({ kind }) => kind),
  ).toEqual(['classic', 'pro'])
  expect((await prepareStudioFreeOptions({ ...raw, catalog: null })).environments).toEqual([])
  for (const status of ['retired', 'revoked']) {
    const candidate = structuredClone(raw)
    candidate.catalog.releases[0]!.status = status
    expect((await prepareStudioFreeOptions(candidate)).environments).toEqual([])
  }
})

test('incomplete or tampered host catalogs cannot create free Python options', async () => {
  const raw = await discovery()
  const incomplete = structuredClone(raw)
  incomplete.catalog.releases = []
  await expect(prepareStudioFreeOptions(incomplete)).rejects.toThrow()
  const tampered = {
    ...structuredClone(raw),
    catalog: {
      ...raw.catalog,
      catalog: {
        ...raw.catalog.catalog,
        releases: raw.catalog.catalog.releases.map((release) => ({
          ...release,
          manifest: {
            ...release.manifest,
            python: { ...release.manifest.python!, version: '3.13.0' },
          },
        })),
      },
    },
  }
  await expect(prepareStudioFreeOptions(tampered)).rejects.toThrow()
})

test('free course grants stay explicit and empty without changing JavaScript discovery', async () => {
  const raw = await discovery(true)
  raw.pythonGrantedExtensionIds = []
  raw.catalog.releases[0]!.blockIds = []
  const prepared = await prepareStudioFreeOptions(raw)
  expect(prepared.options.legacyJavaScript).toBe(true)
  expect(prepared.environments.map(({ kind }) => kind)).toEqual(['pro'])
  expect(prepared.environments[0]?.context.authoringBlockIds).toEqual([])
  expect(prepared.environments[0]?.context.grantedExtensionIds).toEqual([])
  const context = prepared.environments[0]!.context
  const authoring = await loadPythonAuthoring(
    { runtime: context.runtime, installedExtensions: [TURTLE_EXTENSION] },
    {
      catalog: context.catalog,
      pythonAuthoring: [{ runtime: context.runtime, blockIds: context.authoringBlockIds! }],
    },
  )
  expect(
    selectPythonPalette({
      ...authoring,
      level: 3,
      allowBlocks: [],
      allowCategories: ['Funções'],
    }).entries,
  ).toEqual([])
  raw.pythonGrantedExtensionIds.push('python-turtle')
  raw.catalog.releases[0]!.blockIds.push('sz_py_print')
  expect(prepared.environments[0]?.context.authoringBlockIds).toEqual([])
  expect(prepared.environments[0]?.context.grantedExtensionIds).toEqual([])
  const { pythonGrantedExtensionIds: _missing, ...incomplete } = raw
  await expect(prepareStudioFreeOptions(incomplete)).rejects.toThrow()
})

test('JavaScript-only grants cannot offer Python, including Pro, despite the host catalog', async () => {
  const raw = await discovery(true)
  raw.canCreatePython = false
  const prepared = await prepareStudioFreeOptions(raw)
  expect(prepared.environments).toEqual([])
  expect(prepared.options.legacyJavaScript).toBe(true)
  const { canCreatePython: _missing, ...incomplete } = raw
  await expect(prepareStudioFreeOptions(incomplete)).rejects.toThrow()
})

test('Classic discovery refuses a granted block whose required companion lost host approval', async () => {
  const raw = await discovery(true)
  for (const blockIds of [['sz_py_print'], ['sz_js_if_else'], ['unknown']]) {
    raw.catalog.releases[0]!.blockIds = blockIds
    expect((await prepareStudioFreeOptions(raw)).environments.map(({ kind }) => kind)).toEqual([
      'pro',
    ])
  }
})
