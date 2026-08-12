import { beforeEach, describe, expect, it } from 'bun:test'
import type { GameKitCampaignStage } from '../runtimeContract'
import { loadRuntime, startPlaying } from './kitHarness'

beforeEach(() => {
  document.body.innerHTML = ''
  localStorage.clear()
})

function stage(id = '1-1'): GameKitCampaignStage {
  return {
    schemaVersion: 1,
    id,
    world: 1,
    order: 1,
    theme: 'campo',
    width: 16,
    height: 8,
    tiles: [
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '................',
      '################',
    ],
    entities: [
      { kind: 'hero', id: 'inicio', x: 2, y: 6 },
      { kind: 'coin', id: 'moeda-1', x: 5, y: 5 },
      { kind: 'exit', id: 'saida', x: 14, y: 6 },
    ],
    triggers: [],
    timeLimit: 300,
  }
}

function pointerEvent(type: string, pointerId: number): Event {
  const event = new Event(type, { bubbles: true, cancelable: true })
  Object.defineProperty(event, 'pointerId', { value: pointerId })
  return event
}

describe('SZGameKit — jogo suave determinístico', () => {
  it('executa passos fixos a 60 Hz e limita a recuperação a cinco passos', async () => {
    const h = loadRuntime({ localStorage, navigator })
    h.api.enableFixedSimulation({ hz: 60, seed: 123, maxCatchUpSteps: 5 })
    let calls = 0
    h.api.onFixedUpdate((dt, tick) => {
      expect(dt).toBeCloseTo(1 / 60, 8)
      expect(tick).toBe(calls + 1)
      calls += 1
    })

    await startPlaying(h, 256, 240)
    h.nextFrame(100)

    expect(calls).toBe(5)
    expect(h.api.fixedTick()).toBe(5)
    expect(h.api.simulationStats()).toMatchObject({
      enabled: true,
      hz: 60,
      tick: 5,
      lastFrameSteps: 5,
    })
    expect(h.api.simulationStats().droppedSeconds).toBeGreaterThan(0)
  })

  it('transforma teclado em ações semânticas com bordas de apertar e soltar', async () => {
    const h = loadRuntime({ localStorage, navigator })
    h.api.enableFixedSimulation({ seed: 9 })
    expect(h.api.bindAction('pular', 'x,Space', 0)).toBe(true)
    await startPlaying(h, 256, 240)

    h.fire('keydown', { key: 'x', repeat: false, preventDefault() {} })
    h.nextFrame(17)
    expect(h.api.actionDown('pular')).toBe(true)
    expect(h.api.actionPressed('pular')).toBe(true)
    expect(h.api.activeInputDevice()).toBe('teclado')

    h.nextFrame(34)
    expect(h.api.actionPressed('pular')).toBe(false)
    h.fire('keyup', { key: 'x', preventDefault() {} })
    h.nextFrame(51)
    expect(h.api.actionReleased('pular')).toBe(true)
  })

  it('mantém todos os controles de toque ancorados no palco visível', async () => {
    const h = loadRuntime({
      localStorage,
      navigator,
      innerWidth: 390,
      innerHeight: 844,
      matchMedia: () => ({ matches: true }),
    })
    h.api.enableFixedSimulation({ seed: 9 })
    await startPlaying(h, 1280, 720)

    const overlay = document.getElementById('szgk-touch-controls')
    const actions = Array.from(
      overlay?.querySelectorAll<HTMLButtonElement>('[data-sz-gk-action]') ?? [],
      (control) => control.dataset.szGkAction,
    )

    expect(overlay?.getAttribute('role')).toBe('group')
    expect(actions).toEqual([
      'esquerda',
      'direita',
      'cima',
      'baixo',
      'pular',
      'correr',
      'agir',
      'confirmar',
      'voltar',
      'pausar',
    ])
    expect(
      overlay?.querySelector('[data-sz-gk-cluster="actions"]')?.getAttribute('style'),
    ).toContain('right:')
    expect(overlay?.innerHTML).not.toMatch(/left:\s*1\d{3}px/)
  })

  it('preserva toques simultâneos e solta ações quando perde a captura', async () => {
    const h = loadRuntime({
      localStorage,
      navigator,
      matchMedia: () => ({ matches: true }),
    })
    h.api.enableFixedSimulation({ seed: 9 })
    await startPlaying(h, 1280, 720)

    const left = document.querySelector<HTMLButtonElement>('[data-sz-gk-action="esquerda"]')
    const jump = document.querySelector<HTMLButtonElement>('[data-sz-gk-action="pular"]')
    if (!left || !jump) throw new Error('os controles de toque não foram montados')

    left.dispatchEvent(pointerEvent('pointerdown', 11))
    jump.dispatchEvent(pointerEvent('pointerdown', 12))
    h.nextFrame(17)
    expect(h.api.actionDown('esquerda')).toBe(true)
    expect(h.api.actionDown('pular')).toBe(true)

    left.dispatchEvent(pointerEvent('lostpointercapture', 11))
    jump.dispatchEvent(pointerEvent('pointercancel', 12))
    h.nextFrame(34)
    expect(h.api.actionReleased('esquerda')).toBe(true)
    expect(h.api.actionReleased('pular')).toBe(true)
  })

  it('chega ao mesmo estado com calendários de renderização de 30, 60 e 144 Hz', async () => {
    async function runAt(hz: number): Promise<string> {
      const h = loadRuntime({ localStorage, navigator })
      h.api.enableFixedSimulation({ seed: 4242 })
      h.api.defineCampaign({ id: 'reino-zero-pro', version: 1, firstStage: '1-1', seed: 4242 })
      h.api.defineCampaignStage(stage())
      h.api.startCampaign()
      await startPlaying(h, 256, 240)

      const frameMs = 1000 / hz
      let timestamp = 0
      while (h.api.fixedTick() < 120) {
        timestamp += frameMs
        h.nextFrame(timestamp)
      }
      expect(h.api.fixedTick()).toBe(120)
      return h.api.replayHash()
    }

    const hashes = [await runAt(30), await runAt(60), await runAt(144)]
    expect(new Set(hashes).size).toBe(1)
  })
})

