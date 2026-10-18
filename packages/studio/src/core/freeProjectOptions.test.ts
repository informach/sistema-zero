import { expect, test } from 'bun:test'
import { pythonEnvironmentFixture } from '../state/fixtures/pythonEnvironment'
import { prepareStudioFreeOptions } from './freeProjectOptions'

async function discovery(pro = false) {
  const fixture = await pythonEnvironmentFixture('classic')
  return {
    legacyJavaScript: true,
    canCreatePro: pro,
    pythonCuration: { pythonLevel: 3, allowedModes: ['blocks'], allowLevelReveal: false },
    catalog: {
      version: 1,
      catalog: fixture.environment.catalog,
      releases: [
        {
          runtime: fixture.project.runtime,
          status: 'active',
          proTemplateIds: ['python-blank'],
          blockIds: ['py_print'],
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
