import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { act, cleanup, render, screen } from '@testing-library/react'
import { useHostAppearanceRevision } from './useHostAppearanceRevision'

/**
 * ⚠️⚠️ O observador aqui é um DUBLÊ, e a razão é o happy-dom, não preguiça: o
 * `MutationObserverListener` dele guarda o callback do nó dentro de um `WeakRef`
 * (`callback: new WeakRef(...)`) e ninguém mais segura aquela função — o coletor de lixo pode
 * levá-la a QUALQUER momento e o observador para de entregar no meio do teste, em silêncio.
 *
 * Medido lado a lado (11/09/2026): o mesmo arquivo deu revisões 1, 2, 3 numa execução e 1, 1, 1
 * na seguinte, sem nenhuma mudança de código; foi assim que este teste reprovou no CI Linux com
 * a suíte inteira verde no Windows. Não é ordem de arquivos nem carga de máquina: é o GC.
 *
 * O que este arquivo prova é o que o HOOK faz — o que ele observa, o que sobe a revisão e o
 * desconectar ao sair. A entrega de verdade é do navegador, e lá não há `WeakRef` nenhum.
 */
type Entrada = { alvo: Node; options: MutationObserverInit }

class ObservadorFalso {
  static instancias: ObservadorFalso[] = []
  entradas: Entrada[] = []
  desconectado = false

  constructor(readonly callback: MutationCallback) {
    ObservadorFalso.instancias.push(this)
  }

  observe(alvo: Node, options: MutationObserverInit = {}) {
    this.entradas.push({ alvo, options })
  }

  disconnect() {
    this.desconectado = true
  }

  takeRecords(): MutationRecord[] {
    return []
  }

  /** Uma entrega do navegador: um LOTE de registros, como o observador de verdade faz. */
  entregar(registros = 1) {
    const lote = Array.from({ length: registros }, () => ({}) as MutationRecord)
    act(() => {
      this.callback(lote, this as unknown as MutationObserver)
    })
  }
}

function Sonda() {
  return <output>{useHostAppearanceRevision()}</output>
}

const revisao = () => Number(screen.getByRole('status').textContent)
const observador = () => {
  const instancia = ObservadorFalso.instancias[0]
  if (!instancia) throw new Error('o hook não criou observador nenhum')
  return instancia
}

const MutationObserverReal = globalThis.MutationObserver

beforeEach(() => {
  ObservadorFalso.instancias = []
  globalThis.MutationObserver = ObservadorFalso as unknown as typeof MutationObserver
})

afterEach(() => {
  cleanup()
  globalThis.MutationObserver = MutationObserverReal
})

describe('useHostAppearanceRevision', () => {
  it('observa os ATRIBUTOS do <html>, e só ele (sem a subárvore)', () => {
    render(<Sonda />)
    const [entrada] = observador().entradas
    expect(ObservadorFalso.instancias).toHaveLength(1)
    expect(entrada?.alvo).toBe(document.documentElement)
    expect(entrada?.options.attributes).toBe(true)
    expect(entrada?.options.subtree).toBeUndefined()
  })

  it('cada entrega sobe a revisão (o host trocando Padrão ⇄ Pink)', () => {
    render(<Sonda />)
    expect(revisao()).toBe(0)
    observador().entregar()
    expect(revisao()).toBe(1)
    observador().entregar()
    expect(revisao()).toBe(2)
  })

  it('um LOTE de mudanças conta uma vez: quem lê relê a paleta uma vez só', () => {
    render(<Sonda />)
    observador().entregar(3)
    expect(revisao()).toBe(1)
  })

  it('ao sair, desconecta (nada de observador vivo depois do editor)', () => {
    const { unmount } = render(<Sonda />)
    expect(observador().desconectado).toBe(false)
    unmount()
    expect(observador().desconectado).toBe(true)
  })

  it('sem MutationObserver no ambiente, o hook não quebra (fica em 0)', () => {
    // @ts-expect-error: o ambiente pode não ter o observador (SSR, navegador antigo).
    globalThis.MutationObserver = undefined
    render(<Sonda />)
    expect(revisao()).toBe(0)
  })
})
