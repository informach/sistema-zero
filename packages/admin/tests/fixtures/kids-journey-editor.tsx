import { afterEach, beforeEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  analyzeKidsJourneyReadiness,
  compareKidsJourney,
  initialKidsJourneyPolicy,
  type KidsJourneyPolicy,
} from '@sistemazero/core/journey'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const replaced: string[] = []
const navigation = await import('next/navigation')
mock.module('next/navigation', () => ({
  ...navigation,
  useRouter: () => ({ replace: (path: string) => replaced.push(path) }),
}))
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { PlatformProvider } = await import('../../src/components/admin/platform-provider')
const { setPlatform } = await import('../../src/components/admin/platform-store')
const { KidsJourneyEditor } = await import(
  '../../src/app/admin/professor/jornada-kids/journey-editor'
)
const base = '/api/members/journey/kids'
const id = '11111111-1111-4111-8111-111111111111'
const actorId = '22222222-2222-4222-8222-222222222222'
const calls: Array<{ path: string; method: string; body: Record<string, unknown> | null }> = []
const originalFetch = globalThis.fetch
let record: {
  phase: 'published' | 'initializing'
  version: number
  policy: KidsJourneyPolicy
  permissions: { canEdit: boolean }
}
let preparation: ReturnType<typeof prepared>
let failure: { suffix: string; status: number; message: string } | null
let deferPolicy: (() => Promise<Response>) | null
let rejectReadiness: boolean
let historyRows: unknown[]
let malformedPolicy: boolean
let invalidPreview: boolean
const close: Array<() => Promise<void>> = []
function prepared(candidatePolicy = initialKidsJourneyPolicy()) {
  return {
    id,
    origin: 'configuration',
    expectedVersion: 1,
    candidatePolicy,
    draftHash: 'a'.repeat(64),
    catalogHash: 'b'.repeat(64),
    cohortHash: null as string | null,
    status: 'capturing',
    processed: 0,
    reason: 'Teste pedagógico',
    actorKind: 'user',
    actorId,
    updatedAt: '2026-10-19T12:00:00.000Z',
  }
}
function preview(candidate: KidsJourneyPolicy) {
  return {
    baseVersion: record.version,
    scope: 'selected-profiles',
    readiness: analyzeKidsJourneyReadiness({
      policy: candidate,
      catalog: rejectReadiness ? null : [],
    }),
    newLearner: compareKidsJourney({
      policy: record.policy,
      proposedPolicy: candidate,
      policyVersion: record.version,
      catalog: [],
      earned: {
        level: 'noob',
        capabilities: [],
        courseAccess: { entry: [], expanded: [], reward: [] },
      },
      milestones: [],
    }),
    sample: [],
  }
}
beforeEach(() => {
  window.sessionStorage.clear()
  setPlatform('kids')
  calls.length = 0
  replaced.length = 0
  record = {
    phase: 'published',
    version: 1,
    policy: initialKidsJourneyPolicy(),
    permissions: { canEdit: true },
  }
  preparation = prepared()
  failure = null
  deferPolicy = null
  rejectReadiness = false
  historyRows = []
  malformedPolicy = false
  invalidPreview = false
  globalThis.fetch = Object.assign(
    (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
      const url = new URL(String(input), 'https://admin.test')
      const path = url.pathname + url.search
      const method = init?.method ?? 'GET'
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null
      calls.push({ path, method, body })
      if (failure && path.endsWith(failure.suffix))
        return Response.json(
          { error: { code: 'TEST', message: failure.message } },
          { status: failure.status },
        )
      if (path.startsWith('/api/members/courses?')) return Response.json({ items: [], total: 0 })
      if (path === base && deferPolicy) return deferPolicy()
      if (path === base)
        return Response.json(malformedPolicy ? { ...record, permissions: undefined } : record)
      if (path.startsWith(`${base}/history?`)) return Response.json(historyRows)
      if (path === `${base}/preview`)
        return Response.json(
          invalidPreview
            ? { ...preview(body.policy), baseVersion: record.version + 1 }
            : preview(body.policy),
        )
      if (path === `${base}/preparations`) {
        preparation = { ...prepared(body.policy), reason: body.reason }
        return Response.json(preparation)
      }
      if (path === `${base}/preparations/${id}/advance`) {
        preparation = { ...preparation, status: 'ready', processed: 12, cohortHash: 'c'.repeat(64) }
        return Response.json({ status: 'advanced', preparation })
      }
      if (path === `${base}/preparations/${id}/publish`) {
        record = { ...record, version: 2, policy: preparation.candidatePolicy }
        return Response.json({ phase: 'published', version: record.version, policy: record.policy })
      }
      if (path === `${base}/preparations/${id}`) return Response.json(preparation)
      throw new Error(`API inesperada: ${method} ${path}`)
    }) as typeof fetch,
    { preconnect: originalFetch.preconnect },
  )
})
afterEach(async () => {
  for (const cleanup of close.splice(0)) await cleanup()
  globalThis.fetch = originalFetch
})
async function mount(resume?: unknown) {
  const container = document.createElement('div')
  document.body.append(container)
  const root = createRoot(container)
  await act(async () =>
    root.render(
      <PlatformProvider initialPlatform="kids">
        <KidsJourneyEditor initialPreparation={resume} />
      </PlatformProvider>,
    ),
  )
  close.push(async () => {
    await act(async () => root.unmount())
    container.remove()
  })
  return container
}
function button(container: HTMLElement, label: string) {
  const found = [...container.querySelectorAll('button')].find(
    (node) => node.textContent?.trim() === label,
  )
  if (!found) throw new Error(`Botão ausente: ${label}`)
  return found
}
async function click(container: HTMLElement, label: string) {
  await act(async () => button(container, label).click())
}
async function pause(container: HTMLElement) {
  const select = container.querySelector('select[aria-label="Progressão"]') as HTMLSelectElement
  await act(async () => {
    select.value = 'paused'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
async function reason(container: HTMLElement) {
  const input = container.querySelector(
    'textarea[aria-label="Motivo da mudança"]',
  ) as HTMLTextAreaElement
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(
      input,
      'Teste pedagógico',
    )
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const writes = () =>
  calls.filter((call) => call.method !== 'GET' && !call.path.endsWith('/preview'))

test('política persistida e pausa: comparação de modo sem changes não vira ausência de mudança', async () => {
  const container = await mount()
  expect(container.textContent).toContain('Versão 1')
  expect(container.querySelectorAll('nav[aria-label="Postos"] button').length).toBe(8)
  await pause(container)
  await click(container, 'Comparar com a versão no ar')
  expect(container.textContent).toContain('Ativa → Pausada')
  expect(container.textContent).toContain('Simulação de uma criança que está começando')
  expect(button(container, 'Preparar publicação').disabled).toBe(true)
  // Os passos à vista leem o estado: mudou e comparou, falta dizer o motivo.
  expect(
    container.querySelector('ol[aria-label="Passos para publicar"] [aria-current="step"]')
      ?.textContent,
  ).toContain('Dizer o motivo')
  expect(writes()).toEqual([])
})

test('publicação é manual e usa a versão e os três hashes da mesma preparação, sem ator do cliente', async () => {
  const container = await mount()
  await pause(container)
  await click(container, 'Comparar com a versão no ar')
  await reason(container)
  await click(container, 'Preparar publicação')
  expect(writes()).toHaveLength(1)
  expect(writes()[0]?.body).toEqual({
    expectedVersion: 1,
    policy: { ...initialKidsJourneyPolicy(), mode: 'paused' },
    reason: 'Teste pedagógico',
  })
  expect(replaced.at(-1)).toBe(`/admin/professor/jornada-kids?preparacao=${id}`)
  expect(button(container, 'Publicar versão 2').disabled).toBe(true)
  await click(container, 'Conferir o próximo grupo de perfis')
  expect(writes()).toHaveLength(2)
  expect(container.textContent).toContain('12 perfis conferidos')
  expect(
    container.querySelector('ol[aria-label="Passos para publicar"] [aria-current="step"]')
      ?.textContent,
  ).toContain('Publicar')
  // O ID da preparação fica nos detalhes técnicos, fora da linha principal.
  expect(container.querySelector('details')?.textContent).toContain(id)
  await click(container, 'Publicar versão 2')
  expect(writes()[2]?.body).toEqual({
    expectedVersion: 1,
    draftHash: 'a'.repeat(64),
    catalogHash: 'b'.repeat(64),
    cohortHash: 'c'.repeat(64),
  })
  expect(container.textContent).toContain('Versão 2 publicada')
  expect(record.policy.mode).toBe('paused')
})

test('retomar preparação carrega candidato e motivo, só compara e espera o botão de próximo lote', async () => {
  preparation = prepared({ ...record.policy, mode: 'paused' })
  const container = await mount(id)
  expect(container.textContent).toContain('Preparação em andamento')
  expect((container.querySelector('textarea') as HTMLTextAreaElement).value).toBe(
    'Teste pedagógico',
  )
  expect(
    (container.querySelector('select[aria-label="Progressão"]') as HTMLSelectElement).disabled,
  ).toBe(true)
  expect(calls.filter((call) => call.path.endsWith('/preview'))).toHaveLength(1)
  expect(writes()).toEqual([])
  await click(container, 'Conferir o próximo grupo de perfis')
  expect(writes()).toHaveLength(1)
})

test('inicializando ou falha não fornece rascunho editável nem publica seed pelo navegador', async () => {
  record = { ...record, phase: 'initializing', version: 0 }
  const container = await mount()
  expect(container.textContent).toContain('Jornada em preparação inicial')
  expect(container.querySelector('nav[aria-label="Postos"]')).toBeNull()
  expect(writes()).toEqual([])
  failure = { suffix: '/kids', status: 503, message: 'Política indisponível' }
  await click(container, 'Atualizar')
  expect(container.textContent).toContain('Política indisponível')
  expect(writes()).toEqual([])
})

test('equipe somente leitura examina e compara; não recebe botão de concessão nem escrita', async () => {
  record.permissions.canEdit = false
  const container = await mount()
  expect(container.textContent).toContain('Só leitura')
  expect(
    (container.querySelector('select[aria-label="Progressão"]') as HTMLSelectElement).disabled,
  ).toBe(true)
  await click(container, 'Comparar com a versão no ar')
  expect(button(container, 'Preparar publicação').disabled).toBe(true)
  expect(writes()).toEqual([])
})

test('catálogo indisponível bloqueia preparação; conflito preserva candidato e não repete escrita', async () => {
  const container = await mount()
  await pause(container)
  rejectReadiness = true
  await click(container, 'Comparar com a versão no ar')
  await reason(container)
  expect(button(container, 'Preparar publicação').disabled).toBe(true)
  rejectReadiness = false
  await click(container, 'Comparar com a versão no ar')
  failure = { suffix: '/preparations', status: 409, message: 'A versão publicada mudou.' }
  await click(container, 'Preparar publicação')
  expect(container.textContent).toContain('A versão publicada mudou.')
  expect(
    (container.querySelector('select[aria-label="Progressão"]') as HTMLSelectElement).value,
  ).toBe('paused')
  expect(writes()).toHaveLength(1)
  expect(button(container, 'Preparar publicação').disabled).toBe(true)
})

test('busy de publicação mantém preparação pronta, sem retry ou publicação fictícia', async () => {
  preparation = {
    ...prepared({ ...record.policy, mode: 'paused' }),
    status: 'ready',
    cohortHash: 'c'.repeat(64),
  }
  const container = await mount(id)
  failure = {
    suffix: '/publish',
    status: 503,
    message: 'A autoria está atualizando o catálogo. Tente novamente.',
  }
  await click(container, 'Publicar versão 2')
  expect(container.textContent).toContain('A autoria está atualizando o catálogo.')
  expect(container.textContent).not.toContain('Versão 2 publicada')
  expect(writes()).toHaveLength(1)
  expect(record.version).toBe(1)
  expect(button(container, 'Publicar versão 2').disabled).toBe(false)
})

test('resposta antiga da plataforma não repovoa a tela adulta', async () => {
  let resolve: (value: Response) => void = () => {
    throw new Error('espera não iniciada')
  }
  const pending = new Promise<Response>((done) => {
    resolve = done
  })
  deferPolicy = () => pending
  const container = await mount()
  await act(async () => setPlatform('adult'))
  await act(async () => resolve(Response.json(record)))
  // A lente Adultos leva à jornada de lá: a resposta atrasada não repovoa nada no caminho.
  expect(replaced).toContain('/admin/professor/jornada-adulta')
  expect(container.textContent).toContain('Abrindo a jornada da Comunidade Sistema Zero')
  expect(container.querySelector('nav[aria-label="Postos"]')).toBeNull()
  expect(writes()).toEqual([])
})

test('trocar a lente leva a preparação aberta junto, para voltar e retomar', async () => {
  const happyDOM = (window as unknown as { happyDOM: { setURL(url: string): void } }).happyDOM
  const before = window.location.href
  happyDOM.setURL(`http://localhost/admin/professor/jornada-kids?preparacao=${id}`)
  try {
    await mount(id)
    await act(async () => setPlatform('adult'))
    expect(replaced).toContain(`/admin/professor/jornada-adulta?preparacao=${id}`)
  } finally {
    happyDOM.setURL(before)
  }
})

test('refetch malformado mantém a consulta anterior mas bloqueia qualquer nova preparação', async () => {
  const container = await mount()
  await pause(container)
  await click(container, 'Comparar com a versão no ar')
  await reason(container)
  expect(button(container, 'Preparar publicação').disabled).toBe(false)
  malformedPolicy = true
  await click(container, 'Atualizar')
  expect(container.textContent).toContain('Não foi possível conferir a resposta da jornada')
  expect(
    (container.querySelector('select[aria-label="Progressão"]') as HTMLSelectElement).value,
  ).toBe('paused')
  expect(button(container, 'Comparar com a versão no ar').disabled).toBe(true)
  expect(button(container, 'Preparar publicação').disabled).toBe(true)
  expect(writes()).toEqual([])
})

test('nova edição invalida a comparação e resposta de outra versão nunca prepara publicação', async () => {
  const container = await mount()
  await pause(container)
  await click(container, 'Comparar com a versão no ar')
  await reason(container)
  expect(button(container, 'Preparar publicação').disabled).toBe(false)
  const select = container.querySelector('select[aria-label="Progressão"]') as HTMLSelectElement
  await act(async () => {
    select.value = 'active'
    select.dispatchEvent(new Event('change', { bubbles: true }))
  })
  expect(button(container, 'Preparar publicação').disabled).toBe(true)
  await pause(container)
  invalidPreview = true
  await click(container, 'Comparar com a versão no ar')
  expect(container.textContent).toContain('A comparação pertence a outra versão')
  expect(button(container, 'Preparar publicação').disabled).toBe(true)
  expect(writes()).toEqual([])
})

test('ready sem hash da coorte não publica e endereço inválido não procura outro perfil', async () => {
  preparation = {
    ...prepared({ ...record.policy, mode: 'paused' }),
    status: 'ready',
    cohortHash: null,
  }
  const container = await mount(id)
  expect(button(container, 'Publicar versão 2').disabled).toBe(true)
  expect(writes()).toEqual([])
  const invalid = await mount(['invalid', id])
  expect(invalid.textContent).toContain('Não foi possível conferir a resposta da jornada')
  expect(invalid.querySelector('nav[aria-label="Postos"]')).toBeNull()
  expect(calls.filter((call) => call.path.includes('/preparations/'))).toHaveLength(1)
})

test('falha ao paginar histórico fica local, preserva edição e não bloqueia o rascunho', async () => {
  record.version = 26
  historyRows = Array.from({ length: 25 }, (_, index) => ({
    phase: 'published',
    version: 26 - index,
    previousVersion: 25 - index,
    policy: record.policy,
    preparationId: id,
    actorKind: 'user',
    actorId,
    reason: `Motivo ${26 - index}`,
    updatedAt: '2026-10-19T12:00:00.000Z',
  }))
  const container = await mount()
  expect(container.textContent).toContain('Motivo 2')
  // Sem nome no histórico: "Alguém da equipe", e o ID só nos detalhes.
  expect(container.textContent).toContain('Alguém da equipe')
  expect(container.textContent).not.toContain('Conta da equipe')
  failure = {
    suffix: '/history?beforeVersion=2&limit=25',
    status: 503,
    message: 'Histórico sem resposta',
  }
  await click(container, 'Ver versões anteriores')
  expect(container.textContent).toContain('Histórico indisponível: Histórico sem resposta')
  expect(container.textContent).toContain('Motivo 26')
  expect(
    (container.querySelector('select[aria-label="Progressão"]') as HTMLSelectElement).disabled,
  ).toBe(false)
  expect(button(container, 'Comparar com a versão no ar').disabled).toBe(false)
})

async function closeAll() {
  for (const cleanup of close.splice(0)) await cleanup()
}
const progression = (container: HTMLElement) =>
  (container.querySelector('select[aria-label="Progressão"]') as HTMLSelectElement).value

test('trocar a lente com rascunho mudado guarda na aba e devolve ao voltar para Kids', async () => {
  const container = await mount()
  await pause(container)
  await reason(container)
  await act(async () => setPlatform('adult'))
  expect(replaced).toContain('/admin/professor/jornada-adulta')
  await closeAll()

  setPlatform('kids')
  const again = await mount()
  expect(progression(again)).toBe('paused')
  expect((again.querySelector('textarea') as HTMLTextAreaElement).value).toBe('Teste pedagógico')
  expect(again.textContent).toContain('O rascunho que estava aberto antes da troca de comunidade')
  expect(writes()).toEqual([])

  // Volta uma vez só: montar de novo começa da versão no ar.
  await closeAll()
  const third = await mount()
  expect(progression(third)).toBe('active')
})

test('rascunho guardado não volta por cima de outra versão, e a tela avisa', async () => {
  const container = await mount()
  await pause(container)
  await act(async () => setPlatform('adult'))
  await closeAll()

  record = { ...record, version: 2 }
  setPlatform('kids')
  const again = await mount()
  expect(progression(again)).toBe('active')
  expect(again.textContent).toContain(
    'A versão no ar mudou enquanto você estava na outra comunidade',
  )
  expect(writes()).toEqual([])
})

test('sem mudança, trocar a lente não guarda nada', async () => {
  await mount()
  await act(async () => setPlatform('adult'))
  expect(replaced).toContain('/admin/professor/jornada-adulta')
  expect(window.sessionStorage.length).toBe(0)
})
