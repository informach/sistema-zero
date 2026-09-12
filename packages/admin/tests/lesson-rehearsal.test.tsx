import { expect, spyOn, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  defaultLessonSection,
  EXPLORATION_DEFINITIONS,
  type InteractiveBlock,
  type LessonDraftDocument,
} from '@sistemazero/core/learning'
import type { LessonDetailView } from '@sistemazero/member-shell/lib/types'
import { createEmptyProject } from '@sistemazero/studio/project'
import type { LessonBlockContent } from '../src/lib/types'

if (typeof document === 'undefined') GlobalRegistrator.register()
Object.defineProperty(globalThis, 'IS_REACT_ACT_ENVIRONMENT', {
  value: true,
  writable: true,
  configurable: true,
})
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { InteractiveLessonBlock } = await import(
  '@sistemazero/member-shell/components/learning-activity'
)
const { useLessonPreview } = await import(
  '@sistemazero/member-shell/components/lesson-preview-context'
)
const { LessonRehearsal } = await import('../src/components/editor/lesson-rehearsal')

test('external confirmations do not bypass discoveries or unfinished section criteria', async () => {
  const content: InteractiveBlock = {
    kind: 'interactive',
    title: 'Camadas',
    instructions: 'Mude a ordem.',
    hints: [],
    required: false,
    activity: { type: 'exploration', version: 2, mission: 'layers' },
  }
  const documentValue: LessonDraftDocument<LessonBlockContent> = {
    title: 'Ensaio',
    slug: 'ensaio',
    estimatedMinutes: null,
    attachments: [],
    plannedVideos: [],
    supportBlockIds: [],
    blocks: [
      {
        id: 'video',
        content: { kind: 'video', provider: 'file', src: 'https://example.com/video.mp4' },
      },
      { id: 'discovery', content },
    ],
    sections: [
      {
        ...defaultLessonSection('a', 'Vídeo e descoberta', ['video', 'discovery']),
        completion: { version: 1, blockIds: ['video', 'discovery'] },
      },
      {
        ...defaultLessonSection('b', 'Avatar', []),
        completion: { version: 1, blockIds: [], platformAction: 'customize-avatar' },
      },
      {
        ...defaultLessonSection('unfinished', 'Seção ainda em edição', []),
        completion: { version: 1, blockIds: [] },
      },
    ],
  }
  const lesson: LessonDetailView = {
    id: 'lesson',
    slug: 'ensaio',
    title: 'Ensaio',
    courseSlug: '',
    moduleId: '',
    completed: false,
    estimatedMinutes: null,
    positionSeconds: null,
    sections: documentValue.sections,
    attachments: [],
    blocks: documentValue.blocks.map((b, i) => ({
      id: b.id,
      content: b.content,
      kind: b.content.kind,
      sortOrder: i,
    })),
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const button = (name: string) => {
    const result = [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === name,
    )
    if (!result) throw new Error(`Missing ${name}`)
    return result
  }
  try {
    await act(async () =>
      root.render(
        <LessonRehearsal
          lesson={lesson}
          document={documentValue}
          renderBlocks={(blocks) =>
            blocks
              .filter((b) => b.kind === 'interactive')
              .map((block) => (
                <InteractiveLessonBlock key={block.id} block={block} previewContent={content} />
              ))
          }
        />,
      ),
    )
    expect(button('Próxima seção').disabled).toBe(true)
    await act(async () => button('Simular confirmação da ação externa').click())
    expect(button('Próxima seção').disabled).toBe(true)
    await act(async () => button('Depois').click())
    expect(button('Próxima seção').disabled).toBe(false)
    await act(async () => button('Próxima seção').click())
    expect(button('Próxima seção').disabled).toBe(true)
    await act(async () => button('Simular confirmação da ação externa').click())
    await act(async () => button('Próxima seção').click())
    expect(container.textContent).toContain('Configure um critério de conclusão na autoria.')
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('rehearsal interleaves two discoveries and two independent goals in one project, with retry and recovery and no requests', async () => {
  const fetch = spyOn(globalThis, 'fetch').mockImplementation(
    Object.assign(
      async () => {
        throw new Error('A rehearsal must not request authenticated services')
      },
      { preconnect: globalThis.fetch.preconnect },
    ),
  )
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const d = EXPLORATION_DEFINITIONS.layers
  const content: InteractiveBlock = {
    kind: 'interactive',
    title: d.title,
    instructions: d.instruction,
    hints: [...d.hints],
    required: false,
    activity: { type: 'exploration', version: 2, mission: 'layers' },
  }
  const seed = createEmptyProject('same-dino', 'Meu Dino')
  const documentValue: LessonDraftDocument<LessonBlockContent> = {
    title: 'Dino',
    slug: 'dino',
    estimatedMinutes: null,
    attachments: [],
    plannedVideos: [],
    supportBlockIds: [],
    blocks: [
      { id: 'a', content },
      { id: 'b', content },
      { id: 'project', content: { kind: 'studio', initialProject: seed } },
    ],
    sections: [
      {
        ...defaultLessonSection('a', 'Descoberta A', ['a']),
        completion: { version: 1, blockIds: ['a'] },
      },
      {
        ...defaultLessonSection('create-a', 'Criação A', ['project']),
        intent: 'application',
        workspaceBlockId: 'project',
        completion: {
          version: 1,
          blockIds: [],
          projectChecks: [{ id: 'loop', label: 'Repetição', rule: { type: 'usesLoop' } }],
        },
      },
      {
        ...defaultLessonSection('b', 'Descoberta B', ['b']),
        completion: { version: 1, blockIds: ['b'] },
      },
      {
        ...defaultLessonSection('create-b', 'Criação B', []),
        intent: 'application',
        workspaceBlockId: 'project',
        completion: {
          version: 1,
          blockIds: [],
          projectChecks: [
            { id: 'variable', label: 'Pontos', rule: { type: 'declaresVariable', name: 'pontos' } },
          ],
        },
      },
    ],
  }
  const lesson: LessonDetailView = {
    id: 'dino',
    slug: 'dino',
    title: 'Dino',
    courseSlug: 'dino',
    moduleId: 'module',
    completed: false,
    positionSeconds: null,
    estimatedMinutes: null,
    attachments: [],
    sections: documentValue.sections,
    blocks: documentValue.blocks.map((block, i) => ({
      id: block.id,
      sortOrder: i,
      kind: block.content.kind,
      content: block.content,
    })),
  }
  let identity = ''
  function Workspace() {
    const rehearsal = useLessonPreview()
    const project = rehearsal?.workspaces.project ?? seed
    identity = project.id
    return (
      <div>
        <input
          aria-label="Nome do projeto"
          value={project.name}
          onChange={(event) =>
            rehearsal?.onWorkspaceChange('project', { ...project, name: event.target.value })
          }
        />
        <button
          type="button"
          onClick={() => rehearsal?.onWorkspaceChange('project', { ...project, name: 'Dino azul' })}
        >
          Mudar projeto
        </button>
        <button
          type="button"
          onClick={() => {
            void rehearsal?.onProjectCheck('project', {
              ir: {
                version: 2,
                html: [],
                css: [],
                extensions: [],
                behavior: {
                  start: [],
                  molds: [],
                  events: [],
                  loops: [{ type: 'repeat', times: { type: 'num', value: 2 }, body: [] }],
                },
              },
            })
          }}
        >
          Conferir repetição
        </button>
      </div>
    )
  }
  const button = (name: string) => {
    const found = [...container.querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === name,
    )
    if (!found)
      throw new Error(
        `Missing button ${name}; available: ${[...container.querySelectorAll('button')].map((item) => item.textContent).join(', ')}`,
      )
    return found
  }
  const click = (name: string) => act(async () => button(name).click())
  try {
    await act(async () =>
      root.render(
        <LessonRehearsal
          document={documentValue}
          lesson={lesson}
          renderBlocks={(blocks) =>
            blocks.map((block) =>
              block.kind === 'studio' ? (
                <Workspace key={block.id} />
              ) : (
                <InteractiveLessonBlock key={block.id} block={block} previewContent={content} />
              ),
            )
          }
        />,
      ),
    )
    expect(button('Próxima seção').disabled).toBe(true)
    await click('Falhar na próxima confirmação')
    await click('Depois')
    expect(container.textContent).toContain('Falha de salvamento simulada')
    expect(button('Próxima seção').disabled).toBe(true)
    await click('Tentar salvar novamente')
    expect(button('Próxima seção').disabled).toBe(false)
    await click('Próxima seção')
    await click('Criar')
    await click('Mudar projeto')
    const original = identity
    await click('Conferir repetição')
    await click('Próxima seção')
    await click('Depois')
    await click('Próxima seção')
    await click('Criar')
    expect(identity).toBe(original)
    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="Nome do projeto"]')?.value,
    ).toBe('Dino azul')
    expect(container.textContent).toContain('Confira o objetivo no projeto desta seção.')
    await click('Conferir repetição')
    expect(container.textContent).toContain('Confira o objetivo no projeto desta seção.')
    await click('Ensaiar retomada')
    expect(identity).toBe(original)
    expect(
      container.querySelector<HTMLInputElement>('input[aria-label="Nome do projeto"]')?.value,
    ).toBe('Dino azul')
    expect(fetch).not.toHaveBeenCalled()
  } finally {
    await act(async () => root.unmount())
    container.remove()
    fetch.mockRestore()
  }
})