describe('SZGameKit — campanha validada, saves e replay', () => {
  it('não recria nem reemite uma gema coletada ao recarregar a fase', async () => {
    const h = loadRuntime({ localStorage, navigator })
    const collectible = stage()
    collectible.entities = [
      { kind: 'hero', id: 'inicio', x: 2, y: 6 },
      { kind: 'gem', id: 'gema', x: 2, y: 6 },
    ]
    let collections = 0
    h.api.defineCampaign({
      id: 'persistencia',
      version: 1,
      firstStage: '1-1',
      seed: 12,
      requiredGems: 1,
    })
    h.api.defineCampaignStage(collectible)
    h.api.onCampaignEvent('coleta', () => {
      collections += 1
    })
    h.api.startCampaign()
    await startPlaying(h, 256, 240)

    h.nextFrame(17)
    expect(collections).toBe(1)
    expect(h.api.campaignProgress().gems).toHaveLength(1)

    h.api.startCampaign('1-1')
    h.nextFrame(34)
    expect(collections).toBe(1)
    expect(h.api.campaignProgress().gems).toHaveLength(1)

    expect(h.api.saveCampaign(1)).toBe(true)
    expect(h.api.loadCampaign(1)).toBe(true)
    h.nextFrame(51)
    expect(collections).toBe(1)

    h.api.startReplayRecording()
    h.nextFrame(68)
    const replay = h.api.stopReplayRecording()
    if (!replay) throw new Error('a gravação precisa existir')
    expect(h.api.playReplay(replay)).toBe(true)
    h.nextFrame(85)
    expect(collections).toBe(1)
  })

  it('separa a identidade da mesma gema em fases diferentes', async () => {
    const h = loadRuntime({ localStorage, navigator })
    const first = stage()
    first.entities = [
      { kind: 'hero', id: 'inicio', x: 2, y: 6 },
      { kind: 'gem', id: 'gema', x: 2, y: 6 },
    ]
    const second = stage('1-2')
    second.order = 2
    second.entities = [
      { kind: 'hero', id: 'inicio', x: 2, y: 6 },
      { kind: 'gem', id: 'gema', x: 2, y: 6 },
    ]
    h.api.defineCampaign({
      id: 'identidade-por-fase',
      version: 1,
      firstStage: '1-1',
      seed: 12,
      requiredGems: 2,
    })
    h.api.defineCampaignStage(first)
    h.api.defineCampaignStage(second)
    h.api.startCampaign()
    await startPlaying(h, 256, 240)

    h.nextFrame(17)
    h.api.startCampaign('1-2')
    h.nextFrame(34)

    expect(h.api.campaignProgress().gems).toHaveLength(2)
    expect(new Set(h.api.campaignProgress().gems).size).toBe(2)
  })

  it('usa a quantidade de gemas declarada pela campanha para concluir', () => {
    const h = loadRuntime({ localStorage, navigator })
    let finish: unknown
    h.api.defineCampaign({
      id: 'sem-gemas-obrigatorias',
      version: 1,
      firstStage: '1-1',
      seed: 12,
      requiredGems: 0,
    })
    h.api.defineCampaignStage(stage())
    h.api.onCampaignEvent('fim', (payload) => {
      finish = payload
    })
    h.api.startCampaign()

    expect(h.api.nextStage()).toBe(true)
    expect(finish).toMatchObject({ complete: true, journey: 2 })
  })

  it('entrega eventos de região aos listeners e expõe o payload durante o callback', async () => {
    const h = loadRuntime({ localStorage, navigator })
    const region = stage()
    region.entities = [{ kind: 'hero', id: 'inicio', x: 2, y: 6 }]
    region.triggers = [
      { kind: 'porta-aberta', x: 2, y: 6, w: 1, h: 1, target: 'castelo', value: 7 },
    ]
    const received: Array<[unknown, unknown, unknown]> = []
    h.api.defineCampaign({ id: 'eventos', version: 1, firstStage: '1-1', seed: 12 })
    h.api.defineCampaignStage(region)
    h.api.onCampaignEvent('porta-aberta', () => {
      received.push([
        h.api.campaignEventValue('event'),
        h.api.campaignEventValue('target'),
        h.api.campaignEventValue('value'),
      ])
    })
    h.api.startCampaign()
    await startPlaying(h, 256, 240)

    h.nextFrame(17)

    expect(received).toEqual([['porta-aberta', 'castelo', 7]])
    expect(h.api.campaignEventValue('event')).toBe('')
  })

  it('faz a transição de fase no relógio fixo, sem trocar no meio do passo', async () => {
    const h = loadRuntime({ localStorage, navigator })
    const first = stage()
    first.nextStage = '1-2'
    first.entities = [
      { kind: 'hero', id: 'inicio', x: 2, y: 6 },
      { kind: 'exit', id: 'saida', x: 2, y: 6 },
    ]
    const second = stage('1-2')
    second.order = 2
    h.api.defineCampaign({ id: 'transicao', version: 1, firstStage: '1-1', seed: 12 })
    h.api.defineCampaignStage(first)
    h.api.defineCampaignStage(second)
    h.api.startCampaign()
    await startPlaying(h, 256, 240)

    h.nextFrame(17)
    expect(h.api.currentStage()).toBe('1-1')
    for (let frame = 2; frame <= 13; frame += 1) h.nextFrame(frame * 17)
    expect(h.api.currentStage()).toBe('1-2')
    expect(h.api.campaignSaveInfo(1).stageId).toBe('1-2')
  })

  it('mantém a saída do guardião bloqueada enquanto o chefe está vivo', async () => {
    const h = loadRuntime({ localStorage, navigator })
    const guarded = stage()
    guarded.nextStage = '1-2'
    guarded.entities = [
      { kind: 'hero', id: 'inicio', x: 2, y: 6 },
      { kind: 'exit', id: 'saida', x: 2, y: 6, props: { requiresBoss: true } },
      { kind: 'boss', id: 'guardiao', x: 12, y: 5, props: { health: 3 } },
    ]
    const second = stage('1-2')
    h.api.defineCampaign({ id: 'guardiao', version: 1, firstStage: '1-1', seed: 12 })
    h.api.defineCampaignStage(guarded)
    h.api.defineCampaignStage(second)
    h.api.startCampaign()
    await startPlaying(h, 256, 240)

    for (let frame = 1; frame <= 20; frame += 1) h.nextFrame(frame * 17)
    expect(h.api.currentStage()).toBe('1-1')
  })

  it('rejeita uma fase inválida sem substituir a versão válida', () => {
    const h = loadRuntime({ localStorage, navigator })
    expect(
      h.api.defineCampaign({ id: 'reino-zero-pro', version: 1, firstStage: '1-1', seed: 42 }),
    ).toBe(true)
    expect(h.api.defineCampaignStage(stage())).toBe(true)

    const invalid = stage()
    invalid.tiles = Array.from({ length: 513 }, () => '#')
    invalid.height = 513
    expect(h.api.defineCampaignStage(invalid)).toBe(false)
    const invalidProps = stage('propriedades-invalidas')
    invalidProps.entities.push({
      kind: 'boss',
      id: 'guardiao-invalido',
      x: 8,
      y: 6,
      props: { health: 1 },
    })
    expect(h.api.defineCampaignStage(invalidProps)).toBe(false)
    expect(h.api.startCampaign()).toBe(true)
    expect(h.api.currentStage()).toBe('1-1')
    expect(h.api.currentWorld()).toBe(1)
  })

  it('isola corrupção por slot e restaura progresso compatível', () => {
    const h = loadRuntime({ localStorage, navigator })
    h.api.defineCampaign({ id: 'reino-zero-pro', version: 3, firstStage: '1-1', seed: 42 })
    h.api.defineCampaignStage(stage())
    h.api.startCampaign()
    h.api.setCampaignCheckpoint('meio', 8, 6)

    expect(h.api.saveCampaign(1)).toBe(true)
    expect(h.api.campaignSaveInfo(1)).toMatchObject({
      available: true,
      compatible: true,
      corrupted: false,
      stageId: '1-1',
    })
    localStorage.setItem('szgk-campaign:reino-zero-pro:slot:2', '{quebrado')
    expect(h.api.campaignSaveInfo(2)).toMatchObject({
      available: false,
      corrupted: true,
    })
    expect(h.api.loadCampaign(1)).toBe(true)
  })

  it('grava ações compactadas e reproduz somente replay compatível', async () => {
    const h = loadRuntime({ localStorage, navigator })
    h.api.enableFixedSimulation({ seed: 77 })
    h.api.defineCampaign({ id: 'reino-zero-pro', version: 2, firstStage: '1-1', seed: 77 })
    h.api.defineCampaignStage(stage())
    h.api.startCampaign()
    await startPlaying(h, 256, 240)

    h.api.startReplayRecording()
    h.fire('keydown', { key: 'ArrowRight', repeat: false, preventDefault() {} })
    h.nextFrame(17)
    h.nextFrame(34)
    h.fire('keyup', { key: 'ArrowRight', preventDefault() {} })
    h.nextFrame(51)
    const replay = h.api.stopReplayRecording()

    expect(replay?.ticks).toBe(3)
    expect(replay?.runs.length).toBe(2)
    expect(replay?.seed).toBe(77)
    if (!replay) throw new Error('o gravador não devolveu o replay')
    expect(h.api.playReplay(replay)).toBe(true)
    expect(h.api.replayActive()).toBe(true)

    const incompatible = { ...replay, campaignVersion: 99 }
    expect(h.api.playReplay(incompatible)).toBe(false)
    expect(h.api.playLastReplay()).toBe(true)
    expect(h.api.replayHash()).toMatch(/^[0-9a-f]{8}$/)
  })

  it('restaura o começo gravado e reproduz o mesmo hash após 60 passos', async () => {
    const h = loadRuntime({ localStorage, navigator })
    h.api.defineCampaign({ id: 'replay-real', version: 1, firstStage: '1-1', seed: 909 })
    h.api.defineCampaignStage(stage())
    h.api.startCampaign()
    await startPlaying(h, 256, 240)

    h.api.startReplayRecording()
    for (let frame = 1; frame <= 60; frame += 1) h.nextFrame(frame * 17)
    const expectedHash = h.api.replayHash()
    const replay = h.api.stopReplayRecording()
    if (!replay) throw new Error('o gravador não devolveu o replay')
    expect(replay.checksums).toHaveLength(1)
    expect(h.api.playReplay(replay)).toBe(true)

    for (let frame = 61; frame <= 120; frame += 1) h.nextFrame(frame * 17)
    expect(h.api.replayHash()).toBe(expectedHash)
    expect(h.api.replayActive()).toBe(true)
  })
})
