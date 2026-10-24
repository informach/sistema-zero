import { expect, test } from 'bun:test'
import { authoringFixture } from '../../members/tests/fakes/studio-authoring-policy'
import { PYTHON_PROGRAMMING_CODECS } from '../../studio/src/python/blocks/catalog'
import { PYTHON_TURTLE_CODECS } from '../../studio/src/python/extensions/turtle/catalog'
import { TURTLE_EXTENSION } from '../../studio/src/runtime/python/turtle/contract'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'
import { prepareStudioAuthoringOptions } from '../src/lib/studio-authoring-options'
import { loadStudioAuthoringPalette } from '../src/lib/studio-authoring-palette'
import { createStudioAuthoringProject } from '../src/lib/studio-authoring-project'

test('authoring creates all four exact variants and keeps legacy JavaScript without discovery', async () => {
  for (const language of ['javascript', 'python'] as const) {
    for (const kind of ['classic', 'pro'] as const) {
      const fixture = await authoringFixture(language, kind)
      const prepared = await prepareStudioAuthoringOptions({
        legacyJavaScript: true,
        catalog: fixture.configuration,
      })
      const project = await createStudioAuthoringProject(
        {
          id: 'lesson',
          name: 'Minha aula',
          kind,
          environmentKey: fixture.project.runtime.manifestSha256,
          templateId: language === 'python' ? 'python-blank' : 'vanilla-js',
        },
        prepared,
      )
      expect(project).toMatchObject({
        id: 'lesson',
        name: 'Minha aula',
        formatVersion: 3,
        programmingLanguage: language,
        kind,
        runtime: fixture.project.runtime,
      })
      expect(project.installedExtensions).toEqual([])
      fixture.configuration.releases[0]!.status = 'revoked'
      const revoked = await prepareStudioAuthoringOptions({
        legacyJavaScript: true,
        catalog: fixture.configuration,
      })
      await expect(
        createStudioAuthoringProject(
          {
            id: 'lesson',
            name: 'Aula',
            kind,
            environmentKey: fixture.project.runtime.manifestSha256,
            templateId: 'python-blank',
          },
          revoked,
        ),
      ).rejects.toThrow('não está disponível')
    }
  }
  for (const kind of ['classic', 'pro'] as const) {
    const legacy = await createStudioAuthoringProject(
      {
        id: 'legacy',
        name: 'Legado',
        kind,
        environmentKey: 'javascript',
        templateId: 'vanilla-js',
      },
      null,
    )
    expect(legacy.formatVersion).toBe(2)
    expect(legacy.programmingLanguage).not.toBe('python')
  }
})

test('metadata separates Programação and installed Turtle and never falls back to JS on failure', async () => {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  const blockIds = [...PYTHON_PROGRAMMING_CODECS, ...PYTHON_TURTLE_CODECS].map((codec) => codec.id)
  const prepared = await prepareStudioAuthoringOptions({
    legacyJavaScript: true,
    catalog: {
      version: 1,
      catalog: environment.catalog,
      releases: [
        {
          runtime: project.runtime,
          status: 'active',
          proTemplateIds: ['python-blank'],
          blockIds,
          categoryIds: ['Variáveis', 'Movimento'],
        },
      ],
    },
  })
  const programming = await loadStudioAuthoringPalette(project, prepared)
  const visibleProgramming = PYTHON_PROGRAMMING_CODECS.filter((codec) => !codec.hidden)
  const hiddenIds = new Set(
    [...PYTHON_PROGRAMMING_CODECS, ...PYTHON_TURTLE_CODECS]
      .filter((codec) => codec.hidden)
      .map((codec) => codec.id),
  )
  expect(hiddenIds.size).toBeGreaterThan(0)
  expect(programming.blocks.map((entry) => entry.type).sort()).toEqual(
    visibleProgramming.map((codec) => codec.id).sort(),
  )
  expect(programming.blocks.every((entry) => entry.category.startsWith('🐍 Programação / '))).toBe(
    true,
  )
  const turtle = await loadStudioAuthoringPalette(
    { ...project, installedExtensions: [{ ...TURTLE_EXTENSION, installedAt: 1 }] },
    prepared,
  )
  const features = environment.catalog.releases[0]!.manifest.python!.features
  const availableTurtle = PYTHON_TURTLE_CODECS.filter(
    (codec) =>
      !codec.hidden &&
      (codec.requiredRuntimeFeatures ?? []).every((feature) => features.includes(feature)),
  )
  expect(turtle.blocks.length).toBe(visibleProgramming.length + availableTurtle.length)
  expect(turtle.blocks.map((entry) => entry.type).sort()).toEqual(
    [...visibleProgramming, ...availableTurtle].map((codec) => codec.id).sort(),
  )
  expect(turtle.blocks.some((entry) => hiddenIds.has(entry.type))).toBe(false)
  expect(turtle.blocks.some((entry) => entry.category.startsWith('🐢 Turtle / '))).toBe(true)
  expect(
    turtle.categories.every((category) => ['Variáveis', 'Movimento'].includes(category.value)),
  ).toBe(true)
  await expect(loadStudioAuthoringPalette(project, null)).rejects.toThrow('indisponível')
  await expect(
    loadStudioAuthoringPalette(
      { ...project, runtime: { ...project.runtime, manifestSha256: 'f'.repeat(64) } },
      prepared,
    ),
  ).rejects.toThrow('indisponível')
  const legacy = await loadStudioAuthoringPalette(null, null)
  expect(legacy.blocks.some((entry) => entry.type.startsWith('sz_js_'))).toBe(true)
  expect(legacy.blocks.some((entry) => entry.type.startsWith('sz_py_'))).toBe(false)
})
