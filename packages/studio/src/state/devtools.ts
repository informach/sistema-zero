import { createStore, type StoreApi } from 'zustand/vanilla'

/**
 * As janelas das abas Desempenho e Investigar (proposta aprovada em 20/11/2026,
 * `docs/estudio-evolucao/paineis-proposta.md`). Só a ponte (`preview/devtoolsBridge.ts`) e os
 * painéis importam este módulo, todos baixados quando a criança liga uma das abas: no pacote de
 * abertura do modo Blocos ficam só as chaves `measuring` e `investigating` da store da interface.
 *
 * Uma janela por instância do Estúdio; a chave é a store da interface dessa instância.
 */

/** Uma fatia de meio segundo, como o jogo mediu. */
export interface PerfSlice {
  /** Quadros por segundo nesta fatia. */
  fps: number
  frameMsAvg: number
  frameMsMax: number
  /** Sprites desenhados no último quadro, quando o motor conta. */
  sprites: number | null
  /** Os 3D: objetos ligados na cena e desenhos do último quadro. */
  objects: number | null
  draws: number | null
  /** A página tem um `<canvas>`; sem ele, não há quadros de jogo para medir. */
  canvas: boolean
}

/** 60 fatias de meio segundo: os últimos 30 segundos. */
export const PERF_HISTORY_SLICES = 60

export interface PerfWindow {
  /** Quando a medida começou (relógio da página do editor). */
  since: number
  slices: readonly PerfSlice[]
  push(slice: PerfSlice): void
  /** O jogo recomeçou (Rodar de novo, edição): as fatias antigas eram de outro jogo. */
  clear(): void
  /**
   * O ambiente recusou a medida (no Python, um quadro publicado antes da medida existir): a aba
   * diz que ainda não dá para medir, em vez de esperar números que não vêm.
   */
  refused: boolean
  refuse(): void
}

const windows = new WeakMap<object, StoreApi<PerfWindow>>()

export function createPerfWindow(now = Date.now()): StoreApi<PerfWindow> {
  return createStore<PerfWindow>((set, get) => ({
    since: now,
    slices: [],
    push: (slice) => {
      const slices = [...get().slices, slice]
      set({
        slices: slices.length > PERF_HISTORY_SLICES ? slices.slice(-PERF_HISTORY_SLICES) : slices,
      })
    },
    clear: () => set({ slices: [], refused: false }),
    refused: false,
    refuse: () => set({ refused: true }),
  }))
}

/** A janela da instância; a primeira leitura depois de `forgetPerfWindow` começa uma nova. */
export function perfWindowFor(instance: object): StoreApi<PerfWindow> {
  let window = windows.get(instance)
  if (!window) {
    window = createPerfWindow()
    windows.set(instance, window)
  }
  return window
}

/** A medida desligou (ou vai recomeçar): a próxima janela começa do zero. */
export function forgetPerfWindow(instance: object): void {
  windows.delete(instance)
}

/** Um valor do jogo na aba Investigar. `changed`: diferente da leitura anterior. */
export interface InvestigationValue {
  name: string
  text: string
  changed: boolean
}

/** O que a ponte manda (o mesmo formato de `DevtoolsStateMessage`, sem o tipo e o documento). */
export interface InvestigationReading {
  frame: number | null
  paused: boolean
  canPause: boolean
  pauseLater: boolean
  values: readonly { name: string; text: string }[]
  error: { lines: readonly number[] } | null
}

export interface InvestigationWindow {
  /** `false` até a primeira leitura do jogo. */
  ready: boolean
  frame: number | null
  paused: boolean
  canPause: boolean
  /** O motor pausa, só que não agora (ver `DevtoolsStateMessage.pauseLater`). */
  pauseLater: boolean
  values: readonly InvestigationValue[]
  /** O jogo parou com erro: o quadro, as linhas do caminho e os valores daquele momento. */
  stopped: {
    frame: number | null
    lines: readonly number[]
    values: readonly InvestigationValue[]
  } | null
  receive(reading: InvestigationReading): void
  clear(): void
}

const EMPTY_INVESTIGATION = {
  ready: false,
  frame: null,
  paused: false,
  canPause: false,
  pauseLater: false,
  values: [],
  stopped: null,
} as const

export function createInvestigationWindow(): StoreApi<InvestigationWindow> {
  return createStore<InvestigationWindow>((set, get) => ({
    ...EMPTY_INVESTIGATION,
    receive: (reading) => {
      const before = new Map(get().values.map((value) => [value.name, value.text]))
      const values = reading.values.map((value) => ({
        name: value.name,
        text: value.text,
        changed: before.has(value.name) && before.get(value.name) !== value.text,
      }))
      set({
        ready: true,
        frame: reading.frame,
        paused: reading.paused,
        canPause: reading.canPause,
        pauseLater: reading.pauseLater,
        values,
        // O PRIMEIRO erro manda (num laço de jogo o mesmo erro repete a cada quadro).
        stopped:
          get().stopped ??
          (reading.error
            ? { frame: reading.frame, lines: [...reading.error.lines], values }
            : null),
      })
    },
    clear: () => set({ ...EMPTY_INVESTIGATION }),
  }))
}

const investigations = new WeakMap<object, StoreApi<InvestigationWindow>>()

export function investigationWindowFor(instance: object): StoreApi<InvestigationWindow> {
  let window = investigations.get(instance)
  if (!window) {
    window = createInvestigationWindow()
    investigations.set(instance, window)
  }
  return window
}

export function forgetInvestigationWindow(instance: object): void {
  investigations.delete(instance)
}

/** Quem manda um comando ao jogo da prévia desta instância (a prévia registra, o painel chama). */
const senders = new WeakMap<object, (cmd: 'pause' | 'resume' | 'step' | 'look') => void>()

export function setDevtoolsSender(
  instance: object,
  sender: ((cmd: 'pause' | 'resume' | 'step' | 'look') => void) | null,
): void {
  if (sender) senders.set(instance, sender)
  else senders.delete(instance)
}

export function sendDevtoolsCommand(
  instance: object,
  cmd: 'pause' | 'resume' | 'step' | 'look',
): boolean {
  const sender = senders.get(instance)
  if (!sender) return false
  sender(cmd)
  return true
}

/**
 * O tempo do programa Python sem tela (só print e input), que a aba Desempenho mostra no lugar dos
 * quadros (proposta aprovada: "Python sem biblioteca de jogo: o tempo que o programa levou"). A
 * prévia Python marca o começo e o fim de cada execução; uma por instância do Estúdio.
 */
export interface ProgramTime {
  /**
   * O projeto Python desenha numa tela (Turtle, Pygame Zero, pygame-ce, Raylib)? `null` fora do
   * Python. Quem decide é a prévia Python (o painel não carrega nada do Python).
   */
  canvas: boolean | null
  /** Quando a execução da vez começou a rodar (relógio da página do editor). */
  startedAt: number | null
  /** Quando ela terminou (completou, parou com erro ou foi parada); `null` enquanto roda. */
  endedAt: number | null
}

const programTimes = new WeakMap<object, StoreApi<ProgramTime>>()

export function programTimeFor(instance: object): StoreApi<ProgramTime> {
  let time = programTimes.get(instance)
  if (!time) {
    time = createStore<ProgramTime>(() => ({ canvas: null, startedAt: null, endedAt: null }))
    programTimes.set(instance, time)
  }
  return time
}
