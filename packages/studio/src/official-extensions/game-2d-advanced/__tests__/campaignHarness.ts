import type { GameKitAction, GameKitCampaignStage } from '../runtimeContract'
import {
  type CanvasSpy,
  type Harness,
  installCanvasSpy,
  loadRuntime,
  startGame,
} from './kitHarness'

/**
 * Harness que JOGA a campanha da gk, quadro a quadro.
 *
 * Nasceu porque o Reino Zero Pro — 32 fases, o carro-chefe da extensão — não
 * tinha UM teste que jogasse: o `reinoZeroProExample.test.ts` é estático, o
 * `proCampaign.test.ts` roda quadros num quarto sintético 16×8 que só empresta o
 * id `'reino-zero-pro'`, e o e2e atravessa as fases por TELEPORTE
 * (`api.placeCharacter`). É a mesma raiz que o irmão g2d pagou em 12/08: os
 * testes asseriam que a bala NASCEU, nunca que ela ACERTOU.
 *
 * ⚠️ As ações entram pelo caminho REAL: tecla → `keys` → `sampleProfessionalActions`
 * → `proActionDown`. Escrever em `proActionDown` direto deixaria o teste cego
 * para uma regressão de binding, que é exatamente o defeito que o g2d pagou com
 * o pad de toque em 13/08.
 *
 * ⚠️ O `ctx` é um ESPIÃO de geometria e texto: ele prova posição, ordem,
 * contagem e o que o HUD escreveu — nunca cor, alfa, camada ou pisca. Para isso
 * é preciso `getImageData` num Chrome de verdade (e é o que o e2e cobre).
 */

/** A tecla que o `proBindings` de fábrica associa a cada ação. */
const ACTION_KEY: Readonly<Record<GameKitAction, string>> = {
  esquerda: 'ArrowLeft',
  direita: 'ArrowRight',
  cima: 'ArrowUp',
  baixo: 'ArrowDown',
  // ⚠️ 'x' e não ' ': o espaço é pular E confirmar, e um teste de pulo não pode
  // disparar o confirmar do menu sem querer.
  pular: 'x',
  correr: 'z',
  agir: 'e',
  pausar: 'Escape',
  confirmar: 'Enter',
  voltar: 'Backspace',
}

export interface EntitySnapshot {
  kind: string
  id: string
  x: number
  y: number
  w: number
  h: number
  vx: number
  vy: number
  active: boolean
  /** Só quem ANDA no chão mantém isto: voador e chefe escrevem o próprio y. */
  onGround: boolean
  phase: number
  health: number
  direction: number
  variant: string
}

export interface CampaignSnapshot {
  stageId: string
  world: number
  order: number
  theme: string
  width: number
  height: number
  tiles: string[]
  hero: {
    x: number
    y: number
    vx: number
    vy: number
    w: number
    h: number
    onGround: boolean
    form: string
  } | null
  entities: EntitySnapshot[]
  progress: {
    players: Array<{ lives: number; score: number; form: string }>
    coins: number
    gems: string[]
    activePlayer: number
  }
  transitioning: boolean
}

export interface CampaignEventLog {
  name: string
  payload: Record<string, unknown>
}

export interface CampaignRun {
  api: Harness['api']
  spy: CanvasSpy
  /** O estado da campanha AGORA. */
  snap: () => CampaignSnapshot
  /** Uma entidade por id. Lança se ela sumiu — o teste não pode medir `undefined`. */
  entity: (id: string) => EntitySnapshot
  /** As vidas do jogador da vez: a régua mais direta de "levou dano". */
  lives: () => number
  hold: (action: GameKitAction) => void
  release: (action: GameKitAction) => void
  /** Bombeia quadros até o relógio FIXO andar `n` passos. 60 passos = 1 segundo. */
  run: (ticks: number) => void
  /** Segura a ação por `ticks` passos e solta. */
  tap: (action: GameKitAction, ticks?: number) => void
  /** Corre até a condição virar true. Devolve os ticks gastos; lança se estourar. */
  until: (why: string, ready: () => boolean, limit?: number) => number
  events: CampaignEventLog[]
  avisos: string[]
  dispose: () => void
}

/** Um passo do relógio fixo. 1000/60, e não 17: 17 dá passo duplo de vez em quando. */
const STEP_MS = 1000 / 60

/** Os avisos que este harness escuta. `proSafeId` recusa nome com acento. */
const EVENTOS = ['coleta', 'guardiao', 'fase', 'saida-bloqueada', 'vitoria'] as const

export interface CampaignBoot {
  /** Roda com a API já viva e os ouvintes já ligados: define e começa a aventura. */
  build: (api: Harness['api']) => void
  width?: number
  height?: number
}

