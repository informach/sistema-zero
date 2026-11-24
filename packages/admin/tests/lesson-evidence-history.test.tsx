// O histórico de evidências da aula, que a equipe lê na ficha da criança: cada versão enviada do
// projeto do Estúdio é uma linha própria, com o projeto inteiro para baixar, também nas páginas
// antigas (decisão de 22/11/2026: provar que nenhum envio some do histórico).
import { afterAll, beforeEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { LessonEvidence, LessonEvidencePage } from '@sistemazero/core/learning'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { LessonEvidenceHistory } = await import(
  '../src/components/professor/lesson-evidence-history'
)

const LESSON = '7a1b2c3d-0000-4000-8000-000000000001'
const CHILD = '7a1b2c3d-0000-4000-8000-000000000002'
const ACCOUNT = '7a1b2c3d-0000-4000-8000-000000000003'
const BLOCK = '7a1b2c3d-0000-4000-8000-000000000004'

function envio(id: string, createdAt: string, script: string): LessonEvidence {
  return {
    id,
    kind: 'studio',
    blockId: BLOCK,
    sectionId: null,
    revision: 'r1',
    createdAt,
    payload: { project: { files: { 'script.js': script } }, definition: { kind: 'studio' } },
  }
}

const terceiro = envio('ev-3', '2026-11-22T12:00:00.000Z', 'versao 3')
const segundo = envio('ev-2', '2026-11-21T12:00:00.000Z', 'versao 2')
const primeiro = envio('ev-1', '2026-11-20T12:00:00.000Z', 'versao 1')

const realFetch = globalThis.fetch
const pedidos: string[] = []
afterAll(() => {
  globalThis.fetch = realFetch
})
beforeEach(() => {
  pedidos.length = 0
  document.body.innerHTML = ''
})

async function montar(initial: LessonEvidencePage) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => {
    root.render(
      <LessonEvidenceHistory
        initial={initial}
        lessonId={LESSON}
        userId={CHILD}
        accountId={ACCOUNT}
      />,
    )
  })
  return { host, root }
}

const linhas = (host: HTMLElement) =>
  [...host.querySelectorAll('summary')].map((summary) => summary.textContent ?? '')
const projetos = (host: HTMLElement) =>
  [...host.querySelectorAll('a')]
    .filter((link) => link.textContent === 'Baixar projeto e avaliação completos')
    .map((link) => link.getAttribute('href') ?? '')
const quando = (iso: string) => new Date(iso).toLocaleString('pt-BR')

test('cada envio é uma linha com o próprio projeto, também depois de pedir os anteriores', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    pedidos.push(String(input))
    // A página antiga repete o segundo envio (o cursor pode cair no meio de um mesmo instante).
    const pagina: LessonEvidencePage = { items: [segundo, primeiro], nextCursor: null }
    return new Response(JSON.stringify(pagina), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch

  const { host, root } = await montar({ items: [terceiro, segundo], nextCursor: 'ev-2' })
  expect(linhas(host)).toEqual([
    `Envio · ${quando(terceiro.createdAt)}`,
    `Envio · ${quando(segundo.createdAt)}`,
  ])

  const anteriores = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'Ver registros anteriores',
  )
  if (!anteriores) throw new Error('Sem o botão dos registros anteriores')
  await act(async () => {
    anteriores.click()
  })

  // Pede a página seguinte da MESMA criança, da MESMA conta e da MESMA aula.
  expect(pedidos).toHaveLength(1)
  const pedido = new URL(pedidos[0] ?? '', 'http://admin.local')
  expect(pedido.pathname).toBe(`/api/members/lessons/${LESSON}/learning-evidence`)
  expect(pedido.searchParams.get('userId')).toBe(CHILD)
  expect(pedido.searchParams.get('accountId')).toBe(ACCOUNT)
  expect(pedido.searchParams.get('beforeId')).toBe('ev-2')

  // As três versões, uma vez cada, da mais nova para a mais antiga.
  expect(linhas(host)).toEqual([
    `Envio · ${quando(terceiro.createdAt)}`,
    `Envio · ${quando(segundo.createdAt)}`,
    `Envio · ${quando(primeiro.createdAt)}`,
  ])
  // Cada uma baixa o SEU projeto inteiro (o JSON do resumo também mostra o código de cada versão).
  expect(projetos(host)).toEqual(
    ['ev-3', 'ev-2', 'ev-1'].map(
      (id) =>
        `/api/members/lessons/${LESSON}/learning-evidence/${id}?${new URLSearchParams({ userId: CHILD, accountId: ACCOUNT })}`,
    ),
  )
  const codigo = [...host.querySelectorAll('pre')].map((pre) => pre.textContent ?? '')
  expect(codigo[0]).toContain('versao 3')
  expect(codigo[1]).toContain('versao 2')
  expect(codigo[2]).toContain('versao 1')
  // Sem mais páginas, o botão some.
  expect(host.textContent).not.toContain('Ver registros anteriores')
  await act(async () => root.unmount())
})

test('a página anterior que falha avisa e mantém o que já estava na tela', async () => {
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    pedidos.push(String(input))
    return new Response(JSON.stringify({ error: { code: 'X', message: 'fora' } }), { status: 502 })
  }) as typeof fetch
  const { host, root } = await montar({ items: [terceiro], nextCursor: 'ev-3' })
  const anteriores = [...host.querySelectorAll('button')].find(
    (button) => button.textContent === 'Ver registros anteriores',
  )
  if (!anteriores) throw new Error('Sem o botão dos registros anteriores')
  await act(async () => {
    anteriores.click()
  })
  expect(host.querySelector('[role="alert"]')?.textContent).toBe(
    'Não conseguimos carregar os registros anteriores. Tente de novo.',
  )
  expect(linhas(host)).toEqual([`Envio · ${quando(terceiro.createdAt)}`])
  // Dá para tentar de novo.
  expect(host.textContent).toContain('Ver registros anteriores')
  await act(async () => root.unmount())
})
