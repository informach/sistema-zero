import { afterEach, describe, expect, it } from 'bun:test'
import {
  armRunTripwire,
  disarmRunTripwire,
  forgetInterruptedRuns,
  RUN_TRIPWIRE_REFRESH_MS,
  RUN_TRIPWIRE_STALE_MS,
  wasRunInterrupted,
} from './runTripwire'

// Achado E6 da revisão de 20/11: a marca de execução interrompida não tinha dono por aba.
const PROJECT = 'projeto-01'
const otherTab = (at: number) =>
  window.localStorage.setItem(`sz:run-tripwire:${PROJECT}#outra-aba`, JSON.stringify({ at }))
const marks = () =>
  Object.keys(window.localStorage).filter((key) => key.startsWith(`sz:run-tripwire:${PROJECT}`))

afterEach(() => {
  disarmRunTripwire(PROJECT)
  window.localStorage.clear()
})

describe('marca de execução da prévia, por aba', () => {
  it('a marca renovada de outra aba viva não conta como interrupção', () => {
    otherTab(Date.now())
    expect(wasRunInterrupted(PROJECT)).toBe(false)
  })

  it('a marca parada de outra aba (congelou ou caiu) conta', () => {
    otherTab(Date.now() - RUN_TRIPWIRE_STALE_MS - 1)
    expect(wasRunInterrupted(PROJECT)).toBe(true)
  })

  it('a marca no formato de antes (sem dono) e a ilegível contam', () => {
    window.localStorage.setItem(`sz:run-tripwire:${PROJECT}`, String(Date.now()))
    expect(wasRunInterrupted(PROJECT)).toBe(true)
    window.localStorage.clear()
    window.localStorage.setItem(`sz:run-tripwire:${PROJECT}#outra-aba`, 'não é json')
    expect(wasRunInterrupted(PROJECT)).toBe(true)
  })

  it('a própria marca desta aba não trava esta aba, e desarmar tira só a dela', () => {
    otherTab(Date.now())
    armRunTripwire(PROJECT)
    expect(marks()).toHaveLength(2)
    expect(wasRunInterrupted(PROJECT)).toBe(false)
    disarmRunTripwire(PROJECT)
    expect(marks()).toEqual([`sz:run-tripwire:${PROJECT}#outra-aba`])
  })

  it('rodar esquece as marcas paradas e guarda a da outra aba viva', () => {
    window.localStorage.setItem(`sz:run-tripwire:${PROJECT}`, '1')
    window.localStorage.setItem(
      `sz:run-tripwire:${PROJECT}#aba-que-caiu`,
      JSON.stringify({ at: Date.now() - RUN_TRIPWIRE_STALE_MS - 1 }),
    )
    otherTab(Date.now())
    armRunTripwire(PROJECT)
    // Fica a da outra aba viva e a desta; somem a sem dono e a da aba que caiu.
    expect(marks()).toHaveLength(2)
    expect(marks()).toContain(`sz:run-tripwire:${PROJECT}#outra-aba`)
    expect(marks()).not.toContain(`sz:run-tripwire:${PROJECT}`)
    expect(marks()).not.toContain(`sz:run-tripwire:${PROJECT}#aba-que-caiu`)
    expect(wasRunInterrupted(PROJECT)).toBe(false)
  })

  it('forgetInterruptedRuns tira só o que está parado', () => {
    window.localStorage.setItem(`sz:run-tripwire:${PROJECT}`, '1')
    otherTab(Date.now())
    forgetInterruptedRuns(PROJECT)
    expect(marks()).toEqual([`sz:run-tripwire:${PROJECT}#outra-aba`])
  })

  it('a aba renova a própria marca enquanto o jogo roda', async () => {
    armRunTripwire(PROJECT)
    const key = marks()[0] as string
    const first = (JSON.parse(window.localStorage.getItem(key) ?? '{}') as { at: number }).at
    await Bun.sleep(RUN_TRIPWIRE_REFRESH_MS + 150)
    const later = (JSON.parse(window.localStorage.getItem(key) ?? '{}') as { at: number }).at
    expect(later).toBeGreaterThan(first)
  })
})
