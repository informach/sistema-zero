import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { PALETTE_LABELS } from '@sistemazero/core/palette'
import { PalettePicker } from '@sistemazero/member-shell/components/palette-picker'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

/**
 * O seletor de cor do perfil — o que substituiu o alternador Padrão⇄Pink.
 *
 * ⚠️⚠️ A asserção de SEQUÊNCIA (via `MutationObserver`) é portada do `profile-theme.test.tsx`
 * que morreu junto com o `next-themes`: ela é a única forma de provar "não pisca", porque um
 * valor intermediário aparece e some entre dois renders e nenhuma asserção de estado final o
 * pega. O defeito que ela trava é real e foi medido: a tela passava pela cor da casa antes de
 * chegar na cor da criança.
 */

const VIEWER = '11111111-1111-4111-8111-111111111111'

let puts: { palette: string | null }[] = []
let responder: () => Response
const fetchOriginal = globalThis.fetch

/** Grava a ORDEM em que o `<html>` mudou de cor, do primeiro render ao fim do gesto. */
function observarCores() {
  const vistos: (string | null)[] = [document.documentElement.dataset.szPalette ?? null]
  const obs = new MutationObserver(() => {
    const atual = document.documentElement.dataset.szPalette ?? null
    if (atual !== vistos.at(-1)) vistos.push(atual)
  })
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-sz-palette'] })
  return { vistos, parar: () => obs.disconnect() }
}

beforeEach(() => {
  puts = []
  responder = () => new Response(JSON.stringify({ palette: null }), { status: 200 })
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(typeof input === 'string' ? input : input instanceof URL ? input : input.url)
    if (url.includes('/api/members/preferences')) {
      if (init?.method === 'PUT') puts.push(JSON.parse(String(init.body)))
      return responder()
    }
    throw new Error(`fetch inesperado: ${url}`)
  }) as typeof fetch
})

afterEach(() => {
  cleanup()
  globalThis.fetch = fetchOriginal
  document.documentElement.removeAttribute('data-sz-palette')
})

const marcado = (rotulo: string) =>
  (screen.getByRole('radio', { name: PALETTE_LABELS[rotulo as 'pink'] }) as HTMLInputElement)
    .checked

const clicar = (rotulo: string) =>
  fireEvent.click(screen.getByRole('radio', { name: PALETTE_LABELS[rotulo as 'pink'] }))

