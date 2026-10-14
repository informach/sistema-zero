import { afterEach, describe, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LiveLearningStep, LiveProgram } from '@sistemazero/core/live'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LiveStepsEditor, STEP_INSTRUCTIONS_MAX } = await import(
  '../src/app/admin/oficinas/live-steps-editor'
)
const { LiveAdmin, REVISION_CONFLICT_MESSAGE, draftSnapshot } = await import(
  '../src/app/admin/oficinas/workshops-admin'
)

let cleanup: (() => void) | null = null
const originalFetch = globalThis.fetch
afterEach(() => {
  cleanup?.()
  cleanup = null
  globalThis.fetch = originalFetch
})

async function mount(node: React.ReactNode) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(node))
  cleanup = () => {
    act(() => root.unmount())
    container.remove()
  }
  return container
}
function button(scope: ParentNode, label: string) {
  const found = [...scope.querySelectorAll('button')].find(
    (node) => node.textContent?.trim() === label,
  )
  if (!found) throw new Error(`Botão ausente: ${label}`)
  return found
}
function type(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement
  Object.getOwnPropertyDescriptor(proto.prototype, 'value')!.set!.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => new Promise((r) => setTimeout(r, 0)))
}

function StepsHarness({ initial }: { initial: LiveLearningStep[] }) {
  const [steps, setSteps] = useState(initial)
  return (
    <>
      <output data-count>{steps.length}</output>
      <LiveStepsEditor value={steps} disabled={false} onChange={setSteps} />
    </>
  )
}

describe('etapas do encontro', () => {
  test('etapa nova abre expandida, com o foco no nome e o teto de 10 mil caracteres', async () => {
    const view = await mount(<StepsHarness initial={[]} />)
    await act(async () => button(view, 'Adicionar etapa').click())
    await settle()
    const details = view.querySelector('details')!
    expect(details.open).toBe(true)
    expect(document.activeElement).toBe(details.querySelector('input'))
    expect(details.querySelector('textarea')?.maxLength).toBe(STEP_INSTRUCTIONS_MAX)
    expect(STEP_INSTRUCTIONS_MAX).toBe(10_000)
  })

  test('remover etapa e atividade só depois de confirmar', async () => {
    const step: LiveLearningStep = {
      id: '11111111-1111-4111-8111-111111111111',
      title: 'Montar o cenário',
      instructions: '',
      blocks: [],
    }
    const view = await mount(<StepsHarness initial={[step]} />)
    await act(async () => button(view, 'Remover etapa').click())
    expect(view.querySelector('[data-count]')?.textContent).toBe('1')
    const dialog = document.querySelector('[role="dialog"]')!
    expect(dialog.textContent).toContain('Montar o cenário')
    await act(async () => button(dialog, 'Remover etapa').click())
    await settle()
    expect(view.querySelector('[data-count]')?.textContent).toBe('0')
  })
})

