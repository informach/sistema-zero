import { expect, test } from 'bun:test'
import { canonicalJson } from '../src/creations/content-fingerprint'
import { StudioProjectDocumentSchema } from '../src/studio/project-document'
import {
  createStudioPythonPublicationRecipe,
  StudioPythonPublicationManifestSchema,
  studioPythonPublicationRecipeText,
  studioPythonRecipeMatchesProject,
} from '../src/studio/python-publication'

const runtime = { profileId: 'python-browser', releaseId: '1.0.0', manifestSha256: 'a'.repeat(64) }
const approval = { kind: 'python-browser' as const, runtime, snapshotSha256: 'c'.repeat(64) }
const project = StudioProjectDocumentSchema.parse({
  formatVersion: 3,
  programmingLanguage: 'python',
  kind: 'classic',
  id: 'python-publication-current',
  name: 'Publicação Python',
  createdAt: 1,
  updatedAt: 1,
  mode: 'blocks',
  runtime,
  files: { 'main.py': 'print(1)\n', 'requirements.txt': '' },
  ir: null,
  blocksState: null,
  installedExtensions: [
    { id: 'python-turtle', version: '1.0.0', installedAt: 5 },
    { id: 'python-audio', version: '2.0.0', installedAt: 9 },
  ],
  python: {
    entrypoint: 'main.py',
    dependencyLock: {
      lockVersion: 1,
      target: 'browser',
      pythonVersion: '3.14.2',
      runtimeManifestSha256: runtime.manifestSha256,
      requirementsSha256: 'e'.repeat(64),
      packages: [],
    },
  },
})
if (project.programmingLanguage !== 'python' || project.kind !== 'classic')
  throw new Error('The publication fixture must be a current Python Classic document')

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
  expect(studioPythonRecipeMatchesProject(recipe, other)).toBe(false)
})

test('old, malformed and unknown Python recipes are refused explicitly', () => {
  const recipe = createStudioPythonPublicationRecipe({
    project,
    sourceHash: 'b'.repeat(64),
    approval,
  })
  for (const candidate of [
    { version: 1, sourceHash: 'b'.repeat(64), approval },
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
