import { afterEach, describe, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LiveCatalogView, LiveCohort, LiveCourseSummary } from '@sistemazero/core/live'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// `mock.module` vale para o processo inteiro: preserve o contrato de `next/navigation` e troque
// só o roteador (o formulário do curso o usa).
const nextNavigation = await import('next/navigation')
mock.module('next/navigation', () => ({
  ...nextNavigation,
  useRouter: () => ({
    back: () => {},
    forward: () => {},
    prefetch: () => {},
    push: () => {},
    refresh: () => {},
    replace: () => {},
  }),
}))

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { PlatformProvider } = await import('../src/components/admin/platform-provider')
const { setPlatform } = await import('../src/components/admin/platform-store')
const { LiveAdmin } = await import('../src/app/admin/oficinas/workshops-admin')

let cleanup: (() => void) | null = null
const originalFetch = globalThis.fetch
afterEach(() => {
  cleanup?.()
  cleanup = null
  globalThis.fetch = originalFetch
  setPlatform('kids')
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
const settle = async () => {
  for (let i = 0; i < 6; i++) await act(async () => new Promise((r) => setTimeout(r, 0)))
}
function button(scope: ParentNode, label: string) {
  const found = [...scope.querySelectorAll('button')].find(
    (node) => node.textContent?.trim() === label,
  )
  if (!found) throw new Error(`Botão ausente: ${label}`)
  return found
}
function type(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}
function choose(select: HTMLSelectElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, value)
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

const COURSE: LiveCourseSummary = {
  id: 'c1',
  slug: 'farol-ao-vivo',
  title: 'Farol ao vivo',
  audience: 'kids',
  description: '',
  coverImageUrl: null,
  lessons: [
    { id: 'l1', title: 'Andar' },
    { id: 'l2', title: 'A chave' },
  ],
}
const EMPTY_COURSE: LiveCourseSummary = { ...COURSE, id: 'c2', title: 'Sem aulas', lessons: [] }
const COHORT: LiveCohort = {
  id: 'k1',
  programId: '',
  courseId: 'c1',
  title: 'Turma de sábado',
  timeZone: 'America/Sao_Paulo',
  capacity: 8,
  accessDays: 30,
  teacherIds: ['t2'],
  teacherNames: { t2: 'Bia' },
  status: 'draft',
  createdAt: '2026-10-14T00:00:00Z',
}
const STAFF: Record<string, unknown[]> = {
  admin: [{ id: 't1', firstName: 'Ana', lastName: 'Souza', email: 'ana@sz.com', role: 'admin' }],
  staff: [
    { id: 't2', firstName: 'Bia Maria', lastName: 'Lima', email: 'bia@sz.com', role: 'staff' },
  ],
  superadmin: [],
}

function server(catalog: (audience: string | null) => LiveCatalogView) {
  const requests: { path: string; method: string; body: Record<string, unknown> | null }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = String(input)
    const method = init?.method ?? 'GET'
    requests.push({
      path,
      method,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : null,
    })
    const url = new URL(path, 'http://admin.local')
    if (url.pathname === '/api/admin/live/catalog')
      return Response.json(catalog(url.searchParams.get('audience')))
    if (url.pathname === '/api/admin/users')
      return Response.json({ items: STAFF[url.searchParams.get('role') ?? ''] ?? [] })
    if (url.pathname === '/api/admin/live/courses/c1/cohorts')
      return Response.json(
        { cohort: { ...COHORT, id: 'k9', title: 'Turma nova', teacherIds: ['t1', 't2'] } },
        { status: 201 },
      )
    if (url.pathname === '/api/admin/live/cohorts/k9')
      return Response.json({ id: 'k9', status: 'open' })
    if (url.pathname === '/api/members/courses') return Response.json({ items: [], total: 0 })
    return Response.json({ error: { code: 'NOT_FOUND', message: path } }, { status: 404 })
  }) as typeof fetch
  return requests
}

const catalogOf = (courses: LiveCourseSummary[], cohorts: LiveCohort[] = []): LiveCatalogView => ({
  courses,
  programs: [],
  cohorts,
  sessions: [],
  enrollments: [],
  nextCursor: null,
})

const page = () => (
  <PlatformProvider initialPlatform="kids">
    <LiveAdmin teacherId="t1" teacherName="Ana" canWrite />
  </PlatformProvider>
)