describe('roteiro da oficina', () => {
  test('o rascunho compara sem os ids de tela', () => {
    const lesson = {
      editorId: 'a',
      title: 'Encontro',
      instructions: 'x',
      starterProjectId: null,
      materials: [],
    }
    expect(draftSnapshot('T', 'D', [lesson])).toBe(
      draftSnapshot('T', 'D', [{ ...lesson, editorId: 'b' }]),
    )
    expect(draftSnapshot('T', 'D', [lesson])).not.toBe(
      draftSnapshot('T', 'D', [{ ...lesson, title: 'Outro' }]),
    )
  })

  test('conflito de versão mantém o rascunho, avisa e salva por cima da versão nova', async () => {
    const program = (revision: number): LiveProgram => ({
      id: 'p1',
      title: 'Esconde-esconde',
      description: 'Um jogo',
      status: 'draft',
      revision,
      createdAt: '2026-10-01T00:00:00Z',
      lessons: [
        {
          title: 'Encontro 1',
          instructions: 'Passo a passo',
          starterProjectId: null,
          materials: [],
        },
      ],
    })
    let serverRevision = 1
    let patches = 0
    const bodies: Record<string, unknown>[] = []
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      if (path.startsWith('/api/admin/live/catalog'))
        return Response.json({
          programs: [program(serverRevision)],
          cohorts: [],
          sessions: [],
          enrollments: [],
          nextCursor: null,
        })
      if (path.startsWith('/api/admin/live/templates')) return Response.json([])
      if (path.startsWith('/api/admin/users')) return Response.json({ items: [] })
      if (path === '/api/admin/live/programs/p1' && init?.method === 'PATCH') {
        patches += 1
        const body = JSON.parse(String(init.body))
        bodies.push(body)
        if (patches === 1) {
          // Alguém publicou enquanto a autora editava.
          serverRevision = 2
          return Response.json(
            {
              error: {
                code: 'LIVE_CONFLICT',
                message: 'A sala mudou. Atualize e tente novamente.',
              },
            },
            { status: 409 },
          )
        }
        return Response.json(program(3))
      }
      return Response.json({ error: { code: 'NOT_FOUND', message: path } }, { status: 404 })
    }) as typeof fetch
    const view = await mount(<LiveAdmin teacherId="t1" teacherName="Ana" canWrite />)
    await settle()
    await act(async () => button(view, 'Editar roteiro').click())
    await settle()
    const title = view.querySelector<HTMLInputElement>('input[maxlength="160"]')!
    await act(async () => type(title, 'Esconde-esconde (meu rascunho)'))
    await act(async () => button(view, 'Salvar roteiro').click())
    await settle()
    expect(bodies[0]).toMatchObject({ expectedRevision: 1 })
    const alert = [...view.querySelectorAll('[role="alert"]')].map((node) => node.textContent)
    expect(alert).toContain(REVISION_CONFLICT_MESSAGE)
    expect(view.querySelector<HTMLInputElement>('input[maxlength="160"]')!.value).toBe(
      'Esconde-esconde (meu rascunho)',
    )
    await act(async () => button(view, 'Salvar roteiro').click())
    await settle()
    expect(bodies[1]).toMatchObject({
      expectedRevision: 2,
      title: 'Esconde-esconde (meu rascunho)',
    })
  })

  test('nova turma: escolhe professoras, nasce rascunho e oferece abrir inscrições ali mesmo', async () => {
    const requests: { path: string; method: string; body: Record<string, unknown> | null }[] = []
    const program: LiveProgram = {
      id: 'p1',
      title: 'Esconde-esconde',
      description: 'Um jogo',
      status: 'published',
      revision: 4,
      createdAt: '2026-10-01T00:00:00Z',
      lessons: [{ title: 'Encontro 1', instructions: 'x', starterProjectId: null, materials: [] }],
    }
    const staffByRole: Record<string, unknown[]> = {
      admin: [
        { id: 't1', firstName: 'Ana', lastName: 'Souza', email: 'ana@sz.com', role: 'admin' },
      ],
      staff: [
        { id: 't2', firstName: 'Bia Maria', lastName: 'Lima', email: 'bia@sz.com', role: 'staff' },
      ],
      superadmin: [],
    }
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const path = String(input)
      const method = init?.method ?? 'GET'
      requests.push({
        path,
        method,
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
      })
      if (path.startsWith('/api/admin/live/catalog'))
        return Response.json({ programs: [program], cohorts: [], sessions: [], enrollments: [] })
      if (path.startsWith('/api/admin/live/templates')) return Response.json([])
      if (path.startsWith('/api/admin/users')) {
        const role = new URL(path, 'http://x').searchParams.get('role') ?? ''
        return Response.json({ items: staffByRole[role] ?? [] })
      }
      if (path === '/api/admin/live/programs/p1/cohorts')
        return Response.json(
          {
            cohort: {
              id: 'c9',
              programId: 'p1',
              title: 'Turma de sábado',
              timeZone: 'America/Sao_Paulo',
              capacity: 8,
              accessDays: 30,
              teacherIds: ['t1', 't2'],
              status: 'draft',
              createdAt: '2026-10-14T00:00:00Z',
            },
            sessions: [],
          },
          { status: 201 },
        )
      if (path === '/api/admin/live/cohorts/c9') return Response.json({ id: 'c9', status: 'open' })
      return Response.json({ error: { code: 'NOT_FOUND', message: path } }, { status: 404 })
    }) as typeof fetch
    const view = await mount(<LiveAdmin teacherId="t1" teacherName="Ana" canWrite />)
    await settle()
    await act(async () => button(view, 'Nova turma').click())
    await settle()
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.getAttribute('aria-label')).toBe('Nova turma de Esconde-esconde')
    const boxes = [...dialog.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
    // A própria pessoa já vem marcada; a outra professora entra com um clique.
    expect(boxes.map((box) => box.checked)).toEqual([true, false])
    await act(async () => boxes[1]!.click())
    await act(async () =>
      type(dialog.querySelector<HTMLInputElement>('input[name="title"]')!, 'Turma de sábado'),
    )
    await act(async () =>
      type(dialog.querySelector<HTMLInputElement>('input[name="start-0"]')!, '2026-10-17T15:00'),
    )
    await act(async () =>
      type(dialog.querySelector<HTMLInputElement>('input[name="end-0"]')!, '2026-10-17T16:30'),
    )
    await act(async () => button(document.body, 'Criar turma').click())
    await settle()
    const created = requests.find((item) => item.path === '/api/admin/live/programs/p1/cohorts')
    expect(created?.body).toMatchObject({
      title: 'Turma de sábado',
      teacherIds: ['t1', 't2'],
      teacherNames: { t1: 'Ana', t2: 'Bia' },
    })
    const next = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(next.getAttribute('aria-label')).toBe('Turma criada como rascunho')
    expect(next.textContent).toContain('as famílias não conseguem se inscrever')
    await act(async () => button(next, 'Abrir inscrições').click())
    await settle()
    expect(requests.find((item) => item.path === '/api/admin/live/cohorts/c9')).toMatchObject({
      method: 'PATCH',
      body: { status: 'open' },
    })
    expect(document.querySelector('[role="dialog"]')?.getAttribute('aria-label')).toBe(
      'Inscrições abertas',
    )
  })
})
