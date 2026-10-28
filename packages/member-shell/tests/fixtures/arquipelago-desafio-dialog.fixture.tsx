import { afterEach, expect, mock, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import type { DesafioAberto } from '@sistemazero/arquipelago-contracts'

GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
const { act, useImperativeHandle } = await import('react')
const { createRoot } = await import('react-dom/client')

const ID = '22222222-2222-4222-8222-222222222222'
let rascunhos: Record<string, unknown> = {}
let falhaAoLer = false
let falhaAoGuardar = false
let saves = 0
let projetoAtual: Record<string, unknown> = {}
let abertoCom: unknown
let mudou: ((projeto: { updatedAt?: number }) => void) | undefined
mock.module('@sistemazero/studio', () => ({
  createLocalPersistenceAdapter: () => ({
    load: async (id: string) => {
      if (falhaAoLer) throw new Error('IndexedDB')
      return rascunhos[id] ?? null
    },
  }),
  StudioLesson: ({
    ref,
    initialProject,
    onChange,
  }: {
    ref: { current: unknown }
    initialProject: Record<string, unknown>
    onChange: (projeto: { updatedAt?: number }) => void
  }) => {
    abertoCom = initialProject
    mudou = onChange
    useImperativeHandle(ref, () => ({
      getProject: () => projetoAtual,
      async save() {
        saves++
        if (falhaAoGuardar) throw new Error('cota')
      },
    }))
    return <div>Editor do desafio</div>
  },
}))
// O rascunho guardado volta como está (a compatibilidade da revisão atual é das aulas).
mock.module('../../src/lib/studio-lesson-seed', () => ({
  resolveStudioLessonSeed: async (s: {
    local(): Promise<unknown>
    carryover?(): Promise<unknown>
    initial: unknown
  }) => (await s.local()) ?? (await s.carryover?.()) ?? s.initial,
}))

type Resposta = { status: number; body: unknown }
let respostas: Resposta[] = []
const pedidos: { url: string; method: string; body: unknown }[] = []
globalThis.fetch = (async (url: string, init?: RequestInit) => {
  pedidos.push({
    url: String(url),
    method: init?.method ?? 'GET',
    body: init?.body ? JSON.parse(String(init.body)) : undefined,
  })
  const r = respostas.shift() ?? { status: 500, body: null }
  return Response.json(r.body, { status: r.status })
}) as unknown as typeof fetch

const { ArquipelagoDesafioDialog, TEXTOS_DO_DESAFIO, idDoRascunhoDoDesafio } = await import(
  '../../src/components/arquipelago-desafio-dialog'
)

const desafio: DesafioAberto = {
  id: ID,
  revisao: 3,
  titulo: 'A ponte do bosque',
  enunciado: 'Faça o Lumi atravessar a ponte.',
  dicas: ['Use o bloco repetir.'],
  desafioExtra: { titulo: 'Mais rápido', texto: 'Atravesse em menos passos.' },
  objetivos: [
    { id: 'o1', label: 'O Lumi chega ao outro lado', kind: 'game' },
    { id: 'x1', label: 'Em até 5 passos', kind: 'block', optional: true },
  ],
  projetoInicial: { mode: 'blocks', files: [] },
  ultimosResultados: [],
  concluido: false,
}

let cleanup: (() => Promise<void>) | undefined
afterEach(async () => {
  await cleanup?.()
  cleanup = undefined
  rascunhos = {}
  falhaAoLer = false
  falhaAoGuardar = false
  saves = 0
  projetoAtual = { updatedAt: 10 }
  respostas = []
  pedidos.length = 0
})

async function abrir(d: DesafioAberto = desafio) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const finished: boolean[] = []
  await act(async () =>
    root.render(
      <ArquipelagoDesafioDialog desafio={d} viewerId="p1" onFinish={(c) => finished.push(c)} />,
    ),
  )
  // O módulo do Estúdio e o rascunho chegam depois do primeiro desenho.
  await act(async () => await new Promise((r) => setTimeout(r, 0)))
  cleanup = async () => {
    await act(async () => root.unmount())
    container.remove()
  }
  const botao = (rotulo: string) =>
    [...container.querySelectorAll('button')].find(
      (b) => b.textContent?.includes(rotulo) || b.getAttribute('aria-label') === rotulo,
    )
  async function clicar(rotulo: string) {
    const b = botao(rotulo)
    if (!b) throw new Error(`Botão ausente: ${rotulo}`)
    await act(async () => b.click())
    // A resposta (o corpo em JSON) leva alguns giros até virar estado.
    for (let i = 0; i < 10; i++) await act(async () => await new Promise((r) => setTimeout(r, 0)))
  }
  // O aviso da conferência (a região viva com texto).
  const status = () =>
    [...container.querySelectorAll('[role="status"]')].map((e) => e.textContent).find(Boolean) ?? ''
  return { container, finished, clicar, botao, status }
}

