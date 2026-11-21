import { describe, expect, it } from 'bun:test'
import { createFramePause, PYTHON_HOLD_REQUEST } from './framePause'

/** Pausar e Avançar 1 quadro no Python: o quadro segura a resposta do próximo quadro pintado. */

function harness() {
  let painted = 0
  const held: number[] = []
  const pause = createFramePause({ onHeld: (frame) => held.push(frame) })
  /** Um quadro do programa: o renderizador pinta e responde com a entrada. */
  const frame = () =>
    pause.exchange(
      '{"w":320}',
      async () => {
        painted++
        return '{"keys":[]}'
      },
      () => painted,
    )
  const poll = () =>
    pause.exchange(
      PYTHON_HOLD_REQUEST,
      async () => '{"never":true}',
      () => painted,
    )
  return { pause, frame, poll, held, painted: () => painted }
}

describe('a pausa do Python na troca de quadro', () => {
  it('sem pausa, a resposta do quadro passa como veio e o pedido curto é solto na hora', async () => {
    const { frame, poll, held } = harness()
    expect(await frame()).toBe('{"keys":[]}')
    expect(await poll()).toBe('{"hold":false}')
    expect(held).toEqual([])
  })

  it('pedida, a pausa vale no próximo quadro pintado: a resposta leva hold e o resto igual', async () => {
    const { pause, frame, held } = harness()
    await frame()
    pause.set(true)
    expect(JSON.parse(String(await frame()))).toEqual({ keys: [], hold: true })
    expect(held).toEqual([2])
    expect(pause.held).toBe(true)
  })

  it('pausado: o pedido curto espera; a leitura dos valores solta uma volta sem continuar', async () => {
    const { pause, frame, poll } = harness()
    pause.set(true)
    await frame()
    let answered: unknown = null
    const waiting = poll().then((reply) => {
      answered = reply
    })
    await Promise.resolve()
    expect(answered).toBeNull()
    pause.wake()
    await waiting
    expect(answered).toBe('{"hold":true}')
    expect(pause.held).toBe(true)
  })

  it('continuar solta com hold falso; avançar solta e segura de novo no quadro seguinte', async () => {
    const { pause, frame, poll, held } = harness()
    pause.set(true)
    await frame()
    const first = poll()
    expect(pause.step()).toBe(true)
    expect(await first).toBe('{"hold":false}')
    expect(JSON.parse(String(await frame())).hold).toBe(true)
    expect(held).toEqual([1, 2])
    const second = poll()
    pause.set(false)
    expect(await second).toBe('{"hold":false}')
    expect(await frame()).toBe('{"keys":[]}')
    expect(pause.step()).toBe(false)
  })

  it('a resposta com os pixels guarda os bytes; fechar o quadro solta quem espera', async () => {
    let painted = 0
    const pause = createFramePause({ onHeld: () => {} })
    pause.set(true)
    const bytes = new Uint8Array([1, 2, 3])
    const reply = await pause.exchange(
      '{"decode":1}',
      async () => {
        painted++
        return { text: '{"ok":1}', bytes }
      },
      () => painted,
    )
    expect(reply).toEqual({ text: '{"ok":1,"hold":true}', bytes })
    const waiting = pause.exchange(
      PYTHON_HOLD_REQUEST,
      async () => '',
      () => painted,
    )
    pause.dispose()
    expect(await waiting).toBe('{"hold":false}')
  })

  it('no Turtle a pausa vale na próxima resposta, mesmo sem quadro pintado', async () => {
    const held: number[] = []
    const pause = createFramePause({ onHeld: (frame) => held.push(frame) })
    pause.set(true)
    // O desenho parado: a espera do mainloop volta sem pintar nada.
    const reply = await pause.exchange(
      '{"version":1,"operations":[],"query":{"type":"wait","timeoutMs":null}}',
      async () => '{"events":[],"value":null}',
      () => 7,
      true,
    )
    expect(JSON.parse(String(reply))).toEqual({ events: [], value: null, hold: true })
    expect(held).toEqual([7])
    expect(pause.held).toBe(true)
  })

  it('pedido de pixels (sem quadro pintado) não pausa', async () => {
    const { pause } = harness()
    pause.set(true)
    expect(
      await pause.exchange(
        '{"decode":1}',
        async () => '{"px":1}',
        () => 0,
      ),
    ).toBe('{"px":1}')
    expect(pause.held).toBe(false)
  })
})
