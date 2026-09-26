import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

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

// O TipTap (dynamic, ssr:false) não precisa subir para provar o fluxo de salvar e publicar;
// a superfície do módulo é preservada (só `RichTextEditor`).
mock.module('@/components/editor/rich-text-editor', () => ({
  RichTextEditor: ({
    content,
    onChange,
  }: {
    content: string
    onChange: (markdown: string) => void
  }) => (
    <textarea
      data-testid="rich"
      defaultValue={content}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}))

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { HelpEditorClient } = await import('../src/app/admin/como-fazer/[id]/help-editor-client')

const ID = '0f5c1e6a-3f4e-4b0a-9c1d-2a7b8e9f0a1b'
const COLLECTION = '9d2a4f6e-1b3c-4d5e-8f7a-6b5c4d3e2f1a'

function tutorial(overrides: Partial<Record<string, unknown>> = {}) {
  const draft = {
    title: 'Como ver meu jogo na Pré-visualização',
    summary: 'Onde o jogo aparece enquanto você monta os blocos.',
    keywords: ['prévia'],
    toolRef: 'estudio-completo',
    steps: [{ id: 'passo-1', title: 'Abra a aba', body: 'Toque em **Pré-visualização**.' }],
  }
  return {
    id: ID,
    slug: 'estudio-pre-visualizacao',
    collectionId: COLLECTION,
    status: 'draft',
    revision: 3,
    position: 0,
    draft,
    published: null as typeof draft | null,
    hasUnpublishedChanges: false,
    updatedAt: '2026-09-26T12:00:00.000Z',
    publishedAt: null,
    ...overrides,
  }
}

const collections = {
  collections: [
    {
      id: COLLECTION,
      slug: 'estudio',
      title: 'Estúdio',
      description: '',
      icon: 'blocks',
      tone: 'estudio',
      position: 0,
      status: 'active',
      publishedCount: 0,
    },
  ],
}

let calls: Array<{ path: string; method: string; body: Record<string, unknown> | null }>
let current: ReturnType<typeof tutorial>
const originalFetch = globalThis.fetch

beforeEach(() => {
  calls = []
  current = tutorial()
  globalThis.fetch = Object.assign(
    (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const path = String(input)
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null
      calls.push({ path, method, body })
      if (path.endsWith('/help/collections')) return Response.json(collections)
      if (method === 'PATCH') {
        current = { ...current, draft: body.draft, revision: current.revision + 1 }
        return Response.json(current)
      }
      if (path.endsWith('/publish')) {
        current = {
          ...current,
          status: 'published',
          published: current.draft,
          revision: current.revision + 1,
        }
        return Response.json(current)
      }
      return Response.json(current)
    }) as typeof fetch,
    { preconnect: originalFetch.preconnect },
  )
})

afterEach(() => {
  globalThis.fetch = originalFetch
})

function fixture() {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  const button = (label: string) => {
    const node = [...document.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === label,
    )
    if (!node) throw new Error(`Botão ausente: ${label}`)
    return node
  }
  return {
    root,
    button,
    close: async () => {
      await act(async () => root.unmount())
      container.remove()
    },
  }
}

async function mount() {
  const f = fixture()
  await act(async () => {
    f.root.render(<HelpEditorClient tutorialId={ID} currentRole="admin" />)
  })
  await act(async () => {})
  return f
}

test('salvar rascunho manda o expectedRevision da leitura e o documento inteiro', async () => {
  const f = await mount()
  const title = document.querySelector('#t-title') as HTMLInputElement
  expect(title.value).toBe('Como ver meu jogo na Pré-visualização')

  await act(async () => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
    setter?.call(title, 'Como ver o jogo rodando')
    title.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    f.button('Salvar rascunho').click()
  })
  await act(async () => {})

  const patch = calls.find((c) => c.method === 'PATCH')
  expect(patch?.path).toBe(`/api/members/help/tutorials/${ID}`)
  expect(patch?.body?.expectedRevision).toBe(3)
  expect((patch?.body?.draft as { title: string }).title).toBe('Como ver o jogo rodando')
  expect(patch?.body?.slug).toBe('estudio-pre-visualizacao')
  await f.close()
})

test('revisar e publicar: sem pendência publica com a revisão atual; nenhuma rota de progresso', async () => {
  const f = await mount()
  await act(async () => {
    f.button('Revisar e publicar').click()
  })
  expect(document.body.textContent).toContain('Sem pendências')
  await act(async () => {
    f.button('Publicar').click()
  })
  await act(async () => {})
  const publish = calls.find((c) => c.path.endsWith('/publish'))
  expect(publish?.method).toBe('POST')
  expect(publish?.body?.expectedRevision).toBe(3)
  expect(calls.every((c) => c.path.startsWith('/api/members/help/'))).toBe(true)
  expect(document.body.textContent).toContain('Publicado')
  await f.close()
})

test('revisar e publicar: bloqueio do validador do core trava o botão e nomeia o problema', async () => {
  current = tutorial({
    draft: {
      title: 'Como ver meu jogo',
      summary: '',
      keywords: [],
      steps: [{ id: 'passo-1', title: '', body: '' }],
    },
  })
  const f = await mount()
  await act(async () => {
    f.button('Revisar e publicar').click()
  })
  const publicar = f.button('Publicar') as HTMLButtonElement
  expect(publicar.disabled).toBe(true)
  expect(document.body.textContent).toMatch(/resumo/i)
  expect(calls.some((c) => c.path.endsWith('/publish'))).toBe(false)
  await f.close()
})

test('tutorial arquivado abre só para leitura', async () => {
  current = tutorial({ status: 'archived' })
  const f = await mount()
  expect((document.querySelector('#t-title') as HTMLInputElement).disabled).toBe(true)
  expect([...document.querySelectorAll('button')].map((b) => b.textContent?.trim())).not.toContain(
    'Revisar e publicar',
  )
  await f.close()
})
