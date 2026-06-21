import { describe, expect, it } from 'bun:test'
import { buildModalGuardRuntime } from '../modalGuard'

interface ModalWindow {
  alert: (...a: unknown[]) => unknown
  confirm: (...a: unknown[]) => unknown
  prompt: (...a: unknown[]) => unknown
}

/**
 * Executa o IIFE da guarda num `window` falso com `alert/confirm/prompt` nativos
 * espionáveis e um relógio (`Date.now`) controlável — permitindo testar a janela
 * deslizante sem timers reais.
 */
function load() {
  const calls = { alert: 0, confirm: 0, prompt: 0 }
  const warns: string[] = []
  let now = 1_000_000
  const win = {
    alert: (..._a: unknown[]) => {
      calls.alert++
    },
    confirm: (..._a: unknown[]) => {
      calls.confirm++
      return true
    },
    prompt: (..._a: unknown[]) => {
      calls.prompt++
      return 'resposta-nativa'
    },
    console: {
      warn: (...a: unknown[]) => {
        warns.push(a.map(String).join(' '))
      },
    },
  } as unknown as ModalWindow & { console: { warn: (...a: unknown[]) => void } }
  const fakeDate = { now: () => now }
  // window, console, Date são globais dentro do runtime; passamos como argumentos.
  new Function('window', 'console', 'Date', buildModalGuardRuntime())(
    win,
    (win as { console: unknown }).console,
    fakeDate,
  )
  return {
    win: win as ModalWindow,
    calls,
    warns,
    advance: (ms: number) => {
      now += ms
    },
  }
}

describe('buildModalGuardRuntime', () => {
  it('é string pura, sem imports nem refs externas', () => {
    const runtime = buildModalGuardRuntime()
    expect(runtime.startsWith('(function () {')).toBe(true)
    expect(runtime).not.toContain('import ')
    expect(runtime).not.toContain('require(')
  })

  it('deixa passar as primeiras chamadas e repassa o retorno nativo (síncrono)', () => {
    const { win, calls } = load()
    win.alert('oi')
    expect(win.confirm('certo?')).toBe(true)
    expect(win.prompt('nome?')).toBe('resposta-nativa')
    expect(calls).toEqual({ alert: 1, confirm: 1, prompt: 1 })
  })

  it('silencia o excedente após ~5 chamadas na janela: alert/confirm no-op, prompt null', () => {
    const { win, calls, warns } = load()
    // 5 chamadas passam (MAX = 5).
    for (let i = 0; i < 5; i++) win.alert(`#${i}`)
    expect(calls.alert).toBe(5)
    // A 6ª (e seguintes) são bloqueadas.
    expect(win.alert('extra')).toBeUndefined()
    expect(win.confirm('extra')).toBe(false)
    expect(win.prompt('extra')).toBeNull()
    // Nenhuma das bloqueadas chegou ao nativo.
    expect(calls.alert).toBe(5)
    expect(calls.confirm).toBe(0)
    expect(calls.prompt).toBe(0)
    // Avisou UMA vez, em PT.
    expect(warns).toHaveLength(1)
    expect((warns[0] ?? '').toLowerCase()).toContain('janelas')
  })

  it('prompt SEMPRE retorna string-ou-null síncrono (contrato preservado)', () => {
    const { win } = load()
    const r = win.prompt('nome?')
    expect(typeof r).toBe('string')
    // Esgota a janela e bloqueia: ainda síncrono, agora null (não Promise).
    for (let i = 0; i < 6; i++) win.prompt('x')
    const blocked = win.prompt('x')
    expect(blocked).toBeNull()
  })

  it('a janela DESLIZA: passado o intervalo, novas chamadas voltam a passar', () => {
    const { win, calls, advance } = load()
    for (let i = 0; i < 5; i++) win.alert(`#${i}`)
    expect(win.alert('bloqueado')).toBeUndefined()
    expect(calls.alert).toBe(5)
    // Avança além da janela (3s) → os carimbos antigos saem e novas chamadas passam.
    advance(3_100)
    win.alert('de novo')
    expect(calls.alert).toBe(6)
  })

  it('o aviso rearma entre rajadas (não fica preso após a janela passar)', () => {
    const { win, warns, advance } = load()
    for (let i = 0; i < 6; i++) win.alert(`#${i}`) // 1ª rajada → 1 aviso
    expect(warns).toHaveLength(1)
    advance(3_100)
    for (let i = 0; i < 6; i++) win.alert(`b${i}`) // 2ª rajada → +1 aviso
    expect(warns).toHaveLength(2)
  })
})
