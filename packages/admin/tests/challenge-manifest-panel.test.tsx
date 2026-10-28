import { afterEach, beforeEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'

if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

const { act } = await import('react')
const { createRoot } = await import('react-dom/client')
const { ChallengeManifestPanel } = await import('../src/app/admin/jogo/challenge-manifest-panel')

const projeto = { files: { 'index.html': '', 'style.css': '', 'script.js': '' } }
const item = (slug: string, quadro: number) => ({
  slug,
  publico: 'kids',
  ilha: 'bosque',
  tipo: 'quadro-das-cores',
  quadro,
  ordem: 0,
  publicar: true,
  conteudo: {
    versao: 1,
    titulo: `Desafio ${slug}`,
    enunciado: 'Faça o bicho chegar.',
    dicas: [],
    projetoInicial: projeto,
    gabarito: projeto,
    objetivos: [{ id: 'o1', label: 'Chega', rule: { type: 'usesBlock', block: 'x' } }],
    recompensa: { cor: true, moedas: 20, moedasExtra: 0 },
    blocosManuais: { acrescentar: [], retirar: [] },
  },
})
const manifesto = {
  formato: 'arquipelago-desafios',
  versao: 1,
  escopo: 'ilha',
  desafios: [item('corrida', 1), item('pedras', 2)],
}
const antigoId = '22222222-2222-4222-8222-222222222222'
const conferencia = {
  impressao: 'abc',
  itens: manifesto.desafios.map((d, i) => ({
    slug: d.slug,
    titulo: d.conteudo.titulo,
    publico: 'kids',
    ilha: 'bosque',
    tipo: 'quadro-das-cores',
    quadro: d.quadro,
    acao: i === 0 ? 'criar' : 'conflito',
    id: null,
    conflito: i === 0 ? null : { codigo: 'QUADRO_OCUPADO', mensagem: 'O quadro 2 já é de outro.' },
    analise: null,
    publica: i === 0,
  })),
  contagem: { criar: 1, atualizar: 0, igual: 0, conflito: 1, comProblema: 0, publica: 1 },
}
const resumo = (slug: string, id: string) => ({
  id,
  slug,
  publico: 'kids',
  ilha: 'bosque',
  tipo: 'desafio-do-dia',
  quadro: null,
  ordem: 0,
  titulo: `Antigo ${slug}`,
  situacao: 'publicado',
  revisao: 4,
  revisaoPublicada: 4,
  alteradoDepoisDePublicar: false,
  atualizadoEm: new Date().toISOString(),
})

let calls: { url: string; method: string; body: unknown }[]
let aplicarStatus = 200
let container: HTMLDivElement
let root: ReturnType<typeof createRoot>
let applied: string[][]
const originalFetch = globalThis.fetch
const originalConfirm = window.confirm

beforeEach(() => {
  calls = []
  applied = []
  aplicarStatus = 200
  window.confirm = () => true
  globalThis.fetch = (async (input: string, init?: RequestInit) => {
    const url = String(input)
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ url, method: init?.method ?? 'GET', body })
    const json = (status: number, data: unknown) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'content-type': 'application/json' },
      })
    if (url.endsWith('/manifestos/conferir')) return json(200, conferencia)
    if (url.endsWith('/manifestos/aplicar'))
      return aplicarStatus === 200
        ? json(200, {
            itens: [
              {
                slug: 'corrida',
                id: antigoId.replace('2222', '3333'),
                acao: 'criar',
                publicado: true,
                problemas: [],
              },
              {
                slug: 'pedras',
                id: null,
                acao: 'conflito',
                publicado: false,
                problemas: [{ codigo: 'QUADRO_OCUPADO', mensagem: 'O quadro 2 já é de outro.' }],
              },
            ],
          })
        : json(409, {
            error: { code: 'MANIFESTO_DESATUALIZADO', message: 'Algum desafio mudou.' },
          })
    if (url.includes('/desafios?')) return json(200, { desafios: [resumo('antigo', antigoId)] })
    if (url.endsWith(`/desafios/${antigoId}/arquivar`))
      return json(200, {
        resumo: { ...resumo('antigo', antigoId), situacao: 'arquivado', revisao: 5 },
        metadados: {
          slug: 'antigo',
          publico: 'kids',
          ilha: 'bosque',
          tipo: 'desafio-do-dia',
          quadro: null,
          ordem: 0,
        },
        conteudo: item('antigo', 1).conteudo,
        blocosPublicados: [],
      })
    return json(404, { error: { message: 'não esperado' } })
  }) as typeof fetch
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  globalThis.fetch = originalFetch
  window.confirm = originalConfirm
})

