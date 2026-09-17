import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { PALETTE_LABELS } from '@sistemazero/core/palette'
import { PalettePicker } from '@sistemazero/member-shell/components/palette-picker'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { StrictMode } from 'react'

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
/**
 * A cor que o BANCO tem. O seletor confere com ela ao montar (reconciliação entre aparelhos), e
 * por padrão os testes a deixam igual à que o servidor pintou — divergência é o assunto de UM
 * teste só, e não ruído em todos os outros.
 */
let corNoServidor: string | null = null
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
      if (init?.method !== 'PUT')
        return new Response(JSON.stringify({ palette: corNoServidor }), { status: 200 })
      puts.push(JSON.parse(String(init.body)))
      return responder()
    }
    throw new Error(`fetch inesperado: ${url}`)
  }) as typeof fetch
})

/** Monta o seletor com o banco e o servidor DE ACORDO — o caso normal. */
function montar(initial: 'pink' | 'teal' | null, props?: { readOnly?: boolean }) {
  corNoServidor = initial
  return render(<PalettePicker viewerId={VIEWER} initial={initial} {...props} />)
}

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
  it('⚠️ NÃO grava nada ao montar — o valor vem do servidor', async () => {
    montar('pink')
    await act(async () => {})
    expect(puts).toEqual([])
    // E a cor que chegou do servidor é a que aparece marcada, no primeiro quadro.
    expect(marcado('pink')).toBe(true)
  })

  /**
   * ⭐ O espelho em cookie vale seis horas e é POR APARELHO: quem trocou a cor no celular abria o
   * computador e via a caixinha antiga marcada — bem na tela que existe para dizer qual é a sua
   * cor. Uma ida ao servidor ao abrir o perfil conserta a tela E, no BFF, o cookie do aparelho.
   */
  it('⭐ o espelho atrasado de OUTRO aparelho é corrigido ao abrir o perfil', async () => {
    corNoServidor = 'orange'
    render(<PalettePicker viewerId={VIEWER} initial="pink" />)
    expect(marcado('pink')).toBe(true)
    await waitFor(() => expect(marcado('orange')).toBe(true))
    expect(document.documentElement.dataset.szPalette).toBe('orange')
    // Conferir não é gravar: a correção não pode virar uma escrita que ninguém pediu.
    expect(puts).toEqual([])
  })

  /**
   * ⚠️⚠️ O guarda de "já mexi" protege a TELA; o cookie ele não protege. A resposta do GET também
   * grava o espelho (é o auto-conserto dele), e uma leitura lenta que saiu ANTES do clique carrega
   * o valor de antes: chegando depois do PUT, ela carimbaria a cor velha por seis horas — e o
   * proxy, vendo dono e cookie casados, nunca mais perguntaria. Uma cor velha no aparelho inteiro,
   * que é justamente o defeito que este desenho existe para matar.
   */
  it('⚠️⚠️ escolher DESISTE da conferência em voo: a resposta dela não grava cookie', async () => {
    let sinalDoGet: AbortSignal | undefined
    globalThis.fetch = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        puts.push(JSON.parse(String(init.body)))
        return new Response(JSON.stringify({ palette: 'orange' }), { status: 200 })
      }
      sinalDoGet = init?.signal ?? undefined
      // Nunca responde: é a leitura lenta do caso real.
      return await new Promise<Response>(() => {})
    }) as unknown as typeof fetch

    render(<PalettePicker viewerId={VIEWER} initial="pink" />)
    await act(async () => {})
    expect(sinalDoGet?.aborted).toBe(false)
    await act(async () => {
      clicar('orange')
    })
    expect(sinalDoGet?.aborted).toBe(true)
    await waitFor(() => expect(puts.at(-1)).toEqual({ palette: 'orange' }))
  })

  /**
   * ⚠️ No StrictMode do desenvolvimento o React monta, desmonta e monta de novo. Uma marca de "já
   * rodei" que sobrevive à remontagem fazia a segunda montagem desistir com a resposta da primeira
   * já descartada: a conferência ficava MORTA no `bun dev`, e nenhum teste via — porque os testes
   * montam sem StrictMode.
   */
  it('⚠️ a conferência vale também sob StrictMode (o `bun dev` dos dois apps)', async () => {
    corNoServidor = 'orange'
    render(
      <StrictMode>
        <PalettePicker viewerId={VIEWER} initial="pink" />
      </StrictMode>,
    )
    await waitFor(() => expect(marcado('orange')).toBe(true))
    expect(document.documentElement.dataset.szPalette).toBe('orange')
  })

  it('⚠️⚠️ um clique feito antes da conferência chegar NÃO é desfeito por ela', async () => {
    // A pessoa abre o perfil e clica antes de a resposta voltar. Deixar a conferência mandar
    // apagaria da tela a escolha que ela acabou de fazer.
    let liberarGet: (() => void) | undefined
    const getEmVoo = new Promise<void>((r) => {
      liberarGet = r
    })
    globalThis.fetch = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'PUT') {
        puts.push(JSON.parse(String(init.body)))
        return new Response(JSON.stringify({ palette: 'teal' }), { status: 200 })
      }
      await getEmVoo
      return new Response(JSON.stringify({ palette: 'orange' }), { status: 200 })
    }) as unknown as typeof fetch

    render(<PalettePicker viewerId={VIEWER} initial="pink" />)
    await act(async () => {
      clicar('teal')
    })
    await act(async () => {
      liberarGet?.()
      await Promise.resolve()
    })
    await waitFor(() => expect(puts.at(-1)).toEqual({ palette: 'teal' }), { timeout: 4000 })
    expect(marcado('teal')).toBe(true)
    expect(document.documentElement.dataset.szPalette).toBe('teal')
  })

  it('⭐ pinta na hora e NÃO pisca: nenhuma cor intermediária na sequência', async () => {
    document.documentElement.dataset.szPalette = 'pink'
    montar('pink')
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
    montar(null)
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
    montar('pink')
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
    montar(null)
    responder = () =>
      new Response(JSON.stringify({ error: { code: 'VIEWER_CHANGED' } }), { status: 409 })
    await act(async () => {
      clicar('green')
    })
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('perfil mudou'))
  })

  it('impersonação somente-leitura mostra o estado e não grava', async () => {
    montar('teal', { readOnly: true })
    await act(async () => {
      clicar('pink')
    })
    expect(puts).toEqual([])
    expect(marcado('teal')).toBe(true)
  })

  /**
   * ⚠️ O perfil adulto mostra o seletor dentro de um cartão que JÁ tem título. Com a legenda
   * própria eram dois títulos empilhados dizendo a mesma coisa com palavras diferentes — e o
   * leitor de tela anunciava os dois.
   */
  it('⚠️ com título da página, o seletor não escreve legenda própria', async () => {
    corNoServidor = null
    render(
      <>
        <h3 id="titulo-da-cor">Cor do tema</h3>
        <PalettePicker viewerId={VIEWER} initial={null} labelledBy="titulo-da-cor" />
      </>,
    )
    await act(async () => {})
    expect(screen.queryByText('Cor do seu perfil')).toBeNull()
    expect(screen.getByRole('radiogroup', { name: 'Cor do tema' })).toBeTruthy()
  })

  it('o nome acessível é o rótulo em português, nunca o hexadecimal', () => {
    montar(null)
    for (const [id, rotulo] of Object.entries(PALETTE_LABELS)) {
      const radio = screen.getByRole('radio', { name: rotulo })
      expect(radio.getAttribute('value')).toBe(id)
    }
  })
  it('⚠️⚠️ um clique feito DURANTE um envio que falha não pode sumir', async () => {
    // Medido no review: a pessoa clica Laranja, a rede cai, e ela clica Verde enquanto isso.
    // Desfazer sem olhar o que está na fila jogava o Verde fora sem nunca enviá-lo — o clique
    // sumia em silêncio e a tela voltava para uma cor que ela não acabou de escolher.
    montar('pink')
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
    montar('pink')
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
