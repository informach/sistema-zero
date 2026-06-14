import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { type LogEntry, MAX_LOG_ENTRIES, useLogsStore } from '../../state/logsStore'
import { ConsolePanel } from './ConsolePanel'

let nextId = 1
function logEntry(text: string): LogEntry {
  return { id: nextId++, kind: 'log', text, timestamp: 0 }
}

function setEntries(entries: LogEntry[]): void {
  useLogsStore.setState({ entries })
}

function scrollContainer(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>('.overflow-auto')
  if (!el) throw new Error('Contêiner de scroll do console não encontrado')
  return el
}

// happy-dom não faz layout real: forja métricas e intercepta a escrita de
// scrollTop (sem clamping) para observar o que o componente TENTA fazer.
function instrument(
  el: HTMLElement,
  scrollHeight: number,
  clientHeight: number,
): { last(): number } {
  let value = 0
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true })
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true })
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    get: () => value,
    set: (v: number) => {
      value = v
    },
  })
  return { last: () => value }
}

describe('ConsolePanel', () => {
  beforeEach(() => {
    nextId = 1
    setEntries([logEntry('linha 1')])
  })

  afterEach(() => {
    cleanup()
    setEntries([])
  })

  it('cola no rodapé ao chegar nova mensagem (#7)', () => {
    const { container } = render(<ConsolePanel />)
    const el = scrollContainer(container)
    const scroll = instrument(el, 400, 100)

    act(() => {
      setEntries([logEntry('linha 1'), logEntry('linha 2')])
    })

    // Com o scroll colado, a última linha fica visível (scrollTop = scrollHeight).
    expect(scroll.last()).toBe(400)
  })

  it('não puxa a viewport quando o aluno rolou para cima para ler o histórico (#7)', () => {
    const { container } = render(<ConsolePanel />)
    const el = scrollContainer(container)
    const scroll = instrument(el, 400, 100)

    // Aluno rola para cima (longe do fim) — desgruda do rodapé.
    el.scrollTop = 0
    act(() => {
      fireEvent.scroll(el)
    })

    act(() => {
      setEntries([logEntry('linha 1'), logEntry('linha 2')])
    })

    // A viewport NÃO é arrastada de volta para o fim.
    expect(scroll.last()).toBe(0)
  })

  it('continua colando no rodapé depois do ring buffer encher (>500 entradas)', () => {
    // Buffer CHEIO: comprimento já saturado em MAX_LOG_ENTRIES. Cada novo push
    // descarta o mais antigo, então entries.length não muda mais — só o id da
    // última entrada avança. Keyar o efeito em entries.length pararia o
    // auto-scroll a partir daqui.
    const full: LogEntry[] = Array.from({ length: MAX_LOG_ENTRIES }, (_, i) =>
      logEntry(`linha ${i + 1}`),
    )
    setEntries(full)

    const { container } = render(<ConsolePanel />)
    const el = scrollContainer(container)
    const scroll = instrument(el, 400, 100)

    // Nova mensagem com buffer cheio: tamanho permanece 500, só o id sobe.
    act(() => {
      const next = full.slice(1)
      next.push(logEntry('mensagem 501'))
      setEntries(next)
    })

    expect(el.children.length).toBe(MAX_LOG_ENTRIES)
    // Com o scroll colado, a última linha continua visível.
    expect(scroll.last()).toBe(400)
  })
})
