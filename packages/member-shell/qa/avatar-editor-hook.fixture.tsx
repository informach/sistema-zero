import { afterEach, beforeEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { AVATAR_CATALOG as C, drawAvatar, equipPart } from '@sistemazero/core/avatar'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import {
  type AvatarEditor,
  useAvatarEditor,
} from '../src/components/cosmetics/avatar3d/use-avatar-editor'
import { AVATAR_MESSAGES } from '../src/components/cosmetics/skin'
import { type AvatarShopItem, avatarTab, isAvatarItemOwned } from '../src/lib/avatar-pack'

/**
 * O salvar sozinho do "Meu avatar" (`useAvatarEditor`) num navegador de mentira: o servidor é um
 * `fetch` falso que anota cada chamada.
 */
if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

interface Chamada {
  method: string
  path: string
  body: unknown
  keepalive: boolean
}
let chamadas: Chamada[] = []
let estado: Record<string, unknown>
let putFalha = false
const fetchOriginal = globalThis.fetch

beforeEach(() => {
  chamadas = []
  putFalha = false
  estado = {
    style: 'cute-v1',
    equipped: drawAvatar(C, 'hook', { filter: 'boy' }),
    filter: 'boy',
    customized: false,
    owned: [],
    photoUrl: 'https://cdn.exemplo/foto.webp',
    balance: 500,
  }
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body ? 'form' : null
    chamadas.push({ method, path: url.pathname, body, keepalive: init?.keepalive === true })
    if (url.pathname === '/api/members/avatar' && method === 'GET') return Response.json(estado)
    if (url.pathname === '/api/members/avatar' && method === 'PUT')
      return putFalha ? new Response('{}', { status: 503 }) : Response.json({ ok: true })
    if (url.pathname.endsWith('/buy')) {
      const id = decodeURIComponent(url.pathname.split('/').at(-2) ?? '')
      return Response.json({ alreadyOwned: false, balance: 500 - (C.parts[id]?.price ?? 0) })
    }
    if (url.pathname === '/api/members/avatar/snapshot') return Response.json({ url: '/f.png' })
    return new Response('{}', { status: 404 })
  }) as typeof fetch
})
afterEach(() => {
  globalThis.fetch = fetchOriginal
})

async function esperar(cond: () => boolean, ms = 3000) {
  const inicio = Date.now()
  while (!cond() && Date.now() - inicio < ms)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 25))
    })
  expect(cond()).toBe(true)
}
async function montar() {
  let atual: AvatarEditor | undefined
  const fotos: boolean[] = []
  const div = document.createElement('div')
  document.body.append(div)
  const root = createRoot(div)
  function Probe() {
    atual = useAvatarEditor({ messages: AVATAR_MESSAGES.kids })
    return null
  }
  await act(async () => root.render(<Probe />))
  const ed = () => {
    if (!atual) throw new Error('sem editor')
    return atual
  }
  await esperar(() => ed().loadState === 'ready')
  ed().onReady(async (opts) => {
    fotos.push(opts?.portrait === true)
    return new Blob(['png'], { type: 'image/png' })
  })
  return {
    ed,
    fotos,
    fechar: async () => {
      await act(async () => root.unmount())
      div.remove()
    },
  }
}
const item = (id: string, owned = new Set<string>()): AvatarShopItem => {
  const p = C.parts[id]
  if (!p) throw new Error(id)
  return {
    id,
    kind: 'part',
    label: p.label,
    thumb: p.thumb,
    tier: p.tier,
    price: p.price,
    owned: isAvatarItemOwned(C, id, owned),
  }
}
const puts = () => chamadas.filter((c) => c.method === 'PUT')
const gratis = (grupo: string) =>
  C.rules.groups[grupo]?.parts.find((id) => C.parts[id]?.tier === 'free') ?? ''
const paga = (grupo: string) =>
  C.rules.groups[grupo]?.parts.find((id) => C.parts[id]?.tier === 'coins') ?? ''

