import { describe, expect, test } from 'bun:test'
import {
  readManifestStudioProjectExamples,
  readStudioProjectExamples,
  resolveStudioSectionExamples,
  type StudioProjectExamples,
  studioLessonProjectExamplesIssues,
  studioProjectExampleEnvironmentIssues,
  studioProjectExampleSectionIssues,
} from './studio-project-examples'

const first = '11111111-1111-4111-8111-111111111111'
const second = '22222222-2222-4222-8222-222222222222'
const sectionId = '33333333-3333-4333-8333-333333333333'
const blockId = '44444444-4444-4444-8444-444444444444'
const hash = 'a'.repeat(64)
const project = (code = 'console.log(1)') => ({
  formatVersion: 2,
  id: 'same-project-identity',
  name: 'Meu jogo',
  kind: 'classic',
  mode: 'blocks',
  createdAt: 0,
  updatedAt: 0,
  files: { 'index.html': '', 'style.css': '', 'script.js': code },
  installedExtensions: [],
  ir: null,
  blocksState: null,
})
const python = () => ({
  formatVersion: 3,
  id: 'python-example',
  name: 'Minha tartaruga',
  programmingLanguage: 'python',
  runtime: { profileId: 'python-browser', releaseId: 'python-1', manifestSha256: hash },
  kind: 'classic',
  mode: 'bridge',
  createdAt: 0,
  updatedAt: 0,
  installedExtensions: [],
  ir: null,
  blocksState: null,
  files: { 'main.py': 'print("Olá")' },
  python: {
    entrypoint: 'main.py',
    dependencyLock: {
      lockVersion: 1,
      target: 'browser',
      pythonVersion: '3.14.2',
      runtimeManifestSha256: hash,
      requirementsSha256: hash,
      packages: [],
    },
  },
})
const registry = (snapshot: unknown = project()) => ({
  version: 1,
  examples: { [first]: snapshot },
  sections: { [sectionId]: { solutionExampleId: first } },
})
function valid(raw: unknown): StudioProjectExamples {
  const result = readStudioProjectExamples(raw)
  if (result.kind !== 'valid') throw new Error(JSON.stringify(result))
  return result.value
}

describe('private examples: boundary and identity', () => {
  test('absence, empty registry and invalid registry are distinct', () => {
    expect(readStudioProjectExamples(undefined)).toEqual({ kind: 'absent' })
    expect(readStudioProjectExamples({ version: 1, examples: {}, sections: {} }).kind).toBe('valid')
    for (const raw of [null, {}, { version: 2, examples: {}, sections: {} }])
      expect(readStudioProjectExamples(raw).kind).toBe('invalid')
  })

  test('different checkpoints with the same project ID remain different snapshots', () => {
    const value = valid({
      version: 1,
      examples: { [first]: project('before'), [second]: project('after') },
      sections: { [sectionId]: { entryExampleId: first, solutionExampleId: second } },
    })
    const resolved = resolveStudioSectionExamples(value, sectionId)
    expect(resolved.kind).toBe('resolved')
    if (resolved.kind !== 'resolved') throw new Error('Expected both checkpoints')
    expect(resolved.entry?.id).toBe(resolved.solution?.id)
    expect(resolved.entry).not.toEqual(resolved.solution)
  })

  test('uses a detached copy and permits reusing one snapshot in multiple parts', () => {
    const original = project()
    const raw = registry(original)
    const value = valid({
      ...raw,
      sections: { ...raw.sections, [second]: { solutionExampleId: first } },
    })
    original.files['script.js'] = 'changed outside'
    const snapshot = value.examples[first]
    if (!snapshot || !('files' in snapshot)) throw new Error('Expected a classic snapshot')
    expect(snapshot.files).not.toEqual(original.files)
    expect(resolveStudioSectionExamples(value, second).kind).toBe('resolved')
  })

  test('dangling references, orphan examples and unknown private fields are rejected', () => {
    const cases: unknown[] = [
      { ...registry(), sections: { [sectionId]: { solutionExampleId: second } } },
      { ...registry(), sections: {} },
      { ...registry(), solutionProject: project() },
      { ...registry(), sections: { [sectionId]: { solutionExampleId: first, answer: true } } },
      { ...registry(), examples: { notAUuid: project() } },
      { ...registry(), sections: { [sectionId]: {} } },
      { version: 1, examples: { [first]: undefined }, sections: registry().sections },
    ]
    for (const raw of cases) expect(readStudioProjectExamples(raw).kind).toBe('invalid')
  })

  test('does not invoke getters or silently drop prototype keys', () => {
    let calls = 0
    const raw = registry()
    Object.defineProperty(raw.examples, first, {
      enumerable: true,
      get: () => {
        calls++
        return project()
      },
    })
    expect(readStudioProjectExamples(raw).kind).toBe('invalid')
    expect(calls).toBe(0)
    const proto = JSON.parse('{"version":1,"examples":{"__proto__":{}},"sections":{}}')
    expect(readStudioProjectExamples(proto).kind).toBe('invalid')
  })

  test('portable section keys are mapped explicitly instead of being mistaken for persisted IDs', () => {
    const portable = { ...registry(), sections: { 'ligar-raio-x': { solutionExampleId: first } } }
    expect(readStudioProjectExamples(portable).kind).toBe('invalid')
    expect(readManifestStudioProjectExamples(portable).kind).toBe('valid')
    expect(readManifestStudioProjectExamples(registry()).kind).toBe('invalid')
  })

  test('a missing part is absent but a corrupted binding is an error', () => {
    const value = valid(registry())
    expect(resolveStudioSectionExamples(value, second)).toEqual({ kind: 'absent' })
    delete value.examples[first]
    expect(resolveStudioSectionExamples(value, sectionId).kind).toBe('invalid')
    value.sections[sectionId] = {}
    expect(resolveStudioSectionExamples(value, sectionId).kind).toBe('invalid')
  })

  test('rejects excessive project characters and UTF-8 byte totals separately', () => {
    const tooManyChars = readStudioProjectExamples(registry(project('x'.repeat(1_500_001))))
    const tooManyBytes = readStudioProjectExamples(registry(project('界'.repeat(800_000))))
    expect(tooManyChars.kind).toBe('invalid')
    expect(tooManyBytes.kind).toBe('invalid')
    if (tooManyChars.kind === 'invalid') expect(tooManyChars.issues[0]?.code).toBe('limit')
    if (tooManyBytes.kind === 'invalid') expect(tooManyBytes.issues[0]?.code).toBe('limit')
  })
})

