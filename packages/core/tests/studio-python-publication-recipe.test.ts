import { expect, test } from 'bun:test'
import { canonicalJson } from '../src/creations/content-fingerprint'
import type { StudioPythonClassicDocument } from '../src/studio/project-document'
import {
  createStudioPythonPublicationRecipe,
  StudioPythonPublicationManifestSchema,
  studioPythonPublicationLegacyRecipeText,
  studioPythonPublicationRecipeText,
  studioPythonRecipeMatchesProject,
} from '../src/studio/python-publication'

const runtime = { profileId: 'python-browser', releaseId: '1.0.0', manifestSha256: 'a'.repeat(64) }
const approval = { kind: 'python-browser' as const, runtime, snapshotSha256: 'c'.repeat(64) }
const project = {
  kind: 'classic',
  installedExtensions: [
    { id: 'python-turtle', version: '1.0.0', installedAt: 5 },
    { id: 'python-audio', version: '2.0.0', installedAt: 9 },
  ],
  python: {
    entrypoint: 'main.py',
    dependencyLock: {
      lockVersion: 1,
      target: 'browser',
      pythonVersion: '3.13.2',
      runtimeManifestSha256: runtime.manifestSha256,
      requirementsSha256: 'e'.repeat(64),
      packages: [],
    },
  },
} as unknown as StudioPythonClassicDocument

test('v2 recipe pins runtime, enabled extension versions, entrypoint and lock in one canonical form', () => {
  const recipe = createStudioPythonPublicationRecipe({
    project,
    sourceHash: 'b'.repeat(64),
    approval,
  })
  expect(recipe.extensions).toEqual([
    { id: 'python-audio', version: '2.0.0' },
    { id: 'python-turtle', version: '1.0.0' },
  ])
  const text = studioPythonPublicationRecipeText(recipe)
  expect(text).toBe(canonicalJson(JSON.parse(text)))
  expect(StudioPythonPublicationManifestSchema.parse(JSON.parse(text))).toEqual(recipe)
  expect(studioPythonRecipeMatchesProject(recipe, project)).toBe(true)
  const other = { ...project, python: { ...project.python, entrypoint: 'jogo.py' } }
  expect(studioPythonRecipeMatchesProject(recipe, other as typeof project)).toBe(false)
})

test('v1 recipes stay readable with their exact legacy bytes; malformed v2 and future versions are refused', () => {
  const legacy = studioPythonPublicationLegacyRecipeText({ sourceHash: 'b'.repeat(64), approval })
  expect(legacy).toBe(JSON.stringify({ version: 1, sourceHash: 'b'.repeat(64), approval }))
  const v1 = StudioPythonPublicationManifestSchema.parse(JSON.parse(legacy))
  expect(v1.version).toBe(1)
  expect(studioPythonRecipeMatchesProject(v1, project)).toBe(true)
  const recipe = createStudioPythonPublicationRecipe({
    project,
    sourceHash: 'b'.repeat(64),
    approval,
  })
  for (const candidate of [
    { ...recipe, extensions: [...recipe.extensions].reverse() },
    { ...recipe, extensions: [recipe.extensions[0], recipe.extensions[0]] },
    {
      ...recipe,
      dependencyLock: { ...recipe.dependencyLock, runtimeManifestSha256: 'f'.repeat(64) },
    },
    { ...recipe, runtimeUrl: 'https://untrusted.test/pyodide.mjs' },
    { ...recipe, version: 3 },
    { version: 1, sourceHash: 'b'.repeat(64), approval, extensions: [] },
  ])
    expect(StudioPythonPublicationManifestSchema.safeParse(candidate).success).toBe(false)
})
