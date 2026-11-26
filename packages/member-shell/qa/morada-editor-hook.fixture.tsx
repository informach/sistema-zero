import { afterEach, beforeEach, expect, test } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { createMoradaHouse, type MoradaHouse } from '@sistemazero/core/morada'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import {
  MORADA_AUTOSAVE_MS,
  MORADA_KEEPALIVE_MAX_BYTES,
  useMoradaEditor,
} from '../src/components/cosmetics/room/use-morada-editor'

/**
 * O salvar sozinho do quarto (`useMoradaEditor` com `autosave`, 26/11/2026) num navegador de
 * mentira: o servidor é um `fetch` falso que anota cada chamada e pode segurar a resposta.
 */
if (typeof document === 'undefined') GlobalRegistrator.register()
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

interface Chamada {
  method: string
  path: string
  body: { house?: MoradaHouse; revision?: number } | null
  keepalive: boolean
}
type Editor = ReturnType<typeof useMoradaEditor>
let chamadas: Chamada[] = []
let revisao = 3
let resposta: 'ok' | 'falha' | 'conflito' | 'motivo' = 'ok'
/** Com uma promessa aqui, o PUT espera até ela resolver (a gravação "em voo"). */
let segurar: Promise<void> | null = null
const fetchOriginal = globalThis.fetch
const puts = () => chamadas.filter((c) => c.method === 'PUT')

beforeEach(() => {
  chamadas = []
  revisao = 3
  resposta = 'ok'
  segurar = null
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input), 'http://localhost')
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null
    chamadas.push({ method, path: url.pathname, body, keepalive: init?.keepalive === true })
    if (url.pathname === '/api/members/room') return Response.json({ balance: 100 })
    if (url.pathname === '/api/members/house' && method === 'GET')
      return Response.json({ house: createMoradaHouse(), revision: revisao, owned: [] })
    if (url.pathname === '/api/members/house' && method === 'PUT') {
      if (segurar) await segurar
      if (resposta === 'falha') return new Response('{}', { status: 503 })
      if (resposta === 'motivo')
        return Response.json(
          { error: { code: 'MORADA_INVALID', message: 'Peça ainda não comprada: Cama azul.' } },
          { status: 400 },
        )
      if (resposta === 'conflito')
        return Response.json(
          { current: { house: createMoradaHouse(), revision: revisao + 10, owned: [] } },
          { status: 409 },
        )
      revisao += 1
      return Response.json({ house: body.house, revision: revisao, owned: [] })
    }
    return new Response('{}', { status: 404 })
  }) as typeof fetch
})
afterEach(() => {
  globalThis.fetch = fetchOriginal
})

async function esperar(cond: () => boolean, ms = 4000) {
  const inicio = Date.now()
  while (!cond() && Date.now() - inicio < ms)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 25))
    })
  expect(cond()).toBe(true)
}
const dormir = (ms: number) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })

async function montar() {
  let atual: Editor | undefined
  const div = document.createElement('div')
  document.body.append(div)
  const root = createRoot(div)
  function Sonda() {
    atual = useMoradaEditor('kids', { autosave: true })
    return null
  }
  await act(async () => root.render(<Sonda />))
  await esperar(() => atual?.status === 'ready')
  return {
    editor: () => {
      if (!atual) throw new Error('editor')
      return atual
    },
    desmontar: () => act(async () => root.unmount()),
  }
}
/** Um gesto: muda a iluminação do quarto (uma mudança válida e simples). */
const gesto = (editor: Editor, lighting: 'noite' | 'tarde' | 'dia') =>
  act(async () =>
    editor.update((h) => ({
      ...h,
      rooms: h.rooms.map((r) => (r.id === h.roomId ? { ...r, lighting } : r)),
    })),
  )
const luz = (c: Chamada | undefined) =>
  c?.body?.house?.rooms.find((r) => r.id === c.body?.house?.roomId)?.lighting

test('grava 1 s depois do último gesto; gestos seguidos viram uma gravação só', async () => {
  const { editor, desmontar } = await montar()
  await gesto(editor(), 'noite')
  await dormir(MORADA_AUTOSAVE_MS / 2)
  await gesto(editor(), 'tarde')
  await dormir(MORADA_AUTOSAVE_MS / 2)
  expect(puts()).toHaveLength(0)
  await esperar(() => editor().saveState === 'saved')
  expect(puts()).toHaveLength(1)
  expect(luz(puts()[0])).toBe('tarde')
  expect(puts()[0]?.body?.revision).toBe(3)
  expect(editor().dirty).toBe(false)
  await desmontar()
  // Nada pendente: sair não grava de novo.
  expect(puts()).toHaveLength(1)
})

test('esconder a aba grava na hora, com keepalive', async () => {
  const { editor, desmontar } = await montar()
  await gesto(editor(), 'noite')
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  await esperar(() => puts().length === 1)
  expect(puts()[0]?.keepalive).toBe(true)
  await desmontar()
})

test('sair da tela com mudança pendente grava antes de desmontar', async () => {
  const { editor, desmontar } = await montar()
  await gesto(editor(), 'noite')
  await desmontar()
  await esperar(() => puts().length === 1)
  expect(luz(puts()[0])).toBe('noite')
  expect(puts()[0]?.keepalive).toBe(true)
})

test('a casa mudou em outro lugar: abre o conflito e para de gravar', async () => {
  resposta = 'conflito'
  const { editor, desmontar } = await montar()
  await gesto(editor(), 'noite')
  await esperar(() => editor().conflict !== null)
  expect(editor().saveState).toBe('idle')
  await gesto(editor(), 'tarde')
  await dormir(MORADA_AUTOSAVE_MS + 300)
  expect(puts()).toHaveLength(1)
  await desmontar()
})