describe('o seletor de cor', () => {
  it('⚠️ NÃO busca nada ao montar — o valor vem do servidor', async () => {
    render(<PalettePicker viewerId={VIEWER} initial="pink" />)
    await act(async () => {})
    expect(puts).toEqual([])
    // E a cor que chegou do servidor é a que aparece marcada.
    expect(marcado('pink')).toBe(true)
  })

  it('⭐ pinta na hora e NÃO pisca: nenhuma cor intermediária na sequência', async () => {
    document.documentElement.dataset.szPalette = 'pink'
    render(<PalettePicker viewerId={VIEWER} initial="pink" />)
    const { vistos, parar } = observarCores()
    await act(async () => {
      clicar('teal')
    })
    await waitFor(() => expect(puts.length).toBe(1))
    parar()
    expect(document.documentElement.dataset.szPalette).toBe('teal')
    // Só a cor nova entrou: nada de passar pelo azul da casa no caminho.
    expect(vistos).toEqual(['pink', 'teal'])
  })

  it('⭐ cliques rápidos se AGRUPAM: quatro cores não viram quatro pedidos', async () => {
    // O teto do gateway é 60/min por principal e é circuito de segurança — quem junta os
    // cliques é o cliente. O PRIMEIRO clique sai na hora (a troca precisa ser responsiva); os
    // seguintes se juntam num só, com a cor final. Quatro cliques = dois pedidos, nunca quatro.
    render(<PalettePicker viewerId={VIEWER} initial={null} />)
    await act(async () => {
      clicar('teal')
      clicar('green')
      clicar('orange')
      clicar('purple')
    })
    await waitFor(() => expect(puts.at(-1)).toEqual({ palette: 'purple' }), { timeout: 4000 })
    expect(puts.length).toBeLessThanOrEqual(2)
    expect(document.documentElement.dataset.szPalette).toBe('purple')
  })

  it('⚠️ falha de rede volta para a última cor CONFIRMADA, nunca para a cor da casa', async () => {
    render(<PalettePicker viewerId={VIEWER} initial="pink" />)
    responder = () => new Response('{}', { status: 500 })
    await act(async () => {
      clicar('orange')
    })
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    // Rosa era o que o servidor tinha confirmado. Voltar para azul apagaria da tela a cor que a
    // criança já tinha — que é o oposto de "não perdi nada".
    expect(document.documentElement.dataset.szPalette).toBe('pink')
    expect(marcado('pink')).toBe(true)
  })

  it('o perfil trocado no meio do clique vira recado, não cor errada', async () => {
    render(<PalettePicker viewerId={VIEWER} initial={null} />)
    responder = () =>
      new Response(JSON.stringify({ error: { code: 'VIEWER_CHANGED' } }), { status: 409 })
    await act(async () => {
      clicar('green')
    })
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('perfil mudou'))
  })

  it('impersonação somente-leitura mostra o estado e não grava', async () => {
    render(<PalettePicker viewerId={VIEWER} initial="teal" readOnly />)
    await act(async () => {
      clicar('pink')
    })
    expect(puts).toEqual([])
    expect(marcado('teal')).toBe(true)
  })

  it('o nome acessível é o rótulo em português, nunca o hexadecimal', () => {
    render(<PalettePicker viewerId={VIEWER} initial={null} />)
    for (const [id, rotulo] of Object.entries(PALETTE_LABELS)) {
      const radio = screen.getByRole('radio', { name: rotulo })
      expect(radio.getAttribute('value')).toBe(id)
    }
  })
  it('⚠️⚠️ um clique feito DURANTE um envio que falha não pode sumir', async () => {
    // Medido no review: a pessoa clica Laranja, a rede cai, e ela clica Verde enquanto isso.
    // Desfazer sem olhar o que está na fila jogava o Verde fora sem nunca enviá-lo — o clique
    // sumia em silêncio e a tela voltava para uma cor que ela não acabou de escolher.
    render(<PalettePicker viewerId={VIEWER} initial="pink" />)
    let liberar: (() => void) | undefined
    const primeiraTerminou = new Promise<void>((r) => {
      liberar = r
    })
    // Só o PRIMEIRO envio falha; o segundo (o clique mais novo) tem de conseguir sair.
    globalThis.fetch = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      const n = puts.length
      if (init?.method === 'PUT') puts.push(JSON.parse(String(init.body)))
      if (n === 0) {
        await primeiraTerminou
        throw new Error('rede')
      }
      return new Response(JSON.stringify({ palette: 'green' }), { status: 200 })
    }) as unknown as typeof fetch

    await act(async () => {
      clicar('orange')
    })
    await waitFor(() => expect(puts.length).toBe(1))
    await act(async () => {
      clicar('green')
    })
    await act(async () => {
      liberar?.()
      await Promise.resolve()
    })
    // O Verde é a intenção viva: ele TEM de sair, e a tela não volta para o rosa.
    await waitFor(() => expect(puts.at(-1)).toEqual({ palette: 'green' }), { timeout: 4000 })
    expect(document.documentElement.dataset.szPalette).toBe('green')
  })

  it('⚠️ "Tentar de novo" reenvia a cor recusada — não é botão morto', async () => {
    render(<PalettePicker viewerId={VIEWER} initial="pink" />)
    responder = () => new Response('{}', { status: 500 })
    await act(async () => {
      clicar('orange')
    })
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    expect(puts.length).toBe(1)

    responder = () => new Response(JSON.stringify({ palette: 'orange' }), { status: 200 })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /tentar de novo/i }))
    })
    // Sem o alvo recusado guardado, `desejada === confirmada` e o envio saía na 1ª linha: zero
    // pedidos, erro na tela para sempre.
    await waitFor(() => expect(puts.length).toBe(2), { timeout: 4000 })
    expect(puts.at(-1)).toEqual({ palette: 'orange' })
    expect(document.documentElement.dataset.szPalette).toBe('orange')
  })
})
