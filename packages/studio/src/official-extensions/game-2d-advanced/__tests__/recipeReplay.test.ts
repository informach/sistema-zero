import { afterEach, beforeEach, describe, expect, it } from 'bun:test'
import { createCampaignStage } from '../campaignSchema'
import { installCanvasSpy, loadRuntime, startGame } from './kitHarness'

let restoreCanvas: (() => void) | undefined

beforeEach(() => {
  document.body.innerHTML = ''
  restoreCanvas = installCanvasSpy().restore
})

afterEach(() => {
  restoreCanvas?.()
  restoreCanvas = undefined
  document.body.innerHTML = ''
})

describe('repetição iniciada pela regra do próprio jogo', () => {
  it('aceita a gravação começada dentro de A cada passo, sem checksum de tick zero', async () => {
    const h = loadRuntime()
    h.api.setup({ width: 768, height: 384 })
    h.api.enableFixedSimulation({ hz: 60, seed: 42, maxCatchUpSteps: 5 })
    h.api.defineCampaign({ id: 'gravacao-no-callback', version: 1, firstStage: 'fase-1', seed: 42 })
    h.api.defineCampaignStage(createCampaignStage())
    h.api.startCampaign('fase-1')
    let started = false
    h.api.onFixedUpdate(() => {
      if (!started) {
        started = true
        h.api.startReplayRecording()
      }
    })
    await startGame(h)
    h.api.setState('jogando')
    h.nextFrame(0)
    for (let frame = 1; frame <= 65; frame++) h.nextFrame((frame * 1000) / 60)
    const recording = h.api.stopReplayRecording()
    expect(started).toBe(true)
    expect(recording?.ticks).toBeGreaterThan(0)
    expect(recording?.checksums.every((entry) => entry.tick > 0)).toBe(true)
    expect(recording?.checksums.map((entry) => entry.tick)).toEqual([60])
    if (!recording) throw new Error('O jogo não produziu uma gravação')
    const hero = h.api.campaignHero()
    if (!hero) throw new Error('Herói ausente da gravação')
    const expectedHero = { x: hero.x, y: hero.y, vx: hero.vx, vy: hero.vy }
    const expectedProgress = structuredClone(h.api.campaignProgress())
    expect(h.api.playReplay(recording)).toBe(true)
    expect(h.api.replayActive()).toBe(true)
    for (let frame = 1; frame <= recording.ticks; frame++) {
      h.nextFrame(((65 + frame) * 1000) / 60)
    }
    const replayedHero = h.api.campaignHero()
    expect({
      x: replayedHero?.x,
      y: replayedHero?.y,
      vx: replayedHero?.vx,
      vy: replayedHero?.vy,
    }).toEqual(expectedHero)
    expect(h.api.campaignProgress()).toEqual(expectedProgress)
    expect(h.api.replayActive()).toBe(true)
  })
})
