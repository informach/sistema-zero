import { expect, test } from 'bun:test'
import { authoringFixture } from '../../members/tests/fakes/studio-authoring-policy'
import {
  prepareStudioAuthoringOptions,
  studioAuthoringChoiceKey,
  studioAuthoringChoices,
} from '../src/lib/studio-authoring-options'

test('JavaScript stays first; only active compatible releases are offered for new projects', async () => {
  const { configuration, project } = await authoringFixture('python', 'classic')
  const prepared = await prepareStudioAuthoringOptions({
    legacyJavaScript: true,
    catalog: configuration,
  })
  const choices = studioAuthoringChoices(prepared, 'classic')
  expect(choices.map((choice) => choice.language)).toEqual(['javascript', 'python'])
  expect(choices[0]!.key).toBe('javascript')
  expect(choices[1]!.key).toBe(project.runtime.manifestSha256)
  expect(studioAuthoringChoiceKey(project)).toBe(choices[1]!.key)
  expect(studioAuthoringChoiceKey(null)).toBe('javascript')
  for (const status of ['retired', 'revoked'] as const) {
    configuration.releases[0]!.status = status
    const unavailable = await prepareStudioAuthoringOptions({
      legacyJavaScript: true,
      catalog: configuration,
    })
    expect(studioAuthoringChoices(unavailable, 'classic').map((choice) => choice.key)).toEqual([
      'javascript',
    ])
    // Saved projects retain their identity even when it is no longer selectable for creation.
    expect(studioAuthoringChoiceKey(project)).toBe(project.runtime.manifestSha256)
  }
})

test('Pro requires an approved supported template; missing catalog keeps legacy JS only', async () => {
  const { configuration } = await authoringFixture('python', 'classic')
  configuration.releases[0]!.proTemplateIds = []
  const prepared = await prepareStudioAuthoringOptions({
    legacyJavaScript: true,
    catalog: configuration,
  })
  expect(studioAuthoringChoices(prepared, 'classic')).toHaveLength(2)
  expect(studioAuthoringChoices(prepared, 'pro')).toHaveLength(1)
  const absent = await prepareStudioAuthoringOptions({ legacyJavaScript: true, catalog: null })
  expect(studioAuthoringChoices(absent, 'pro').map((choice) => choice.key)).toEqual(['javascript'])
})

test('tampered or incomplete remote catalogs cannot silently choose a release', async () => {
  const { configuration } = await authoringFixture('python', 'classic')
  const changed = structuredClone(configuration)
  changed.catalog.releases[0]!.manifest.python!.version = '3.13.0'
  await expect(
    prepareStudioAuthoringOptions({ legacyJavaScript: true, catalog: changed }),
  ).rejects.toThrow('hash')
  configuration.releases = []
  await expect(
    prepareStudioAuthoringOptions({ legacyJavaScript: true, catalog: configuration }),
  ).rejects.toThrow('incompleta')
})