test('ao abrir, nada grava; uma escolha grátis grava 1 s depois, com o filtro e a foto de frente', async () => {
  const t = await montar()
  expect(t.ed().status).toBe('saved')
  await act(async () => new Promise((r) => setTimeout(r, 1200)))
  expect(puts()).toEqual([])

  const blusa = gratis('roupa_cima')
  await act(async () => t.ed().choose(item(blusa), avatarTab('roupa_cima')))
  expect(t.ed().status).toBe('waiting')
  await act(async () => new Promise((r) => setTimeout(r, 400)))
  expect(puts()).toEqual([])
  await esperar(() => t.ed().status === 'saved' && t.fotos.length === 1, 6000)
  expect(puts()).toHaveLength(1)
  const corpo = puts()[0]?.body as { slots: Record<string, string>; filter: string }
  expect(corpo.slots.roupa_cima).toBe(blusa)
  expect(corpo.filter).toBe('boy')
  expect(t.fotos).toEqual([true])
  expect(chamadas.some((c) => c.path === '/api/members/avatar/snapshot')).toBe(true)
  await t.fechar()
})

test('várias escolhas seguidas viram uma gravação só, com a última', async () => {
  const t = await montar()
  const [a, b] = (C.rules.groups.calcado?.parts ?? []).filter((id) => C.parts[id]?.tier === 'free')
  await act(async () => t.ed().choose(item(a ?? ''), avatarTab('calcado')))
  await act(async () => new Promise((r) => setTimeout(r, 300)))
  await act(async () => t.ed().choose(item(b ?? ''), avatarTab('calcado')))
  await esperar(() => puts().length === 1 && t.ed().status === 'saved')
  await act(async () => new Promise((r) => setTimeout(r, 1200)))
  expect(puts()).toHaveLength(1)
  expect((puts()[0]?.body as { slots: Record<string, string> }).slots.calcado).toBe(b)
  await t.fechar()
})

test('peça paga só de prévia não grava; o 2º toque compra e aí grava', async () => {
  const t = await montar()
  const blusa = paga('roupa_cima')
  await act(async () => t.ed().choose(item(blusa), avatarTab('roupa_cima')))
  expect(t.ed().status).toBe('preview')
  expect(t.ed().pending?.id).toBe(blusa)
  await act(async () => new Promise((r) => setTimeout(r, 1300)))
  expect(puts()).toEqual([])

  await act(async () => t.ed().choose(item(blusa), avatarTab('roupa_cima')))
  await esperar(() => chamadas.some((c) => c.path.endsWith('/buy')))
  await esperar(() => puts().length === 1)
  expect(t.ed().pending).toBeNull()
  expect((puts()[0]?.body as { slots: Record<string, string> }).slots.roupa_cima).toBe(blusa)
  await t.fechar()
})

test('"Deixar para depois" volta ao avatar de antes e nada é gravado', async () => {
  const t = await montar()
  const antes = t.ed().slots
  await act(async () => t.ed().choose(item(paga('chapeu')), avatarTab('chapeu')))
  await act(async () => t.ed().cancelBuy())
  expect(t.ed().slots).toEqual(antes)
  expect(t.ed().status).toBe('saved')
  await act(async () => new Promise((r) => setTimeout(r, 1200)))
  expect(puts()).toEqual([])
  await t.fechar()
})

test('o aviso das regras desfaz a troca', async () => {
  estado.equipped = equipPart(C, estado.equipped as Record<string, string>, gratis('cabelo'))
  const t = await montar()
  const antes = t.ed().slots
  const chapeu = gratis('chapeu')
  await act(async () => t.ed().choose(item(chapeu), avatarTab('chapeu')))
  expect(t.ed().notice?.removed).toEqual([C.parts[gratis('cabelo')]?.label ?? ''])
  await act(async () => t.ed().undoNotice())
  expect(t.ed().slots).toEqual(antes)
  expect(t.ed().notice).toBeNull()
  await t.fechar()
})

test('quem nunca escolheu o filtro grava a escolha', async () => {
  estado.filter = null
  const t = await montar()
  expect(t.ed().filter).toBeNull()
  await act(async () => t.ed().chooseFilter('girl'))
  await esperar(() => puts().length === 1)
  expect((puts()[0]?.body as { filter: string }).filter).toBe('girl')
  await t.fechar()
})

