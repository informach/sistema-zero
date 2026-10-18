import { expect, test } from 'bun:test'
import { documentFixture } from '../../studio/src/state/fixtures/projectDocuments'
import {
  StudioPythonAnalysisAuthorizationSchema,
  studioPythonAnalysisBinding,
} from '../src/studio/python-language-authorization'
import { studioRuntimeSubject } from '../src/studio/runtime-subject'

function fixture() {
  const subject = studioRuntimeSubject(documentFixture('python', 'pro'))
  return StudioPythonAnalysisAuthorizationSchema.parse({
    context: { kind: 'free', audience: 'kids', projectId: subject.id },
    operation: 'analyze',
    subject,
    revision: 'a'.repeat(64),
  })
}
test('analysis binding keeps editable source metadata out, while separating owner/project/runtime/template', async () => {
  const original = fixture()
  const owner = 'd'.repeat(64)
  const binding = await studioPythonAnalysisBinding(owner, original)
  const edited = structuredClone(original)
  if (edited.subject.programmingLanguage !== 'python') throw new Error('fixture')
  edited.revision = 'b'.repeat(64)
  edited.subject.python.entrypoint = 'src/helper.py'
  edited.subject.requirements = '# editing requirements\n'
  expect(await studioPythonAnalysisBinding(owner, edited)).toBe(binding)
  expect(await studioPythonAnalysisBinding('e'.repeat(64), original)).not.toBe(binding)
  for (const field of ['project', 'runtime', 'template'] as const) {
    const changed = structuredClone(original)
    if (field === 'project') {
      changed.subject.id = 'another'
      if (changed.context.kind === 'free') changed.context.projectId = 'another'
    }
    if (field === 'runtime') changed.subject.runtime.releaseId = 'another-release'
    if (field === 'template') changed.subject.proMeta = { templateId: 'another-template' }
    expect(await studioPythonAnalysisBinding(owner, changed)).not.toBe(binding)
  }
})
test('live analysis follows autosaves but a writer epoch or device change breaks the binding', async () => {
  const input = StudioPythonAnalysisAuthorizationSchema.parse({
    ...fixture(),
    context: {
      kind: 'live',
      workspaceId: crypto.randomUUID(),
      sessionId: crypto.randomUUID(),
      blockId: crypto.randomUUID(),
      deviceId: crypto.randomUUID(),
      writerEpoch: 1,
      expectedWorkspaceRevision: 2,
    },
  })
  const binding = await studioPythonAnalysisBinding('d'.repeat(64), input)
  if (input.context.kind !== 'live') throw new Error('fixture')
  input.context.expectedWorkspaceRevision = 3
  expect(await studioPythonAnalysisBinding('d'.repeat(64), input)).toBe(binding)
  input.context.writerEpoch = 2
  expect(await studioPythonAnalysisBinding('d'.repeat(64), input)).not.toBe(binding)
  input.context.writerEpoch = 1
  input.context.deviceId = crypto.randomUUID()
  expect(await studioPythonAnalysisBinding('d'.repeat(64), input)).not.toBe(binding)
})
test('analysis rejects public/execute/JavaScript and client supplied grants or source', () => {
  const input = fixture()
  for (const change of [
    { operation: 'execute' },
    { capabilities: ['edit'] },
    { files: { 'main.py': 'source' } },
    {
      context: { kind: 'public', playId: crypto.randomUUID(), publicationRevision: 'a'.repeat(64) },
    },
    { subject: studioRuntimeSubject(documentFixture('javascript', 'pro')) },
    { context: { kind: 'free', audience: 'kids', projectId: 'other' } },
  ])
    expect(StudioPythonAnalysisAuthorizationSchema.safeParse({ ...input, ...change }).success).toBe(
      false,
    )
})

test('a lesson baseline is pinned while authoring saves retain one session only for the same purpose and block', async () => {
  const input = fixture()
  const lessonId = crypto.randomUUID(),
    blockId = crypto.randomUUID()
  const lesson = StudioPythonAnalysisAuthorizationSchema.parse({
    ...input,
    context: { kind: 'lesson', lessonId, blockId, baselineId: 'a'.repeat(64) },
  })
  const owner = 'd'.repeat(64)
  const lessonBinding = await studioPythonAnalysisBinding(owner, lesson)
  if (lesson.context.kind !== 'lesson') throw new Error('fixture')
  lesson.context.baselineId = 'b'.repeat(64)
  expect(await studioPythonAnalysisBinding(owner, lesson)).not.toBe(lessonBinding)
  const authoring = StudioPythonAnalysisAuthorizationSchema.parse({
    ...input,
    context: {
      kind: 'authoring',
      lessonId,
      blockId,
      draftRevision: crypto.randomUUID(),
      purpose: 'authoring',
    },
  })
  const binding = await studioPythonAnalysisBinding(owner, authoring)
  if (authoring.context.kind !== 'authoring') throw new Error('fixture')
  authoring.context.draftRevision = crypto.randomUUID()
  expect(await studioPythonAnalysisBinding(owner, authoring)).toBe(binding)
  authoring.context.purpose = 'rehearsal'
  expect(await studioPythonAnalysisBinding(owner, authoring)).not.toBe(binding)
  authoring.context.purpose = 'authoring'
  authoring.context.blockId = crypto.randomUUID()
  expect(await studioPythonAnalysisBinding(owner, authoring)).not.toBe(binding)
})