test('abre o desafio com o projeto inicial no id do rascunho deste perfil', async () => {
  const ui = await abrir()
  expect(ui.container.textContent).toContain('A ponte do bosque')
  expect(ui.container.textContent).toContain('Faça o Lumi atravessar a ponte.')
  expect(ui.container.textContent).toContain('Editor do desafio')
  expect(abertoCom).toEqual({ mode: 'blocks', files: [], id: idDoRascunhoDoDesafio(ID, 3, 'p1') })
  expect(idDoRascunhoDoDesafio(ID, 3, 'p1')).toMatch(/^[A-Za-z0-9_-]+$/)
  // Sem conferir, ainda não há "Concluir".
  expect(ui.botao(TEXTOS_DO_DESAFIO.concluir)).toBeUndefined()
})

test('o rascunho deste navegador vence o projeto inicial', async () => {
  rascunhos[idDoRascunhoDoDesafio(ID, 3, 'p1')] = { mode: 'blocks', files: ['meu'] }
  await abrir()
  expect(abertoCom).toEqual({ mode: 'blocks', files: ['meu'] })
})

test('a equipe publicou de novo: o rascunho da revisão anterior vem junto, se ainda combina', async () => {
  rascunhos[idDoRascunhoDoDesafio(ID, 1, 'p1')] = { mode: 'blocks', files: ['de antes'] }
  rascunhos[idDoRascunhoDoDesafio(ID, 2, 'p1')] = { programmingLanguage: 'python' }
  await abrir()
  // A revisão 2 é de outra linguagem e fica de fora; a 1 vem com o id da revisão atual.
  expect(abertoCom).toEqual({
    mode: 'blocks',
    files: ['de antes'],
    id: idDoRascunhoDoDesafio(ID, 3, 'p1'),
  })
})

test('ler o rascunho falhou: não abre o inicial por cima, oferece tentar de novo', async () => {
  falhaAoLer = true
  const ui = await abrir()
  expect(ui.container.textContent).toContain(TEXTOS_DO_DESAFIO.naoAbriu)
  expect(ui.container.textContent).not.toContain('Editor do desafio')
  falhaAoLer = false
  await ui.clicar(TEXTOS_DO_DESAFIO.tentarDeNovo)
  expect(ui.container.textContent).toContain('Editor do desafio')
})

test('conferir manda a revisão e o projeto salvo; passou, Concluir devolve cumprido', async () => {
  projetoAtual = { mode: 'blocks', updatedAt: 50 }
  respostas = [
    {
      status: 200,
      body: {
        passou: true,
        resultados: [
          { id: 'o1', passou: true },
          { id: 'x1', passou: false },
        ],
        concluidoAgora: true,
        extraAgora: false,
      },
    },
  ]
  const ui = await abrir()
  await ui.clicar(TEXTOS_DO_DESAFIO.conferir)
  expect(saves).toBe(1)
  expect(pedidos).toEqual([
    {
      url: `/api/arquipelago/desafios/${ID}/verificar`,
      method: 'POST',
      body: { revisao: 3, projeto: { mode: 'blocks', updatedAt: 50 } },
    },
  ])
  expect(ui.status()).toBe(TEXTOS_DO_DESAFIO.cumpridoComExtra)
  expect(ui.container.textContent).toContain('1 de 1 cumpridos')
  await ui.clicar(TEXTOS_DO_DESAFIO.concluir)
  expect(ui.finished).toEqual([true])
  expect(saves).toBe(2)
})

test('editar depois de conferir avisa que o resultado é de antes', async () => {
  projetoAtual = { updatedAt: 50 }
  respostas = [
    {
      status: 200,
      body: {
        passou: false,
        resultados: [{ id: 'o1', passou: false }],
        concluidoAgora: false,
        extraAgora: false,
      },
    },
  ]
  const ui = await abrir()
  await ui.clicar(TEXTOS_DO_DESAFIO.conferir)
  expect(ui.status()).toBe(TEXTOS_DO_DESAFIO.faltou)
  expect(ui.container.textContent).not.toContain(TEXTOS_DO_DESAFIO.mudou)
  await act(async () => mudou?.({ updatedAt: 60 }))
  expect(ui.container.textContent).toContain(TEXTOS_DO_DESAFIO.mudou)
})

test('voltar sem cumprir guarda o rascunho e devolve cancelado', async () => {
  const ui = await abrir()
  await ui.clicar(TEXTOS_DO_DESAFIO.voltar)
  expect(saves).toBe(1)
  expect(ui.finished).toEqual([false])
})