describe('private examples: lesson context and runtime authority', () => {
  test('a section must use the same workspace and must still exist', () => {
    const value = valid(registry())
    expect(
      studioProjectExampleSectionIssues(value, blockId, [
        { id: sectionId, workspaceBlockId: blockId },
      ]),
    ).toEqual([])
    expect(
      studioProjectExampleSectionIssues(value, blockId, [
        { id: sectionId, workspaceBlockId: second },
      ]),
    ).not.toEqual([])
    expect(studioProjectExampleSectionIssues(value, blockId, [])).not.toEqual([])
  })

  test('rejects a different language, project kind or Pro model', () => {
    expect(studioProjectExampleEnvironmentIssues(valid(registry(python())), project())).not.toEqual(
      [],
    )
    expect(
      studioProjectExampleEnvironmentIssues(valid(registry()), {
        ...project(),
        kind: 'pro',
        tree: {},
        proMeta: { templateId: 'vanilla-js' },
      }),
    ).not.toEqual([])
    const pro = { ...project(), kind: 'pro', tree: {}, proMeta: { templateId: 'vanilla-js' } }
    expect(studioProjectExampleEnvironmentIssues(valid(registry(pro)), pro)).toEqual([])
    expect(
      studioProjectExampleEnvironmentIssues(
        valid(registry({ ...pro, proMeta: { templateId: 'react-ts' } })),
        pro,
      ),
    ).not.toEqual([])
  })

  test('preserves classic JavaScript v2 but rejects unknown kinds and incomplete Pro snapshots', () => {
    expect(readStudioProjectExamples(registry(project())).kind).toBe('valid')
    const { kind: _kind, ...legacyClassic } = project()
    expect(readStudioProjectExamples(registry(legacyClassic)).kind).toBe('valid')
    for (const invalidProject of [
      { ...project(), kind: 'ruby' },
      { ...project(), kind: 'pro', proMeta: { templateId: 'vanilla-js' } },
      { ...project(), kind: 'pro', tree: {}, proMeta: { templateId: 'unknown' } },
    ])
      expect(readStudioProjectExamples(registry(invalidProject)).kind).toBe('invalid')
  })

  test('Python cannot use a different authorized profile or release', () => {
    expect(studioProjectExampleEnvironmentIssues(valid(registry(python())), python())).toEqual([])
    const other = python()
    other.runtime.releaseId = 'python-2'
    expect(studioProjectExampleEnvironmentIssues(valid(registry(other)), python())).not.toEqual([])
  })

  test('JavaScript v2 stays valid without inventing equivalence to a pinned v3 runtime', () => {
    const pinned = {
      ...project(),
      formatVersion: 3,
      programmingLanguage: 'javascript',
      runtime: { profileId: 'javascript-browser', releaseId: 'javascript-1', manifestSha256: hash },
    }
    expect(studioProjectExampleEnvironmentIssues(valid(registry(project())), project())).toEqual([])
    expect(studioProjectExampleEnvironmentIssues(valid(registry(pinned)), pinned)).toEqual([])
    expect(studioProjectExampleEnvironmentIssues(valid(registry(project())), pinned)).not.toEqual(
      [],
    )
    expect(studioProjectExampleEnvironmentIssues(valid(registry(pinned)), project())).not.toEqual(
      [],
    )
  })

  test('the lesson budget is shared across individually valid registries', () => {
    const a = readStudioProjectExamples(registry(project('x'.repeat(1_100_000))))
    const b = readStudioProjectExamples(registry(project('y'.repeat(1_100_000))))
    if (a.kind !== 'valid' || b.kind !== 'valid')
      throw new Error('Each registry must fit individually')
    expect(
      studioLessonProjectExamplesIssues([{ blockId, bytes: a.bytes, registry: a.value }]),
    ).toEqual([])
    expect(
      studioLessonProjectExamplesIssues([
        { blockId, bytes: a.bytes, registry: a.value },
        { blockId: second, bytes: b.bytes, registry: b.value },
      ])[0]?.code,
    ).toBe('limit')
  })
})
