import { afterEach, describe, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// Contrato completo de `next/navigation`, só o roteador trocado (o mock vale para o processo).
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
const { toast } = await import('sonner')
const { CourseFormDialog } = await import('../src/app/admin/membros/cursos/course-form-dialog')
const { CoursesClient } = await import('../src/app/admin/membros/cursos/courses-client')
const { PlatformProvider } = await import('../src/components/admin/platform-provider')
const { setPlatform } = await import('../src/components/admin/platform-store')
const { isLiveCourse, modalityChangeWarning, modalityFilterParam, studentLessonLink } =
  await import('../src/lib/course-modality')

type Editing = Parameters<typeof CourseFormDialog>[0]['editing']
/** As telas do curso são as mais pesadas: com a máquina ocupada passavam dos 5 s do bun. */
const UI_TIMEOUT = 20_000

let cleanup: (() => void) | null = null
const originalFetch = globalThis.fetch
const originalToastError = toast.error
afterEach(() => {
  cleanup?.()
  cleanup = null
  globalThis.fetch = originalFetch
  toast.error = originalToastError
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
const button = (label: string) => {
  const found = [...document.querySelectorAll<HTMLButtonElement>('button')].find(
    (node) => node.textContent?.trim() === label,
  )
  if (!found) throw new Error(`Botão ausente: ${label}`)
  return found
}
function choose(select: HTMLSelectElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!.call(select, value)
  select.dispatchEvent(new Event('change', { bubbles: true }))
}
function type(input: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function capture(responder?: (method: string, url: string) => Response | null) {
  const sent: { method: string; url: string; body: Record<string, unknown> | null }[] = []
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    sent.push({ method, url, body: typeof init?.body === 'string' ? JSON.parse(init.body) : null })
    const custom = responder?.(method, url)
    if (custom) return custom
    if (method === 'GET') return Response.json({ items: [], total: 0, limit: 100, offset: 0 })
    return Response.json({ id: 'novo', title: 'Curso novo', slug: 'curso-novo' })
  }) as typeof fetch
  return sent
}

const live = {
  id: '11111111-1111-1111-1111-111111111111',
  version: 2,
  slug: 'farol-ao-vivo',
  title: 'Farol ao vivo',
  subtitle: null,
  description: 'Oficina',
  coverImageUrl: 'https://cdn/x.webp',
  salesPageUrl: null,
  status: 'draft',
  audience: 'kids',
  modality: 'live',
  level: 'iniciante',
  track: '2d',
  careerSlot: null,
  journeyRole: 'reward',
  sequentialLock: true,
  videoBeforeActivity: false,
  studioUnlockBlocks: [],
  createdAt: '2026-10-14T00:00:00Z',
  updatedAt: '2026-10-14T00:00:00Z',
}

describe('modalidade no formulário do curso', () => {
  test(
    'curso novo nasce gravado, com a explicação de uma linha e a Jornada à vista',
    async () => {
      capture()
      await mount(
        <CourseFormDialog
          open
          editing={null}
          prefill={{ audience: 'kids' }}
          journeyCourses={[]}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      )
      expect(document.querySelector<HTMLSelectElement>('#cmodality')?.value).toBe('recorded')
      expect(document.body.textContent).toContain(
        'Ao vivo: os encontros acontecem em turmas e o curso só aparece em Oficinas.',
      )
      expect(document.querySelector('#journey-slot') !== null).toBe(true)
      expect(document.querySelector('#csequentiallock') !== null).toBe(true)
    },
    UI_TIMEOUT,
  )

  test(
    'ao vivo esconde a Jornada e vai ao servidor sem posição nem papel na Jornada',
    async () => {
      const sent = capture()
      await mount(
        <CourseFormDialog
          open
          editing={null}
          prefill={{ audience: 'kids', careerSlot: 3, level: 'iniciante', track: '2d' }}
          journeyCourses={[]}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      )
      await act(async () =>
        choose(document.querySelector<HTMLSelectElement>('#cmodality')!, 'live'),
      )
      expect(document.querySelector('#journey-slot') !== null).toBe(false)
      expect(document.querySelector('#csequentiallock') !== null).toBe(false)
      expect(document.querySelector('#cvideobeforeactivity') !== null).toBe(false)
      expect(document.querySelector('[aria-label="Linguagem das ferramentas"]')).not.toBeNull()
      await settle()
      const repeat = document
        .querySelector('span[title="sz_js_repeat"]')
        ?.closest('label')
        ?.querySelector<HTMLInputElement>('input')
      expect(repeat).toBeDefined()
      await act(async () => repeat!.click())
      await act(async () =>
        type(document.querySelector<HTMLInputElement>('#title')!, 'Farol ao vivo'),
      )
      await act(async () => button('Salvar').click())
      await settle()
      const post = sent.find((call) => call.method === 'POST')
      expect(post?.url).toBe('/api/members/courses')
      expect(post?.body).toMatchObject({ modality: 'live', careerSlot: null, audience: 'kids' })
      expect(post?.body).not.toHaveProperty('journeyRole')
      expect(post?.body).toHaveProperty('studioUnlockBlocks', ['sz_js_repeat'])
    },
    UI_TIMEOUT,
  )

  test(
    'trocar a modalidade de um curso com turma mostra o recado do servidor',
    async () => {
      const errors: string[] = []
      toast.error = ((message: string) => {
        errors.push(message)
        return 0
      }) as typeof toast.error
      const sent = capture((method) =>
        method === 'PATCH'
          ? Response.json(
              {
                error: {
                  code: 'COURSE_MODALITY_LOCKED',
                  message: 'Este curso já tem turma: a modalidade não pode mudar.',
                },
              },
              { status: 409 },
            )
          : null,
      )
      await mount(
        <CourseFormDialog
          open
          editing={live as unknown as Editing}
          journeyCourses={[]}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      )
      expect(document.querySelector<HTMLSelectElement>('#cmodality')?.value).toBe('live')
      expect(document.body.textContent).toContain(
        'Trocar depois só vale enquanto o curso não tem turma.',
      )
      await act(async () =>
        choose(document.querySelector<HTMLSelectElement>('#cmodality')!, 'recorded'),
      )
      await act(async () => button('Salvar').click())
      await settle()
      // Antes de ir ao servidor, o aviso do que muda para quem já vê o curso.
      expect(document.body.textContent).toContain('O curso passa a ser gravado')
      await act(async () => button('Salvar mesmo assim').click())
      await settle()
      expect(sent.find((call) => call.method === 'PATCH')?.body).toMatchObject({
        modality: 'recorded',
        version: 2,
      })
      expect(errors).toEqual(['Este curso já tem turma: a modalidade não pode mudar.'])
    },
    UI_TIMEOUT,
  )
})

describe('lista de cursos: selo, filtro e a Jornada só com gravados', () => {
  test(
    'o selo "Ao vivo", o filtro repassado e o painel da Jornada sem o curso ao vivo',
    async () => {
      setPlatform('kids')
      const recorded = { ...live, id: '2', slug: 'cade', title: 'Cadê', modality: 'recorded' }
      const sent = capture((method, url) => {
        if (method !== 'GET' || !url.startsWith('/api/members/courses')) return null
        const params = new URL(url, 'http://admin.local').searchParams
        const items =
          params.get('modality') === 'recorded'
            ? [recorded]
            : params.get('modality') === 'live'
              ? [live]
              : [live, recorded]
        return Response.json({ items, total: items.length, limit: 100, offset: 0 })
      })
      const view = await mount(
        <PlatformProvider initialPlatform="kids">
          <CoursesClient currentRole="admin" />
        </PlatformProvider>,
      )
      await act(async () => new Promise((resolve) => setTimeout(resolve, 300)))
      await settle()
      const liveRow = [...view.querySelectorAll('tr')].find((row) =>
        row.textContent?.includes('Farol ao vivo'),
      )
      expect(liveRow?.textContent).toContain('Ao vivo')
      expect(liveRow?.textContent).toContain('As turmas ficam em')
      // A Jornada pede só gravados.
      expect(sent.some((call) => call.url.includes('audience=kids&modality=recorded'))).toBe(true)
      await act(async () =>
        choose(view.querySelector<HTMLSelectElement>('select[aria-label="Modalidade"]')!, 'live'),
      )
      await act(async () => new Promise((resolve) => setTimeout(resolve, 300)))
      await settle()
      expect(sent.some((call) => /\/api\/members\/courses\?.*modality=live/.test(call.url))).toBe(
        true,
      )
    },
    UI_TIMEOUT,
  )
})

describe('regras puras da modalidade', () => {
  test('ausente é gravado; o aviso só aparece quando troca; o filtro só leva o contrato', () => {
    expect(isLiveCourse({ modality: 'live' })).toBe(true)
    expect(isLiveCourse({})).toBe(false)
    expect(isLiveCourse(null)).toBe(false)
    expect(modalityChangeWarning('live', 'live')).toBeNull()
    expect(modalityChangeWarning('recorded', 'live')).toContain('só aparece em Oficinas')
    expect(modalityFilterParam('live')).toBe('live')
    expect(modalityFilterParam('ambas')).toBeUndefined()
    expect(modalityFilterParam(null)).toBeUndefined()
  })

  test('"Ver como a criança vê" some na aula de curso ao vivo', () => {
    const course = {
      slug: 'farol',
      audience: 'kids' as const,
      status: 'published',
      lessonPublished: true,
    }
    const urls = { kids: 'https://kids.example/', adult: 'https://adultos.example' }
    expect(studentLessonLink(course, urls, 'l1')).toEqual({
      url: 'https://kids.example/cursos/farol/aulas/l1',
      enabled: true,
    })
    expect(studentLessonLink({ ...course, lessonPublished: false }, urls, 'l1')?.enabled).toBe(
      false,
    )
    expect(studentLessonLink({ ...course, modality: 'live' }, urls, 'l1')).toBeNull()
    expect(studentLessonLink(course, { adult: 'https://adultos.example' }, 'l1')).toBeNull()
    expect(studentLessonLink(null, urls, 'l1')).toBeNull()
  })
})