describe('Oficinas ao vivo: as turmas dos cursos ao vivo da plataforma', () => {
  test('lista os cursos ao vivo da plataforma ativa e troca junto com o seletor', async () => {
    setPlatform('kids')
    const requests = server((audience) =>
      audience === 'kids' ? catalogOf([COURSE], [COHORT]) : catalogOf([]),
    )
    const view = await mount(page())
    await settle()
    expect(view.textContent).toContain('Farol ao vivo')
    expect(view.textContent).toContain('2 aulas publicadas: 2 encontros por turma')
    expect(view.textContent).toContain('Turma de sábado')
    expect(view.textContent).toContain('Professoras: Bia')
    // O editor de roteiro antigo saiu: nada de encontros com instruções ou projeto inicial aqui.
    expect(view.textContent).not.toContain('Projeto inicial')
    expect(view.textContent).not.toContain('Salvar roteiro')
    expect(view.querySelector('a[href="/admin/membros/cursos/c1"]') !== null).toBe(true)
    expect(requests.some((r) => r.path === '/api/admin/live/catalog?audience=kids')).toBe(true)

    await act(async () => setPlatform('adult'))
    await settle()
    expect(requests.some((r) => r.path === '/api/admin/live/catalog?audience=adult')).toBe(true)
    expect(view.textContent).not.toContain('Farol ao vivo')
    expect(view.textContent).toContain('Ainda não há curso ao vivo em Adultos')
  })

  test('nova turma: uma data por AULA PUBLICADA, no fuso escolhido, pela rota do curso', async () => {
    setPlatform('kids')
    const requests = server(() => catalogOf([COURSE]))
    const view = await mount(page())
    await settle()
    await act(async () => button(view, 'Nova turma').click())
    await settle()
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.getAttribute('aria-label')).toBe('Nova turma de Farol ao vivo')
    expect(
      [...dialog.querySelectorAll('legend')]
        .map((legend) => legend.textContent ?? '')
        .filter((text) => text.startsWith('Encontro')),
    ).toEqual(['Encontro 1: Andar', 'Encontro 2: A chave'])
    const boxes = [...dialog.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')]
    expect(boxes.map((box) => box.checked)).toEqual([true, false])
    await act(async () => boxes[1]!.click())
    await act(async () =>
      choose(dialog.querySelector<HTMLSelectElement>('select[name="timeZone"]')!, 'America/Manaus'),
    )
    const input = (name: string) => dialog.querySelector<HTMLInputElement>(`input[name="${name}"]`)!
    await act(async () => type(input('title'), 'Turma nova'))
    await act(async () => type(input('start-0'), '2026-10-17T15:00'))
    await act(async () => type(input('end-0'), '2026-10-17T16:30'))
    await act(async () => type(input('start-1'), '2026-10-24T15:00'))
    await act(async () => type(input('end-1'), '2026-10-24T16:30'))
    await act(async () => button(document.body, 'Criar turma').click())
    await settle()
    const created = requests.find((r) => r.path === '/api/admin/live/courses/c1/cohorts')
    expect(created?.method).toBe('POST')
    expect(created?.body).toEqual({
      title: 'Turma nova',
      timeZone: 'America/Manaus',
      capacity: 8,
      accessDays: 30,
      teacherIds: ['t1', 't2'],
      teacherNames: { t1: 'Ana', t2: 'Bia' },
      // 15h em Manaus = 19h UTC.
      schedule: [
        { startsAt: '2026-10-17T19:00:00.000Z', endsAt: '2026-10-17T20:30:00.000Z' },
        { startsAt: '2026-10-24T19:00:00.000Z', endsAt: '2026-10-24T20:30:00.000Z' },
      ],
    })
    const next = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(next.getAttribute('aria-label')).toBe('Turma criada como rascunho')
    await act(async () => button(next, 'Abrir inscrições').click())
    await settle()
    expect(requests.find((r) => r.path === '/api/admin/live/cohorts/k9')).toMatchObject({
      method: 'PATCH',
      body: { status: 'open' },
    })
  })

  test('datas fora de ordem não vão ao servidor, e o recado diz o encontro', async () => {
    setPlatform('kids')
    const requests = server(() => catalogOf([COURSE]))
    const view = await mount(page())
    await settle()
    await act(async () => button(view, 'Nova turma').click())
    await settle()
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    const input = (name: string) => dialog.querySelector<HTMLInputElement>(`input[name="${name}"]`)!
    await act(async () => type(input('title'), 'Turma nova'))
    await act(async () => type(input('start-0'), '2026-10-24T15:00'))
    await act(async () => type(input('end-0'), '2026-10-24T16:30'))
    await act(async () => type(input('start-1'), '2026-10-17T15:00'))
    await act(async () => type(input('end-1'), '2026-10-17T16:30'))
    await act(async () => button(document.body, 'Criar turma').click())
    await settle()
    expect(dialog.querySelector('[role="alert"]')?.textContent).toContain(
      'O encontro 2 começa antes do fim do encontro 1',
    )
    expect(requests.some((r) => r.path.includes('/cohorts') && r.method === 'POST')).toBe(false)
  })

  test('curso sem aula publicada explica o que falta e leva ao editor', async () => {
    setPlatform('kids')
    server(() => catalogOf([EMPTY_COURSE]))
    const view = await mount(page())
    await settle()
    expect(view.textContent).toContain('Nenhuma aula publicada ainda')
    await act(async () => button(view, 'Nova turma').click())
    await settle()
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!
    expect(dialog.textContent).toContain('Este curso ainda não tem aula publicada.')
    expect(dialog.querySelector('form') !== null).toBe(false)
    expect(dialog.querySelector('a[href="/admin/membros/cursos/c2"]')?.textContent).toBe(
      'Abrir o curso no editor',
    )
  })

  test('"Criar curso ao vivo" abre o formulário do curso já em Ao vivo e na plataforma ativa', async () => {
    setPlatform('kids')
    server(() => catalogOf([]))
    const view = await mount(page())
    await settle()
    await act(async () => button(view, 'Criar curso ao vivo').click())
    await settle()
    expect(document.querySelector<HTMLSelectElement>('#cmodality')?.value).toBe('live')
    expect(document.querySelector<HTMLSelectElement>('#caudience')?.value).toBe('kids')
    // Curso ao vivo não ocupa posição na Jornada.
    expect(document.querySelector('#journey-slot') !== null).toBe(false)
    expect(document.body.textContent).toContain(
      'Ao vivo: os encontros acontecem em turmas e o curso só aparece em Oficinas.',
    )
    // Prazo próprio: o formulário do curso é a tela mais pesada daqui, e com a máquina ocupada
    // (build ao lado, CI) passava dos 5 s de fábrica do bun. É tempo, não regra.
  }, 20_000)
})
