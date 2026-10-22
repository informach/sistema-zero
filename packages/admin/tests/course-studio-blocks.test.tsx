import { expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { createStudioRuntimeRelease } from '@sistemazero/core/studio/runtime-catalog'
import {
  PYTHON_COURSE_BLOCKS,
  pythonCourseBlockClosure,
  pythonCourseUnlockIssue,
} from '@sistemazero/studio/python-course-unlocks'
import { pythonEnvironmentFixture } from '../../studio/src/state/fixtures/pythonEnvironment'
import type { CourseView } from '../src/lib/types'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const navigation = await import('next/navigation')
mock.module('next/navigation', () => ({
  ...navigation,
  useRouter: () => ({
    back() {},
    forward() {},
    prefetch() {},
    push() {},
    refresh() {},
    replace() {},
  }),
}))
const { act, useState } = await import('react')
const { createRoot } = await import('react-dom/client')
const { CourseFormDialog } = await import('../src/app/admin/membros/cursos/course-form-dialog')
const { StudioCourseBlocksPicker } = await import(
  '../src/components/studio/studio-course-blocks-picker'
)

async function options(blockIds = PYTHON_COURSE_BLOCKS.map((entry) => entry.id)) {
  const { project, environment } = await pythonEnvironmentFixture('classic')
  return {
    legacyJavaScript: true,
    catalog: {
      version: 1,
      catalog: environment.catalog,
      releases: [
        {
          runtime: project.runtime,
          status: 'active',
          proTemplateIds: ['python-blank'],
          blockIds,
          categoryIds: [],
        },
      ],
    },
  }
}

async function settle(check: () => boolean) {
  for (let attempt = 0; attempt < 40 && !check(); attempt++)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5))
    })
  expect(check()).toBe(true)
}

function checkbox(container: HTMLElement, id: string) {
  return (
    container
      .querySelector(`span[title="${id}"]`)
      ?.closest('label')
      ?.querySelector<HTMLInputElement>('input') ?? null
  )
}

