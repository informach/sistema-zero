import { expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { defaultLessonSection } from '@sistemazero/core/learning'
import { refinePythonProjectDocument } from '@sistemazero/studio/python-project-validation'
import { authoringFixture } from '../../../members/tests/fakes/studio-authoring-policy'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
let entered = Promise.withResolvers<void>(),
  release = Promise.withResolvers<void>()
let inspectionSignal: AbortSignal | undefined
function receivedSignal(): AbortSignal | undefined {
  return inspectionSignal
}
mock.module('../../src/components/studio/inspect-python-section-project', () => ({
  inspectPythonSectionProject: async (input: { assertCurrent(): void; signal: AbortSignal }) => {
    inspectionSignal = input.signal
    entered.resolve()
    await release.promise
    input.signal.throwIfAborted()
    input.assertCurrent()
    return [{ checkId: 'loop', label: 'Repita', passed: true }]
  },
}))
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { useLessonPreview } = await import(
  '@sistemazero/member-shell/components/lesson-preview-context'
)
const { LessonRehearsal } = await import('../../src/components/editor/lesson-rehearsal')

test.each([
  'author',
  'authorABA',
  'documentABA',
  'draftABA',
  'lessonABA',
  'restart',
  'unchanged',
] as const)('rehearsal keeps inspection in the original generation: %s', async (scenario) => {
  entered = Promise.withResolvers<void>()
  release = Promise.withResolvers<void>()
  inspectionSignal = undefined
  const fixture = await authoringFixture('python', 'classic')
  const project = await refinePythonProjectDocument(fixture.project)
  const blockId = 'project'
  const section = {
    ...defaultLessonSection('section', 'Objetivo', [blockId]),
    workspaceBlockId: blockId,
    completion: {
      version: 1 as const,
      blockIds: [],
      projectChecks: [
        {
          id: 'loop',
          label: 'Repita',
          programmingLanguage: 'python' as const,
          profileId: project.runtime.profileId,
          rule: { type: 'usesLoop' as const },
        },
      ],
    },
  }
  const draft = {
    title: 'Ensaio',
    slug: 'ensaio',
    estimatedMinutes: null,
    attachments: [],
    plannedVideos: [],
    sections: [section],
    blocks: [
      {
        id: blockId,
        content: {
          kind: 'studio' as const,
          purpose: 'experiment' as const,
          initialProject: project,
        },
      },
    ],
  }
  const lesson = {
    id: 'lesson',
    slug: 'ensaio',
    title: 'Ensaio',
    courseSlug: '',
    moduleId: '',
    completed: false,
    estimatedMinutes: null,
    positionSeconds: null,
    attachments: [],
    sections: draft.sections,
    blocks: draft.blocks.map((block, sortOrder) => ({
      ...block,
      kind: block.content.kind,
      sortOrder,
    })),
  }
  let preview: ReturnType<typeof useLessonPreview>
  function Workspace() {
    preview = useLessonPreview()
    return <p>Editor</p>
  }
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const render = (
    authorId: string,
    documentValue = draft,
    revision = 'same-revision',
    lessonId = lesson.id,
  ) =>
    act(async () =>
      root.render(
        <LessonRehearsal
          authorId={authorId}
          draftRevision={revision}
          lesson={{ ...lesson, id: lessonId }}
          document={documentValue}
          renderBlocks={() => <Workspace />}
        />,
      ),
    )
  let pending: Promise<string> | undefined
  try {
    await render('author-A')
    pending = preview!.onProjectCheck(blockId, project).then(
      () => 'accepted',
      (error) => error.name,
    )
    await entered.promise
    if (scenario === 'author' || scenario === 'authorABA') await render('author-B')
    else if (scenario === 'documentABA')
      await render('author-A', { ...draft, title: 'another draft' })
    else if (scenario === 'draftABA') await render('author-A', draft, 'another-revision')
    else if (scenario === 'lessonABA')
      await render('author-A', draft, 'same-revision', 'another-lesson')
    else if (scenario === 'restart') {
      const reset = [...host.querySelectorAll('button')].find(
        (button) => button.textContent === 'Estado inicial',
      )
      if (!reset) throw new Error('Missing restart')
      await act(async () => reset.click())
    }
    if (scenario !== 'unchanged') expect(receivedSignal()?.aborted).toBe(true)
    if (scenario !== 'author' && scenario !== 'restart') await render('author-A')
    await act(async () => {
      release.resolve()
      await pending
    })
    expect(await pending).toBe(scenario === 'unchanged' ? 'accepted' : 'AbortError')
    if (scenario !== 'unchanged') expect(host.textContent).toContain('Confira o objetivo')
  } finally {
    release.resolve()
    await pending
    await act(async () => root.unmount())
    host.remove()
  }
})