test('Esc fecha como voltar ao jogo', async () => {
  const ui = await abrir()
  const camada = ui.container.querySelector('[role="dialog"]') as HTMLElement
  expect(camada.getAttribute('aria-modal')).toBe('true')
  // Uma camada comum: os menus dos blocos, no body, ficam por cima (um modal nativo os cobriria).
  expect(ui.container.querySelector('dialog')).toBeNull()
  await act(async () => {
    camada.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    )
  })
  await act(async () => await new Promise((r) => setTimeout(r, 0)))
  expect(ui.finished).toEqual([false])
})

test('guardar falhou ao sair: avisa e deixa sair sem guardar', async () => {
  falhaAoGuardar = true
  const ui = await abrir()
  await ui.clicar(TEXTOS_DO_DESAFIO.voltar)
  expect(ui.finished).toEqual([])
  expect(ui.status()).toBe(TEXTOS_DO_DESAFIO.naoGuardou)
  await ui.clicar(TEXTOS_DO_DESAFIO.sairSemGuardar)
  expect(ui.finished).toEqual([false])
})

test('projeto acima do teto do contrato nem sai da tela', async () => {
  projetoAtual = { updatedAt: 1, grande: 'x'.repeat(1_500_001) }
  const ui = await abrir()
  await ui.clicar(TEXTOS_DO_DESAFIO.conferir)
  expect(pedidos).toEqual([])
  expect(ui.status()).toBe(TEXTOS_DO_DESAFIO.grandeDemais)
})

test('o serviço recusa: a frase diz o que fazer e nada fecha', async () => {
  respostas = [
    { status: 409, body: { error: { code: 'DESAFIO_MUDOU', message: 'x' } } },
    { status: 413, body: null },
    { status: 429, body: { error: { code: 'CONFERENCIA_OCUPADA', message: 'x' } } },
    { status: 424, body: { error: { code: 'CONFERENCIA_INDISPONIVEL', message: 'x' } } },
    { status: 403, body: { error: { code: 'ACESSO_BLOQUEADO', message: 'x' } } },
    { status: 409, body: { error: { code: 'SESSION_CHANGED', message: 'x' } } },
  ]
  const ui = await abrir()
  for (const frase of [
    TEXTOS_DO_DESAFIO.desafioMudou,
    TEXTOS_DO_DESAFIO.grandeDemais,
    TEXTOS_DO_DESAFIO.ocupado,
    TEXTOS_DO_DESAFIO.erro,
    TEXTOS_DO_DESAFIO.semAcesso,
    TEXTOS_DO_DESAFIO.sessaoMudou,
  ]) {
    await ui.clicar(TEXTOS_DO_DESAFIO.conferir)
    expect(ui.status()).toBe(frase)
  }
  expect(ui.finished).toEqual([])
})

test('o apertar das teclas do editor não chega ao jogo; o soltar chega', async () => {
  const ui = await abrir()
  const ouvidas: string[] = []
  const ouvir = (e: KeyboardEvent) => ouvidas.push(`${e.type}:${e.code}`)
  window.addEventListener('keydown', ouvir)
  window.addEventListener('keyup', ouvir)
  try {
    const dentro = ui.container.querySelector('[role="dialog"] button') as HTMLElement
    await act(async () => {
      dentro.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }))
      dentro.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }))
    })
    // Uma tecla segurada ao abrir é solta no jogo: ele não fica andando sozinho.
    expect(ouvidas).toEqual(['keyup:KeyW'])
  } finally {
    window.removeEventListener('keydown', ouvir)
    window.removeEventListener('keyup', ouvir)
  }
})

test('com o resultado guardado, a primeira edição já o deixa de antes', async () => {
  const d = { ...desafio, ultimosResultados: [{ id: 'o1', passou: true }] }
  const ui = await abrir(d)
  expect(ui.container.textContent).toContain('1 de 1 cumpridos')
  expect(ui.container.textContent).not.toContain(TEXTOS_DO_DESAFIO.mudou)
  await act(async () => mudou?.({ updatedAt: Date.now() + 1000 }))
  expect(ui.container.textContent).toContain(TEXTOS_DO_DESAFIO.mudou)
})

test('o texto da tela segue as regras da casa', () => {
  const textos = Object.values(TEXTOS_DO_DESAFIO).map((t) =>
    typeof t === 'function' ? t(1, 2) : t,
  )
  for (const t of textos) {
    expect(t).not.toContain('!')
    expect(t).not.toContain('—')
    expect(t).not.toContain('…')
    expect(t.trim().startsWith('Por que')).toBe(false)
  }
})
