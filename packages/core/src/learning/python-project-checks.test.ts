import { expect, test } from 'bun:test'
import { defaultLessonSection } from './index'
import { isSectionPythonProjectCheck, sectionPythonProjectActivity } from './python-project-checks'
import { isSectionCompletion, sectionCompletionIssues } from './section-progression'

const check = {
  id: 'function',
  label: 'Crie sua função',
  programmingLanguage: 'python' as const,
  profileId: 'python-browser',
  rule: { type: 'definesFunction' as const, name: 'ação', file: 'main.py' },
}

const project = {
  formatVersion: 3,
  id: 'python-section',
  name: 'Jogo',
  createdAt: 0,
  updatedAt: 0,
  programmingLanguage: 'python',
  kind: 'classic',
  mode: 'bridge',
  runtime: { profileId: check.profileId, releaseId: 'release-1', manifestSha256: 'a'.repeat(64) },
  installedExtensions: [],
  ir: null,
  blocksState: null,
  assets: [],
  files: { 'main.py': 'def ação():\n    pass\n', 'requirements.txt': '' },
  python: {
    entrypoint: 'main.py',
    dependencyLock: {
      lockVersion: 1,
      target: 'browser',
      pythonVersion: '3.14.2',
      runtimeManifestSha256: 'a'.repeat(64),
      requirementsSha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      packages: [],
    },
  },
}

test('publication binds section objectives to the initial language and profile, while legacy JS remains valid', () => {
  const completion = { version: 1 as const, blockIds: [], projectChecks: [check] }
  const section = {
    ...defaultLessonSection('section', 'Etapa', ['studio']),
    workspaceBlockId: 'studio',
    intent: 'exploration' as const,
    completion,
  }
  const blocks = (initialProject: unknown) => [
    {
      id: 'studio',
      content: {
        kind: 'studio',
        purpose: 'experiment',
        initialProject,
      },
    },
  ]
  expect(isSectionCompletion(completion)).toBe(true)
  expect(sectionCompletionIssues([section], blocks(project))).toEqual([])
  expect(
    sectionCompletionIssues([section], blocks({ programmingLanguage: 'javascript' })).map(
      (i) => i.message,
    ),
  ).toContain('Os objetivos precisam usar a mesma linguagem do projeto inicial do Estúdio.')
  expect(
    sectionCompletionIssues(
      [section],
      blocks({ ...project, runtime: { ...project.runtime, profileId: 'other' } }),
    ).map((i) => i.message),
  ).toContain('Os objetivos precisam usar o mesmo perfil Python do projeto inicial.')
  expect(
    sectionCompletionIssues(
      [
        {
          ...section,
          completion: {
            ...completion,
            projectChecks: [{ ...check, rule: { type: 'definesFunction', name: '' } }],
          },
        },
      ],
      blocks(project),
    ).length,
  ).toBeGreaterThan(0)
  const legacy = {
    ...section,
    completion: {
      version: 1 as const,
      blockIds: [],
      projectChecks: [{ id: 'loop', label: 'Repita', rule: { type: 'usesLoop' as const } }],
    },
  }
  expect(sectionCompletionIssues([legacy], blocks({ files: {} }))).toEqual([])
  expect(sectionCompletionIssues([legacy], blocks(project)).length).toBeGreaterThan(0)
  expect(
    isSectionCompletion({
      ...completion,
      projectChecks: [{ ...check, programmingLanguage: 'ruby' }],
    }),
  ).toBe(false)
})

test('Python section drafts preserve incomplete fields but cannot become an executable gate', () => {
  const unfinished = { ...check, label: '', rule: { ...check.rule, name: '', file: 'src/' } }
  expect(isSectionPythonProjectCheck(unfinished)).toBe(true)
  expect(() => sectionPythonProjectActivity([unfinished], '')).toThrow()
  expect(
    isSectionPythonProjectCheck({ ...check, rule: { type: 'usesBlock', blockType: 'sz_js_log' } }),
  ).toBe(false)
  expect(isSectionPythonProjectCheck({ ...check, profileId: '' })).toBe(false)
  expect(
    isSectionPythonProjectCheck({ ...check, rule: { ...check.rule, file: 'x'.repeat(1025) } }),
  ).toBe(false)
})

test('section gates contain only structural rules with canonical Python names and full score required', () => {
  const activity = sectionPythonProjectActivity(
    [check, { ...check, id: 'unicode', rule: { type: 'declaresVariable', name: 'K' } }],
    'Prepare o jogo',
  )
  expect(activity.passingScore).toBe(100)
  expect(activity.profileId).toBe(check.profileId)
  expect(activity.checks).toEqual([
    { id: 'function', label: check.label, kind: 'structure', rule: check.rule },
    {
      id: 'unicode',
      label: check.label,
      kind: 'structure',
      rule: { type: 'declaresVariable', name: 'K' },
    },
  ])
  expect(() =>
    sectionPythonProjectActivity([check, { ...check, id: 'other', profileId: 'other' }], ''),
  ).toThrow()
  expect(() => sectionPythonProjectActivity([check, check], '')).toThrow()
})