async function mountPicker(initial: string[]) {
  let value = initial
  function Harness() {
    const [ids, setIds] = useState(initial)
    value = ids
    return <StudioCourseBlocksPicker value={ids} onChange={setIds} />
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () => root.render(<Harness />))
  return {
    container,
    value: () => value,
    async language(next: string) {
      await act(async () => {
        const select = container.querySelector<HTMLSelectElement>(
          '[aria-label="Linguagem das ferramentas"]',
        )!
        select.value = next
        select.dispatchEvent(new Event('change', { bubbles: true }))
      })
    },
    async close() {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

function button(container: ParentNode, label: string) {
  return [...container.querySelectorAll<HTMLButtonElement>('button')].find(
    (element) => element.textContent?.trim() === label,
  )!
}

test('o curso oferece catálogos por linguagem com JavaScript como padrão', async () => {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () => {
      root.render(
        <CourseFormDialog
          open
          editing={null}
          journeyCourses={[]}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      )
    })
    const language = document.querySelector<HTMLSelectElement>(
      '[aria-label="Linguagem das ferramentas"]',
    )
    expect(language).not.toBeNull()
    expect(language?.value).toBe('javascript')
    expect([...language!.options].map((option) => option.value)).toEqual(['javascript', 'python'])
  } finally {
    await act(async () => root.unmount())
    container.remove()
  }
})

test('seleção Python aprovada inclui auxiliares visíveis e a troca de linguagem preserva as duas listas', async () => {
  const originalFetch = globalThis.fetch
  const response = await options()
  globalThis.fetch = Object.assign(async () => Response.json(response), {
    preconnect: originalFetch.preconnect,
  })
  const ui = await mountPicker(['sz_js_repeat'])
  try {
    await ui.language('python')
    await settle(() => !!checkbox(ui.container, 'sz_py_print'))
    expect(checkbox(ui.container, 'sz_js_repeat')).toBeNull()
    await act(async () => checkbox(ui.container, 'sz_py_print')!.click())
    expect(ui.value()).toEqual(['sz_js_repeat', ...pythonCourseBlockClosure(['sz_py_print'])])
    expect(ui.container.textContent).toContain('Auxiliares incluídos')
    const companion = PYTHON_COURSE_BLOCKS.find((entry) => entry.id === 'sz_py_print')!
      .dependencies[0]!
    await act(async () => checkbox(ui.container, companion)!.click())
    expect(ui.value()).not.toContain('sz_py_print')
    expect(ui.container.textContent).toContain('Blocos dependentes retirados')
    expect(pythonCourseUnlockIssue(ui.value())).toBeNull()
    const retained = [...ui.value()]
    await ui.language('javascript')
    await settle(() => !!checkbox(ui.container, 'sz_js_repeat'))
    expect(checkbox(ui.container, 'sz_py_print')).toBeNull()
    expect(checkbox(ui.container, 'sz_js_repeat')!.checked).toBe(true)
    expect(ui.value()).toEqual(retained)
  } finally {
    await ui.close()
    globalThis.fetch = originalFetch
  }
})

test('falha ao carregar Python preserva valores, mantém a linguagem e permite tentar novamente', async () => {
  const originalFetch = globalThis.fetch
  let failed = true
  const response = await options()
  globalThis.fetch = Object.assign(
    async () => (failed ? new Response('', { status: 503 }) : Response.json(response)),
    { preconnect: originalFetch.preconnect },
  )
  const initial = ['sz_js_repeat', ...pythonCourseBlockClosure(['sz_py_print'])]
  const ui = await mountPicker(initial)
  try {
    await ui.language('python')
    await settle(() => !!button(ui.container, 'Tentar carregar novamente'))
    expect(ui.value()).toEqual(initial)
    expect(checkbox(ui.container, 'sz_js_repeat')).toBeNull()
    expect(
      ui.container.querySelector<HTMLSelectElement>('[aria-label="Linguagem das ferramentas"]')!
        .value,
    ).toBe('python')
    failed = false
    await act(async () => button(ui.container, 'Tentar carregar novamente').click())
    await settle(() => !!checkbox(ui.container, 'sz_py_print'))
    expect(checkbox(ui.container, 'sz_py_print')!.checked).toBe(true)
    expect(ui.value()).toEqual(initial)
  } finally {
    await ui.close()
    globalThis.fetch = originalFetch
  }
})

test('ambiente escolhido retirado mantém a seleção e oferece a única alternativa sem trocar automaticamente', async () => {
  const originalFetch = globalThis.fetch
  const onlyFirst = await options()
  const original = onlyFirst.catalog.catalog.releases[0]!
  const second = await createStudioRuntimeRelease({ ...original.manifest, releaseId: 'test-2' })
  const initial = {
    ...onlyFirst,
    catalog: {
      ...onlyFirst.catalog,
      catalog: {
        profiles: onlyFirst.catalog.catalog.profiles.map((profile) => ({
          ...profile,
          releases: [
            ...profile.releases,
            { id: second.releaseId, manifestSha256: second.manifestSha256 },
          ],
        })),
        releases: [original, second],
      },
      releases: [
        ...onlyFirst.catalog.releases,
        {
          ...onlyFirst.catalog.releases[0]!,
          runtime: {
            profileId: second.profileId,
            releaseId: second.releaseId,
            manifestSha256: second.manifestSha256,
          },
        },
      ],
    },
  }
  let response: Awaited<ReturnType<typeof options>> = initial
  globalThis.fetch = Object.assign(async () => Response.json(response), {
    preconnect: originalFetch.preconnect,
  })
  const saved = ['sz_js_repeat', ...pythonCourseBlockClosure(['sz_py_print'])]
  const ui = await mountPicker(saved)
  try {
    await ui.language('python')
    await settle(() => !!checkbox(ui.container, 'sz_py_print'))
    await act(async () => {
      const select = ui.container.querySelector<HTMLSelectElement>(
        '[aria-label="Ambiente Python"]',
      )!
      select.value = second.manifestSha256
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await settle(() => !!checkbox(ui.container, 'sz_py_print'))
    response = onlyFirst
    await ui.language('javascript')
    await ui.language('python')
    await settle(
      () =>
        ui.container.textContent?.includes('Não há um catálogo Python aprovado disponível') ===
        true,
    )
    expect(ui.value()).toEqual(saved)
    expect(checkbox(ui.container, 'sz_py_print')).toBeNull()
    const select = ui.container.querySelector<HTMLSelectElement>('[aria-label="Ambiente Python"]')
    expect(select).not.toBeNull()
    expect(select!.value).toBe(second.manifestSha256)
    expect([...select!.options].map((option) => option.value)).toEqual([
      second.manifestSha256,
      original.manifestSha256,
    ])
    await act(async () => {
      select!.value = original.manifestSha256
      select!.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await settle(() => !!checkbox(ui.container, 'sz_py_print'))
    expect(checkbox(ui.container, 'sz_py_print')!.checked).toBe(true)
    expect(ui.value()).toEqual(saved)
    await act(async () => checkbox(ui.container, 'sz_py_print')!.click())
    expect(ui.value()).toContain('sz_js_repeat')
    expect(ui.value()).not.toContain('sz_py_print')
  } finally {
    await ui.close()
    globalThis.fetch = originalFetch
  }
})

test('auxiliar não homologado recusa mudança e limpar Python desconhecido preserva JavaScript', async () => {
  const originalFetch = globalThis.fetch
  const response = await options(['sz_py_print'])
  globalThis.fetch = Object.assign(async () => Response.json(response), {
    preconnect: originalFetch.preconnect,
  })
  const ui = await mountPicker(['sz_js_repeat', 'sz_py_unknown'])
  try {
    await ui.language('python')
    await settle(() => !!checkbox(ui.container, 'sz_py_print'))
    await act(async () => button(ui.container, 'Limpar').click())
    expect(ui.value()).toEqual(['sz_js_repeat'])
    await act(async () => checkbox(ui.container, 'sz_py_print')!.click())
    expect(ui.value()).toEqual(['sz_js_repeat'])
    expect(ui.container.textContent).toContain('auxiliar necessário não está aprovado')
  } finally {
    await ui.close()
    globalThis.fetch = originalFetch
  }
})

test('importação JSON Python reconstitui auxiliares mesmo ao substituir seleção e mantém JavaScript', async () => {
  const originalFetch = globalThis.fetch
  const response = await options()
  globalThis.fetch = Object.assign(async () => Response.json(response), {
    preconnect: originalFetch.preconnect,
  })
  const ui = await mountPicker([
    'sz_js_repeat',
    ...pythonCourseBlockClosure(['sz_py_print']),
    'sz_py_unknown',
  ])
  try {
    await ui.language('python')
    await settle(() => !!checkbox(ui.container, 'sz_py_print'))
    await act(async () => button(ui.container, 'Importar JSON').click())
    const before = [...ui.value()]
    await act(async () => {
      const input = ui.container.querySelector<HTMLInputElement>('input[type="file"]')!
      Object.defineProperty(input, 'files', {
        configurable: true,
        value: [new File([JSON.stringify({ blocks: ['sz_js_repeat'] })], 'javascript.json')],
      })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await settle(() => ui.container.textContent?.includes('ID desconhecido: sz_js_repeat') === true)
    expect(ui.value()).toEqual(before)
    const file = new File([JSON.stringify({ blocks: ['sz_py_print'] })], 'recompensa.json', {
      type: 'application/json',
    })
    await act(async () => {
      const input = ui.container.querySelector<HTMLInputElement>('input[type="file"]')!
      Object.defineProperty(input, 'files', { configurable: true, value: [file] })
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await settle(() => !!button(ui.container, 'Aplicar importação'))
    await act(async () => button(ui.container, 'Aplicar importação').click())
    await settle(() => !!button(document, 'Substituir e aplicar'))
    await act(async () => button(document, 'Substituir e aplicar').click())
    expect(ui.value()).toEqual(['sz_js_repeat', ...pythonCourseBlockClosure(['sz_py_print'])])
    expect(ui.container.textContent).toContain('Auxiliares incluídos')
  } finally {
    await ui.close()
    globalThis.fetch = originalFetch
  }
})

test('salvar curso recusa Python incompleto e envia o conjunto explícito com JavaScript e versão no PATCH', async () => {
  const originalFetch = globalThis.fetch
  const response = await options()
  const requests: Record<string, unknown>[] = []
  globalThis.fetch = Object.assign(
    async (_url: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PATCH') {
        requests.push(JSON.parse(String(init.body)))
        return Response.json({})
      }
      return Response.json(response)
    },
    { preconnect: originalFetch.preconnect },
  )
  const editing: CourseView = {
    id: 'course-python',
    slug: 'curso-python',
    title: 'Curso Python',
    subtitle: null,
    description: null,
    coverImageUrl: null,
    salesPageUrl: null,
    status: 'draft',
    audience: 'kids',
    modality: 'recorded',
    level: 'iniciante',
    careerSlot: null,
    sequentialLock: true,
    version: 7,
    createdAt: '',
    updatedAt: '',
    studioUnlockBlocks: ['sz_js_repeat', 'sz_py_print'],
  }
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  try {
    await act(async () =>
      root.render(
        <CourseFormDialog
          open
          editing={editing}
          journeyCourses={[]}
          onClose={() => {}}
          onSaved={() => {}}
        />,
      ),
    )
    await act(async () => button(document, 'Salvar').click())
    expect(requests).toHaveLength(0)
    await act(async () => {
      const select = document.querySelector<HTMLSelectElement>(
        '[aria-label="Linguagem das ferramentas"]',
      )!
      select.value = 'python'
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await settle(() => !!checkbox(document.body, 'sz_py_print'))
    await act(async () => checkbox(document.body, 'sz_py_print')!.click())
    await act(async () => checkbox(document.body, 'sz_py_print')!.click())
    await act(async () => button(document, 'Salvar').click())
    expect(requests).toHaveLength(1)
    expect(requests[0]).toMatchObject({
      version: 7,
      modality: 'recorded',
      sequentialLock: true,
      studioUnlockBlocks: ['sz_js_repeat', ...pythonCourseBlockClosure(['sz_py_print'])],
    })
    expect(editing.studioUnlockBlocks).toEqual(['sz_js_repeat', 'sz_py_print'])
  } finally {
    await act(async () => root.unmount())
    container.remove()
    globalThis.fetch = originalFetch
  }
})
