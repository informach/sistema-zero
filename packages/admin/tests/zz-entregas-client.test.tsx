import { describe, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { StudioSubmissionQueueRow } from '../src/lib/types'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// ⚠️ `mock.module` é global ao run do Bun e, NO LINUX DO CI, a chave de path casa
// entre arquivos (no Windows não — por isso vazamento daqui nunca aparece local).
// O prefixo `zz-` NÃO protege nada lá: o readdir do ext4 não é alfabético, e este
// arquivo chegou a rodar ANTES do `studio-submission-viewer.test.tsx` no CI.
// Regras deste arquivo, pagas em 21/08 (o viewer testava um componente que ESTE
// mock tinha trocado por `() => null` — 3 runs vermelhos):
// 1. NUNCA mockar um módulo que OUTRO teste exercita de verdade (o viewer). O
//    peso que se quer evitar são os EMBEDS (dynamic/Studio) — mocka-se as folhas.
// 2. Mock de módulo compartilhado espalha o REAL e sobrescreve só o necessário
//    (idioma do zappy-block-sync): import nomeado de outro arquivo não pode morrer.
mock.module('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh() {} }),
}))
const actualSonner = await import('sonner')
mock.module('sonner', () => ({
  ...actualSonner,
  toast: { ...actualSonner.toast, error() {} },
}))
const actualAdminHeader = await import('../src/components/admin/admin-header')
mock.module('@/components/admin/admin-header', () => ({
  ...actualAdminHeader,
  AdminHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}))
const actualCountsStore = await import('../src/components/admin/professor-counts-store')
mock.module('@/components/admin/professor-counts-store', () => ({
  ...actualCountsStore,
  refreshProfessorCounts() {},
}))
// O viewer NÃO é mockado nem carregado aqui: o EntregasClient o importa por
// `next/dynamic`, então com a fila fechada o módulo nunca entra neste processo
// e o teste do viewer o carrega FRESCO, com o registry dele.

interface QueueResponse {
  items: StudioSubmissionQueueRow[]
  total: number
}

interface Deferred<T> {
  promise: Promise<T>
  resolve(value: T): void
}

function deferred<T>(): Deferred<T> {
  let resolvePromise: ((value: T) => void) | undefined
  const promise = new Promise<T>((resolve) => {
    resolvePromise = resolve
  })
  return {
    promise,
    resolve(value) {
      if (!resolvePromise) throw new Error('Promise sem resolvedor')
      resolvePromise(value)
    },
  }
}

const listRequests: Array<Deferred<QueueResponse>> = []
// ⚠️⚠️ Não existe "restaurar" um mock.module: o link ESTÁTICO de um módulo
// carregado depois fica com a PRIMEIRA materialização da chave — re-registrar
// no afterAll não alcança quem linkar depois (medido em 21/08: o viewer test,
// no Linux, recebia este apiGet mesmo com restore antes do import dele). Logo o
// double precisa ser INOFENSIVO POR CONSTRUÇÃO: atende só os paths DESTA fila e
// repassa qualquer outro ao módulo real (que usa o globalThis.fetch do chamador).
const actualApi = await import('../src/lib/api')
mock.module('@/lib/api', () => ({
  ...actualApi,
  apiGet(path: string) {
    if (path === '/api/members/courses?limit=100') {
      return Promise.resolve({ items: [], total: 0, limit: 100, offset: 0 })
    }
    if (path.startsWith('/api/members/studio-submissions?')) {
      if (path.includes('status=pending')) return Promise.resolve({ total: 0 })
      const request = deferred<QueueResponse>()
      listRequests.push(request)
      return request.promise
    }
    return actualApi.apiGet(path)
  },
}))

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { EntregasClient } = await import('../src/app/admin/professor/entregas/entregas-client')

function row(name: string, id: string): StudioSubmissionQueueRow {
  return {
    userId: id,
    accountId: id,
    blockId: `block-${id}`,
    lessonId: `lesson-${id}`,
    lessonTitle: 'Aula',
    moduleTitle: 'Módulo',
    courseId: 'course-1',
    courseTitle: 'Curso',
    audience: 'adult',
    submittedAt: '2026-08-21T12:00:00.000Z',
    score: null,
    checkedAt: null,
    passed: false,
    message: null,
    answered: false,
    reviewed: false,
    accountName: name,
    accountEmail: `${id}@example.com`,
    childName: null,
  }
}

async function waitUntil(condition: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (condition()) return
    await act(async () => {
      await Promise.resolve()
    })
  }
  throw new Error('Condição esperada não aconteceu após esvaziar a fila de updates.')
}

describe('fila de entregas ao vivo', () => {
  test('uma resposta antiga não sobrescreve a atualização mais recente', async () => {
    listRequests.length = 0
    const visibility = Object.getOwnPropertyDescriptor(document, 'visibilityState')
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    const container = document.createElement('div')
    document.body.append(container)
    const root = createRoot(container)

    try {
      await act(async () => root.render(<EntregasClient />))
      await waitUntil(() => listRequests.length === 1)

      act(() => window.dispatchEvent(new Event('focus')))
      await waitUntil(() => listRequests.length === 2)

      await act(async () => {
        listRequests[1]?.resolve({ items: [row('Resposta nova', 'new')], total: 1 })
        await Promise.resolve()
      })
      await waitUntil(() => container.textContent?.includes('Resposta nova') === true)

      await act(async () => {
        listRequests[0]?.resolve({ items: [row('Resposta antiga', 'old')], total: 1 })
        await Promise.resolve()
      })
      await waitUntil(() => container.textContent?.includes('1 entregas') === true)

      expect(container.textContent).toContain('Resposta nova')
      expect(container.textContent).not.toContain('Resposta antiga')
    } finally {
      await act(async () => root.unmount())
      container.remove()
      if (visibility) Object.defineProperty(document, 'visibilityState', visibility)
      else Reflect.deleteProperty(document, 'visibilityState')
    }
  })
})