export async function playCampaign(boot: CampaignBoot): Promise<CampaignRun> {
  const spy = installCanvasSpy()
  const inspectors: Record<string, () => unknown> = {}
  const avisos: string[] = []
  const store = new Map<string, string>()
  const h = loadRuntime({
    __SZSTUDIO_RUNTIME_INSPECTORS: inspectors,
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
    },
    console: {
      warn: (m: unknown) => void avisos.push(String(m)),
      error: (m: unknown) => void avisos.push(String(m)),
      log: () => {},
    },
  })

  h.api.setup({ width: boot.width ?? 400, height: boot.height ?? 300 })
  await startGame(h)

  // Os ouvintes entram ANTES do build: o 'fase' da primeira carga é disparado
  // lá dentro, por `startCampaign`, e sem isto ele passaria em branco.
  const events: CampaignEventLog[] = []
  for (const nome of EVENTOS) {
    h.api.onCampaignEvent(nome, (payload: unknown) => {
      events.push({ name: nome, payload: (payload ?? {}) as Record<string, unknown> })
    })
  }

  boot.build(h.api)
  // ⚠️ `stepCampaign` só roda em 'jogando' (campaign.ts). Sem isto o harness
  // bombearia quadros com o jogo parado e todo teste passaria por vácuo.
  h.api.setState('jogando')

  const inspect = inspectors['game-2d-advanced:campaign']
  if (typeof inspect !== 'function') throw new Error('o inspetor da campanha não registrou')
  const snap = (): CampaignSnapshot => inspect() as CampaignSnapshot

  let clock = 0
  const run = (ticks: number): void => {
    const alvo = h.api.fixedTick() + ticks
    // Folga: um quadro pode rodar zero passos enquanto o acumulador não fecha.
    let guarda = ticks * 4 + 240
    while (h.api.fixedTick() < alvo && guarda-- > 0) {
      clock += STEP_MS
      h.nextFrame(clock)
    }
    if (h.api.fixedTick() < alvo) throw new Error(`o relógio fixo travou antes de ${alvo}`)
  }

  const key = (action: GameKitAction): string => ACTION_KEY[action]
  const press = (action: GameKitAction): void =>
    h.fire('keydown', { key: key(action), repeat: false, preventDefault() {} })
  const lift = (action: GameKitAction): void =>
    h.fire('keyup', { key: key(action), preventDefault() {} })

  return {
    api: h.api,
    spy,
    snap,
    entity: (id) => {
      const achado = snap().entities.find((e) => e.id === id)
      if (!achado) throw new Error(`a entidade "${id}" não está no palco`)
      return achado
    },
    lives: () => {
      const p = snap().progress
      return p.players[p.activePlayer - 1]?.lives ?? -1
    },
    hold: press,
    release: lift,
    run,
    tap: (action, ticks = 2) => {
      press(action)
      run(ticks)
      lift(action)
    },
    until: (why, ready, limit = 600) => {
      for (let i = 0; i < limit; i += 1) {
        if (ready()) return i
        run(1)
      }
      throw new Error(`esperei ${limit} passos e ${why} não aconteceu`)
    },
    events,
    avisos,
    dispose: () => spy.restore(),
  }
}

/**
 * Uma fase SINTÉTICA de teste: chão corrido na última linha, o resto vazio.
 *
 * As fases reais entram nos testes de geometria; aqui o cenário é mínimo de
 * propósito, para o que falhar apontar o MOTOR e não a planta.
 */
export function chaoCorrido(
  largura: number,
  altura: number,
  extras: ReadonlyArray<{ row: number; col: number; tile: string }> = [],
): string[] {
  const linhas: string[][] = []
  for (let r = 0; r < altura; r += 1) {
    linhas.push(Array.from({ length: largura }, () => (r === altura - 1 ? '#' : '.')))
  }
  for (const { row, col, tile } of extras) {
    const linha = linhas[row]
    if (linha && col >= 0 && col < largura) linha[col] = tile
  }
  return linhas.map((l) => l.join(''))
}

/** Monta uma fase válida sem repetir os oito campos obrigatórios em cada teste. */
export function faseDeTeste(
  tiles: string[],
  entities: GameKitCampaignStage['entities'],
  overrides: Partial<GameKitCampaignStage> = {},
): GameKitCampaignStage {
  return {
    schemaVersion: 1,
    id: '1-1',
    world: 1,
    order: 1,
    theme: 'campo',
    width: (tiles[0] ?? '').length,
    height: tiles.length,
    tiles,
    entities,
    triggers: [],
    timeLimit: 0,
    ...overrides,
  }
}