test('a gravação que falha mostra o erro; tentar de novo grava', async () => {
  resposta = 'falha'
  const { editor, desmontar } = await montar()
  await gesto(editor(), 'noite')
  await esperar(() => editor().saveState === 'error')
  // Não tenta sozinho sem parar.
  await dormir(MORADA_AUTOSAVE_MS + 300)
  expect(puts()).toHaveLength(1)
  resposta = 'ok'
  await act(async () => {
    await editor().save()
  })
  await esperar(() => editor().saveState === 'saved')
  expect(puts()).toHaveLength(2)
  expect(editor().dirty).toBe(false)
  await desmontar()
})

test('o gesto feito durante a gravação fica na tela e sai na gravação seguinte', async () => {
  let soltar: () => void = () => {}
  segurar = new Promise<void>((r) => {
    soltar = r
  })
  const { editor, desmontar } = await montar()
  await gesto(editor(), 'noite')
  await esperar(() => editor().saveState === 'saving')
  await gesto(editor(), 'tarde')
  // Com a primeira ainda no ar, o salvar sozinho do gesto novo só marca "de novo".
  await dormir(MORADA_AUTOSAVE_MS + 200)
  expect(puts()).toHaveLength(1)
  segurar = null
  await act(async () => soltar())
  await esperar(() => puts().length === 2 && editor().saveState === 'saved')
  expect(luz(puts()[0])).toBe('noite')
  expect(luz(puts()[1])).toBe('tarde')
  // A segunda usa a revisão que a primeira devolveu, e o gesto não sumiu da tela.
  expect(puts()[1]?.body?.revision).toBe(4)
  const atual = editor().draft
  expect(atual?.rooms.find((r) => r.id === atual.roomId)?.lighting).toBe('tarde')
  await desmontar()
})

// Revisão de 26/11/2026.
test('o PUT leva só as peças do quarto; casa grande demais para o keepalive vai como pedido comum', async () => {
  const { editor, desmontar } = await montar()
  const tapete = 'moveis/tapetes/tapete_zigue_zague_rosa'
  await act(async () =>
    editor().update((h) => ({
      ...h,
      instances: [
        ...h.instances,
        ...Array.from({ length: 420 }, (_, i) => ({
          id: `tapete-de-teste-com-um-nome-comprido-${i}`,
          pieceId: tapete,
          roomId: h.roomId,
          position: [0, 0, 0] as [number, number, number],
          rotation: 0,
        })),
      ],
    })),
  )
  Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
  await act(async () => {
    document.dispatchEvent(new Event('visibilitychange'))
  })
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  await esperar(() => puts().length === 1)
  const put = puts()[0]
  expect(JSON.stringify(put?.body).length).toBeGreaterThan(MORADA_KEEPALIVE_MAX_BYTES)
  expect(put?.keepalive).toBe(false)
  expect(put?.body?.house?.instances.every((i) => i.roomId === put.body?.house?.roomId)).toBe(true)
  await desmontar()
})

test('a recusa do servidor mostra o motivo, também com o salvar sozinho', async () => {
  resposta = 'motivo'
  const { editor, desmontar } = await montar()
  await gesto(editor(), 'noite')
  await esperar(() => editor().saveState === 'error')
  expect(editor().message).toBe('Peça ainda não comprada: Cama azul.')
  await desmontar()
})

test('desfazer de volta ao guardado tira o "Não salvou"', async () => {
  resposta = 'falha'
  const { editor, desmontar } = await montar()
  const antes = editor().draft
  await gesto(editor(), 'noite')
  await esperar(() => editor().saveState === 'error')
  await act(async () => editor().update(() => antes as MoradaHouse))
  await esperar(() => editor().saveState === 'saved')
  expect(editor().dirty).toBe(false)
  await desmontar()
})

test('409 com um gesto pendente: não sai outra gravação com a revisão velha', async () => {
  let soltar: () => void = () => {}
  segurar = new Promise<void>((r) => {
    soltar = r
  })
  resposta = 'conflito'
  const { editor, desmontar } = await montar()
  await gesto(editor(), 'noite')
  await esperar(() => editor().saveState === 'saving')
  await gesto(editor(), 'tarde')
  await dormir(MORADA_AUTOSAVE_MS + 200)
  segurar = null
  await act(async () => soltar())
  await esperar(() => editor().conflict !== null)
  await dormir(300)
  expect(puts()).toHaveLength(1)
  await desmontar()
})

test('resolver o conflito troca a casa: a geração sobe (quem desfaz recomeça)', async () => {
  resposta = 'conflito'
  const { editor, desmontar } = await montar()
  const geracao = editor().generation
  await gesto(editor(), 'noite')
  await esperar(() => editor().conflict !== null)
  await act(async () => editor().resolveConflict(false))
  expect(editor().generation).toBe(geracao + 1)
  expect(editor().conflict).toBeNull()
  await desmontar()
})

test('sair da tela com uma gravação no ar: o gesto de depois ainda sai, com keepalive', async () => {
  let soltar: () => void = () => {}
  segurar = new Promise<void>((r) => {
    soltar = r
  })
  const { editor, desmontar } = await montar()
  await gesto(editor(), 'noite')
  await esperar(() => editor().saveState === 'saving')
  await gesto(editor(), 'tarde')
  await desmontar()
  segurar = null
  await act(async () => soltar())
  await esperar(() => puts().length === 2)
  expect(luz(puts()[1])).toBe('tarde')
  expect(puts()[1]?.keepalive).toBe(true)
})