async function render(canWrite: boolean) {
  await act(async () => {
    root.render(
      <ChallengeManifestPanel
        publico="kids"
        island="bosque"
        canWrite={canWrite}
        disabled={false}
        onApplied={(slugs) => applied.push(slugs)}
      />,
    )
  })
}
async function paste(text: string) {
  await act(async () => {
    const area = container.querySelector<HTMLTextAreaElement>(
      'textarea[aria-label="Conteúdo do manifesto"]',
    )
    if (!area) throw new Error('sem área')
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set?.call(area, text)
    area.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
const button = (label: string) =>
  [...container.querySelectorAll('button')].find((b) => b.textContent?.trim() === label)
async function click(label: string) {
  const b = button(label)
  if (!b) throw new Error(`sem botão ${label}`)
  await act(async () => {
    b.click()
  })
  // As chamadas encadeadas terminam em microtarefas: deixa a fila esvaziar.
  for (let i = 0; i < 20; i++) await act(async () => {})
}

test('arquivo inválido mostra o erro e não chama o serviço', async () => {
  await render(true)
  await paste('{"formato": "arquipelago-desafios", "versao": 1, "desafios": []}')
  await click('Conferir')
  expect(container.querySelector('[role="alert"]')?.textContent).toContain('No arquivo')
  expect(calls).toHaveLength(0)
})

test('conferir mostra a prévia e o ausente; aplicar grava, arquiva o marcado e avisa a lista', async () => {
  await render(true)
  await paste(JSON.stringify(manifesto))
  await click('Conferir')
  expect(calls.map((c) => c.url)).toEqual([
    '/api/arquipelago/manifestos/conferir',
    '/api/arquipelago/desafios?publico=kids&ilha=bosque',
  ])
  const text = container.textContent ?? ''
  expect(text).toContain('Novos: 1')
  expect(text).toContain('Não dá para gravar: 1')
  expect(text).toContain('O quadro 2 já é de outro.')
  expect(text).toContain('Antigo antigo (antigo)')
  await act(async () => {
    container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click()
  })
  await click('Aplicar')
  expect(calls.slice(2).map((c) => [c.url, c.body])).toEqual([
    ['/api/arquipelago/manifestos/aplicar', { manifesto, impressao: 'abc' }],
    [`/api/arquipelago/desafios/${antigoId}/arquivar`, { revisaoBase: 4 }],
  ])
  const depois = container.textContent ?? ''
  expect(depois).toContain('Manifesto aplicado')
  expect(depois).toContain('corrida: criado e publicado.')
  expect(depois).toContain('pedras: não gravou.')
  expect(depois).toContain('Antigo antigo: arquivado.')
  expect(applied).toEqual([['corrida']])
})

test('quem não administra confere, mas não vê Aplicar nem o arquivar', async () => {
  await render(false)
  await paste(JSON.stringify(manifesto))
  await click('Conferir')
  expect(button('Aplicar')).toBeUndefined()
  expect(container.querySelector('input[type="checkbox"]')).toBeNull()
  expect(container.textContent).toContain('Só a administração aplica o manifesto.')
})

test('mudou depois da conferência: para, não arquiva e pede para conferir de novo', async () => {
  aplicarStatus = 409
  await render(true)
  await paste(JSON.stringify(manifesto))
  await click('Conferir')
  await act(async () => {
    container.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click()
  })
  await click('Aplicar')
  expect(calls.filter((c) => c.url.endsWith('/arquivar'))).toHaveLength(0)
  expect(container.textContent).toContain('O manifesto parou no meio')
  expect(container.textContent).toContain('Confira de novo')
})