test('gravação que falha mostra o erro, não tenta sozinha de novo, e o "Tentar de novo" grava', async () => {
  putFalha = true
  const t = await montar()
  await act(async () => t.ed().choose(item(gratis('calcado')), avatarTab('calcado')))
  await esperar(() => t.ed().status === 'error')
  await act(async () => new Promise((r) => setTimeout(r, 1300)))
  expect(puts()).toHaveLength(1)
  putFalha = false
  await act(async () => t.ed().retrySave())
  await esperar(() => puts().length === 2 && t.ed().status === 'saved')
  await t.fechar()
})

test('sair da página com algo por gravar manda junto (keepalive, sem foto)', async () => {
  const t = await montar()
  await act(async () => t.ed().choose(item(gratis('calcado')), avatarTab('calcado')))
  await act(async () => {
    window.dispatchEvent(new Event('pagehide'))
  })
  await esperar(() => puts().length >= 1)
  expect(puts()[0]?.keepalive).toBe(true)
  expect(t.fotos).toEqual([])
  await t.fechar()
})

test('o voltar espera a gravação (com a foto) e diz que algo foi salvo', async () => {
  const t = await montar()
  await act(async () => t.ed().choose(item(gratis('calcado')), avatarTab('calcado')))
  let fim: { ok: boolean; saved: boolean } | undefined
  await act(async () => {
    fim = await t.ed().finishBeforeExit()
  })
  expect(fim).toEqual({ ok: true, saved: true })
  expect(puts()).toHaveLength(1)
  expect(t.fotos).toEqual([true])
  await t.fechar()
})

test('sem foto ainda, a primeira visita tira a foto de frente do sorteado, sem gravar o avatar', async () => {
  estado.photoUrl = null
  const t = await montar()
  await esperar(() => chamadas.some((c) => c.path === '/api/members/avatar/snapshot'), 6000)
  expect(t.fotos).toEqual([true])
  expect(puts()).toEqual([])
  await t.fechar()
})

test('com foto, abrir e não mexer não manda nada', async () => {
  const t = await montar()
  await act(async () => new Promise((r) => setTimeout(r, 2000)))
  expect(chamadas.filter((c) => c.method !== 'GET')).toEqual([])
  await t.fechar()
})

test('com uma peça paga de prévia, a mudança grátis de antes grava; a foto espera a prévia acabar', async () => {
  const t = await montar()
  const calcado = gratis('calcado')
  await act(async () => t.ed().choose(item(calcado), avatarTab('calcado')))
  await act(async () => t.ed().choose(item(paga('roupa_cima')), avatarTab('roupa_cima')))
  expect(t.ed().status).toBe('preview')
  await esperar(() => puts().length === 1, 4000)
  const corpo = puts()[0]?.body as { slots: Record<string, string> }
  expect(corpo.slots.calcado).toBe(calcado)
  expect(corpo.slots.roupa_cima).not.toBe(paga('roupa_cima'))
  await act(async () => new Promise((r) => setTimeout(r, 1500)))
  expect(t.fotos).toEqual([])
  // Desistiu da peça paga: o avatar da tela é o gravado, e aí vem a foto.
  await act(async () => t.ed().cancelBuy())
  await esperar(() => t.fotos.length === 1, 4000)
  expect(puts()).toHaveLength(1)
  await t.fechar()
})

test('sair no meio da prévia guarda as mudanças grátis', async () => {
  const t = await montar()
  const calcado = gratis('calcado')
  await act(async () => t.ed().choose(item(calcado), avatarTab('calcado')))
  await act(async () => t.ed().choose(item(paga('chapeu')), avatarTab('chapeu')))
  let fim: { ok: boolean; saved: boolean } | undefined
  await act(async () => {
    fim = await t.ed().finishBeforeExit()
  })
  expect(fim?.ok).toBe(true)
  expect((puts().at(-1)?.body as { slots: Record<string, string> }).slots.calcado).toBe(calcado)
  await t.fechar()
})

test('sair com a gravação falhando devolve ok falso (a tela não sai calada)', async () => {
  putFalha = true
  const t = await montar()
  await act(async () => t.ed().choose(item(gratis('calcado')), avatarTab('calcado')))
  let fim: { ok: boolean; saved: boolean } | undefined
  await act(async () => {
    fim = await t.ed().finishBeforeExit()
  })
  expect(fim).toEqual({ ok: false, saved: false })
  await t.fechar()
})
