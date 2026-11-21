import { describe, expect, it } from 'bun:test'
import type { InvestigationReading } from '../../state/devtools'
import {
  type PythonInvestigationController,
  type PythonInvestigationSender,
  pythonDeclarationLine,
  pythonTopLevelNames,
  pythonTraceSteps,
  pythonValueText,
  runPythonInvestigation,
} from './pythonInvestigation'

describe('o Investigar no Python', () => {
  it('pergunta pelas variáveis criadas no topo do arquivo, na ordem', () => {
    const source = [
      'import pgzrun',
      'WIDTH = 320',
      'pontos: int = 0',
      'x, (y, z) = 1, (2, 3)',
      'vidas += 1',
      '_interno = 9',
      'if pontos == 0:',
      '    escondido = 1',
      'def update():',
      '    global pontos',
      'nome = "a=b"  # comentário = não',
    ].join('\n')
    expect(pythonTopLevelNames(source)).toEqual(['WIDTH', 'pontos', 'x', 'y', 'z', 'vidas', 'nome'])
    expect(pythonDeclarationLine(source, 'pontos')).toBe(3)
    expect(pythonDeclarationLine(source, 'escondido')).toBeNull()
  })

  it('o caminho até o erro: só os passos do projeto, de dentro para fora', () => {
    const traceback = [
      'Traceback (most recent call last):',
      '  File "/lib/python3.12/site-packages/pgzero/game.py", line 10, in run',
      '  File "/studio/project/main.py", line 20, in update',
      '  File "/studio/project/inimigos.py", line 4, in mover',
      "NameError: name 'velocidade' is not defined",
    ].join('\n')
    expect(pythonTraceSteps(traceback)).toEqual([
      { file: 'inimigos.py', line: 4 },
      { file: 'main.py', line: 20 },
    ])
  })

  it('escreve o valor como o Python escreveria', () => {
    expect(pythonValueText(true)).toBe('True')
    expect(pythonValueText(null)).toBe('None')
    expect(pythonValueText('oi')).toBe("'oi'")
    expect(pythonValueText([1, 'a', false])).toBe("[1, 'a', False]")
    expect(pythonValueText({ x: 1 })).toBe("{'x': 1}")
    expect(pythonValueText('a'.repeat(200)).length).toBeLessThanOrEqual(81)
  })
})

/**
 * Pausar e Avançar 1 quadro no Python (lote 11 dos painéis aprovados): o laço da aba fala com o
 * controlador da execução. O controlador de mentira faz o que o quadro do Python faz: a pausa
 * segura o próximo quadro, Avançar segura o seguinte, e o quadro antigo recusa o comando.
 */
function harness(options: { knowsPause?: boolean; holds?: boolean } = {}) {
  const knowsPause = options.knowsPause ?? true
  const holds = options.holds ?? true
  let frame = 41
  let pontos = 0
  let paused = false
  const pauses: boolean[] = []
  const controller: PythonInvestigationController = {
    async observe(probe) {
      // Rodando, o programa anda entre uma leitura e outra; parado, não.
      if (!paused) pontos++
      return {
        observation:
          probe.type === 'value' && probe.path === 'pontos'
            ? { type: 'value', observed: { found: true, value: pontos } }
            : { type: 'value', observed: { found: false } },
      }
    },
    async pause(on) {
      if (!knowsPause) throw new Error('Comando de execução inválido.')
      pauses.push(on)
      paused = on && holds
      if (!on || !holds) return null
      return { frame: ++frame }
    },
    async step() {
      pontos++
      return { frame: ++frame }
    },
  }
  const readings: InvestigationReading[] = []
  let sender: PythonInvestigationSender | null = null
  const stop = runPythonInvestigation({
    controller,
    names: ['pontos', 'sumiu'],
    draws: true,
    completed: false,
    receive: (reading) => readings.push(reading),
    setSender: (value) => {
      sender = value
    },
    intervalMs: 5,
  })
  return {
    controller,
    readings,
    pauses,
    stop,
    send: (command: Parameters<PythonInvestigationSender>[0]) => sender?.(command),
    hasSender: () => sender !== null,
    last: () => readings.at(-1),
  }
}

async function until(check: () => boolean) {
  for (let i = 0; i < 200 && !check(); i++) await new Promise((resolve) => setTimeout(resolve, 2))
  expect(check()).toBe(true)
}

describe('Pausar e Avançar 1 quadro no Python', () => {
  it('pausa no quadro do programa, avança 1 quadro e continua, com os valores daquele quadro', async () => {
    const h = harness()
    await until(() => h.readings.length > 0)
    expect(h.last()).toMatchObject({ paused: false, canPause: true, frame: null })
    expect(h.last()?.values.map((value) => value.name)).toEqual(['pontos'])
    h.send('pause')
    await until(() => h.last()?.paused === true)
    expect(h.last()?.frame).toBe(42)
    const frozen = h.last()?.values[0]?.text
    // Parado, os valores não mudam (a aba não lê de novo à toa).
    const count = h.readings.length
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(h.readings.length).toBe(count)
    expect(h.last()?.values[0]?.text).toBe(frozen)
    h.send('step')
    await until(() => h.last()?.frame === 43)
    expect(h.last()?.paused).toBe(true)
    expect(h.last()?.values[0]?.text).not.toBe(frozen)
    h.send('resume')
    await until(() => h.last()?.paused === false)
    expect(h.pauses).toEqual([false, true, false])
    h.stop()
    expect(h.hasSender()).toBe(false)
  })

  it('o quadro de antes da pausa recusa: a aba diz que não pausa e não registra os botões', async () => {
    const h = harness({ knowsPause: false })
    await until(() => h.readings.length > 0)
    expect(h.last()).toMatchObject({ paused: false, canPause: false })
    expect(h.hasSender()).toBe(false)
    h.stop()
  })

  it('a pausa que não segura quadro nenhum no prazo é desfeita: o programa continua', async () => {
    const h = harness({ holds: false })
    await until(() => h.readings.length > 0)
    h.send('pause')
    await until(() => h.pauses.length === 3)
    expect(h.pauses).toEqual([false, true, false])
    expect(h.last()?.paused).toBe(false)
    h.stop()
  })

  it('o programa sem tela, terminado: uma leitura só, sem pausa nem pergunta ao quadro', async () => {
    const readings: InvestigationReading[] = []
    let asked = false
    const stop = runPythonInvestigation({
      controller: {
        async observe() {
          return { observation: { type: 'value', observed: { found: true, value: 'fim' } } }
        },
        async pause() {
          asked = true
          return null
        },
        async step() {
          asked = true
          return null
        },
      },
      names: ['estado'],
      draws: false,
      completed: true,
      receive: (reading) => readings.push(reading),
      setSender: () => {
        asked = true
      },
      intervalMs: 5,
    })
    await until(() => readings.length === 1)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(readings).toHaveLength(1)
    expect(readings[0]).toMatchObject({
      canPause: false,
      values: [{ name: 'estado', text: "'fim'" }],
    })
    expect(asked).toBe(false)
    stop()
  })
})
