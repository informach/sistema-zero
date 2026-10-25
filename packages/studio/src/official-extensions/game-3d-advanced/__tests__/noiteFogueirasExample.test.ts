import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements, generateJS } from '#generators'
import { type BehaviorIR, behaviorStatements, type JSStatement } from '#ir'
import 'blockly/blocks'
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { isValidAssetDataUrl } from '../../../core/projectAssets'
import { parseJS } from '../../../parsers/js'
import { NOITE_FOGUEIRAS_SOURCE } from '../__gen_noiteFogueiras'
import { gameKit3DBlocks } from '../blocks'
import { gameKit3DExamples } from '../exampleCatalog'
import { noiteDasFogueirasExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { type KitApi, loadExampleKit } from './kitHarness'
import { collectTypes, stripIds } from './testUtils'

/**
 * "Noite das Fogueiras" (review 3D, cobertura total dos exemplos): drift contra o parser real,
 * round-trip pelos blocos, os três arquivos montados por código e a PARTIDA de verdade com
 * three real (a bancada do `playthrough.test.ts`).
 */

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
})

function bytesOf(dataUrl: string): Uint8Array {
  const binary = atob(dataUrl.slice(dataUrl.indexOf(',') + 1))
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i)
  return out
}

function asset(name: string) {
  const found = noiteDasFogueirasExample.assets?.find((item) => item.name === name)
  if (!found) throw new Error(`sem o asset ${name}`)
  return found
}

describe('Exemplo Noite das Fogueiras — drift e round-trip', () => {
  it('está no catálogo, depois do Herói do Molda, e parseJS(fonte) ≡ IR embutida', () => {
    const names = gameKit3DExamples.map((example) => example.name)
    expect(names[names.indexOf('Herói do Molda') + 1]).toBe('Noite das Fogueiras')
    const parsed = stripIds(parseExampleLifecycleSource(NOITE_FOGUEIRAS_SOURCE)) as JSStatement[]
    const types = collectTypes(parsed)
    expect(types.has('rawJS')).toBe(false)
    expect(types.has('memberCall')).toBe(false)
    expect(parsed).toEqual(
      stripIds(behaviorStatements(noiteDasFogueirasExample.ir)) as JSStatement[],
    )
  })

  it('fixpoint textual e IR → blocos → IR estável', () => {
    const ir = stripIds(behaviorStatements(noiteDasFogueirasExample.ir)) as JSStatement[]
    const code = compileStatements(ir, 0)
    expect(compileStatements(stripIds(parseJS(code)) as JSStatement[], 0)).toBe(code)
    const state = buildWorkspaceStateFromIR(
      noiteDasFogueirasExample.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
    )
    const ws = new Blockly.Workspace()
    try {
      Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
      expect(stripIds(behaviorStatements(buildIRFromWorkspace(ws)))).toEqual(
        stripIds(behaviorStatements(noiteDasFogueirasExample.ir)),
      )
    } finally {
      ws.dispose()
    }
  })

  it('usa os arquivos do projeto: céu de foto, música, som, jorro e ímã', () => {
    const types = collectTypes(behaviorStatements(noiteDasFogueirasExample.ir))
    for (const type of [
      'g3k:setSkyPhoto',
      'g3k:loadSound',
      'g3k:playMusic',
      'g3k:stopMusic',
      'g3k:playSound',
      'g3k:startEmitter',
      'g3k:stopEmitter',
      'g3k:addAttractor',
      'g3k:cameraLookAtPoint',
      'g3k:cameraDistance',
      'g3k:stateIs',
      'g3k:gameState',
      'g3k:returnToMenu',
      'g3k:lookAt',
      'g3k:passThrough',
      'g3k:hideSay',
      'g3k:worldSize',
    ])
      expect(types.has(type)).toBe(true)
    expect(JSON.stringify(noiteDasFogueirasExample.ir)).not.toContain('—')
    expect((noiteDasFogueirasExample.description ?? '').length).toBeLessThanOrEqual(200)
  })

  it('os três arquivos são válidos, pequenos e abrem de verdade', () => {
    const ceu = asset('ceu-estrelado')
    expect(ceu.kind).toBe('environment3d')
    expect(isValidAssetDataUrl(ceu.dataUrl, 'environment3d', ceu.originalFileName)).toBe(true)
    // O HDRLoader do three (o mesmo do preview) lê o RLE do Radiance: 64 × 32.
    const hdr = new HDRLoader().parse(bytesOf(ceu.dataUrl).buffer as ArrayBuffer) as {
      width: number
      height: number
    }
    expect([hdr.width, hdr.height]).toEqual([64, 32])
    for (const name of ['musica-da-noite', 'som-da-fogueira']) {
      const som = asset(name)
      expect(som.kind).toBe('audio')
      expect(isValidAssetDataUrl(som.dataUrl, 'audio')).toBe(true)
      const bytes = bytesOf(som.dataUrl)
      expect(String.fromCharCode(...bytes.slice(0, 4), ...bytes.slice(8, 12))).toBe('RIFFWAVE')
    }
    const total = (noiteDasFogueirasExample.assets ?? []).reduce(
      (sum, item) => sum + item.dataUrl.length,
      0,
    )
    expect(total).toBeLessThan(40_000)
  })
})

// ---------------------------------------------------------------- jogar de verdade

function jsDoExemplo(example: { ir: { behavior?: BehaviorIR } }): string {
  return generateJS({
    behavior: stripIds(example.ir.behavior as BehaviorIR),
    lifecycle: 'game-3d-advanced',
  })
}

function apertarBotao(stage: Element, screen: string, label?: string): void {
  const buttons = [
    ...stage.querySelectorAll(`[data-szg3k-screen="${screen}"] button`),
  ] as HTMLButtonElement[]
  const button = label ? buttons.find((b) => b.textContent === label) : buttons[0]
  if (!button) throw new Error(`sem botão "${label ?? ''}" na tela "${screen}"`)
  button.click()
}

function telaAtiva(stage: Element, screen: string): boolean {
  const el = stage.querySelector(`[data-szg3k-screen="${screen}"]`)
  return !!el && el.classList.contains('szg3k-active')
}

function vivos(api: KitApi, mold: string): unknown[] {
  const out: unknown[] = []
  api.forEachAlive(mold, (e) => out.push(e))
  return out
}

function visitar(api: KitApi, step: (n: number) => void, heroi: unknown, alvo: unknown) {
  api.place(heroi, api.posOf(alvo, 'x'), 1, api.posOf(alvo, 'z'))
  step(2)
  // Sai da zona: a próxima entrada conta de novo.
  api.place(heroi, 0, 1, 16)
  step(2)
}

/**
 * O happy-dom não decodifica áudio (o `canplaythrough` nunca chega e o motor esperaria o
 * prazo de 3 s na tela "carregando"). O dublê avisa que carregou e registra cada `play`, com
 * o `loop` e o arquivo: é assim que o teste vê a música e o som do fogo.
 */
const tocados: Array<{ src: string; loop: boolean }> = []
class FakeAudio {
  src = ''
  loop = false
  preload = ''
  currentTime = 0
  oncanplaythrough: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(src?: string) {
    if (src) this.src = src
    setTimeout(() => this.oncanplaythrough?.(), 0)
  }
  play() {
    tocados.push({ src: this.src, loop: this.loop })
    return Promise.resolve()
  }
  pause() {}
}

describe('Noite das Fogueiras — partida de verdade', () => {
  it('lenha, fantasma, quatro fogueiras, portal e o fim da noite guardado', async () => {
    const win = window as unknown as Record<string, unknown>
    const previous = win.__SZGAME_ASSETS_3D
    const previousSounds = win.__SZGAME_SOUNDS
    const previousAudio = win.Audio
    win.Audio = FakeAudio
    tocados.length = 0
    win.__SZGAME_ASSETS_3D = {
      'ceu-estrelado': {
        kind: 'environment3d',
        dataUrl: asset('ceu-estrelado').dataUrl,
        fileName: 'ceu-estrelado.hdr',
      },
    }
    win.__SZGAME_SOUNDS = {
      'musica-da-noite': asset('musica-da-noite').dataUrl,
      'som-da-fogueira': asset('som-da-fogueira').dataUrl,
    }
    try {
      const { api, step, stage } = await loadExampleKit(jsDoExemplo(noiteDasFogueirasExample))
      apertarBotao(stage, 'menu') // "Acampar"
      expect(api.state()).toBe('jogando')
      step(2)
      // A música da noite começa com a partida, em laço.
      const musica = asset('musica-da-noite').dataUrl
      expect(tocados.some((t) => t.src === musica && t.loop)).toBe(true)
      let heroi = vivos(api, 'heroi')[0]
      expect(vivos(api, 'fogueira')).toHaveLength(4)

      // A pausa abre a tela da coruja, e o "Continuar" dela volta ao jogo (não recomeça).
      api.setState('pausado')
      expect(telaAtiva(stage, 'dica')).toBe(true)
      apertarBotao(stage, 'dica', 'Continuar')
      expect(api.state()).toBe('jogando')
      expect(vivos(api, 'heroi')[0]).toBe(heroi)

      // Dois gravetos na mochila, e o fantasma leva tudo.
      for (const graveto of vivos(api, 'graveto').slice(0, 2)) visitar(api, step, heroi, graveto)
      expect(api.bagCount('graveto')).toBe(2)
      const fantasma = vivos(api, 'fantasma')[0]
      api.place(fantasma, api.posOf(heroi, 'x'), api.posOf(heroi, 'y'), api.posOf(heroi, 'z'))
      step(1)
      expect(api.bagCount('graveto')).toBe(0)
      // Ele reaparece na beirada do mundo (metade do "tamanho do mundo").
      expect(api.posOf(fantasma, 'z')).toBe(-20)

      // Fogueira sem lenha não acende.
      const fogueiras = vivos(api, 'fogueira')
      visitar(api, step, heroi, fogueiras[0])
      expect(api.stateOf(fogueiras[0])).toBe('parado')

      // Duas por fogueira: acende as quatro (o teste afasta os fantasmas a cada passo).
      for (const fogueira of fogueiras) {
        for (let i = 0; i < 2; i++) {
          for (const f of vivos(api, 'fantasma')) api.place(f, -18, 1, -18)
          const graveto = vivos(api, 'graveto')[0]
          visitar(api, step, heroi, graveto)
        }
        for (const f of vivos(api, 'fantasma')) api.place(f, -18, 1, -18)
        visitar(api, step, heroi, fogueira)
        expect(api.stateOf(fogueira)).toBe('acesa')
      }
      // Cada fogueira acesa tocou o som do fogo (sem laço).
      const fogo = asset('som-da-fogueira').dataUrl
      expect(tocados.filter((t) => t.src === fogo && !t.loop).length).toBe(4)
      // A 4ª abre o portal no meio.
      const portal = vivos(api, 'portal')[0]
      expect(portal).toBeDefined()
      api.place(heroi, 0, 1, 0)
      step(2)
      expect(api.state()).toBe('vitoria')
      expect(api.savedValue('comoAcabou', 'nada')).toBe('vitoria')

      // Partida nova: a coruja lembra da noite passada; "Voltar ao menu" da tela própria.
      apertarBotao(stage, 'vitoria')
      expect(api.state()).toBe('jogando')
      heroi = vivos(api, 'heroi')[0]
      expect(heroi).toBeDefined()
      // Perto da coruja, E abre a dica E PAUSA (é a tela da pausa): ler a dica com os
      // fantasmas andando fazia a criança perder a lenha. O "Continuar" volta a jogar.
      const coruja = vivos(api, 'coruja')[0]
      api.place(heroi, api.posOf(coruja, 'x'), 1, api.posOf(coruja, 'z') + 3)
      step(1)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' }))
      step(1)
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e' }))
      expect(telaAtiva(stage, 'dica')).toBe(true)
      expect(api.state()).toBe('pausado')
      const fantasmaParado = vivos(api, 'fantasma')[0]
      const fx = api.posOf(fantasmaParado, 'x')
      const fz = api.posOf(fantasmaParado, 'z')
      const restante = api.timeLeft()
      step(30)
      expect(api.posOf(fantasmaParado, 'x')).toBe(fx)
      expect(api.posOf(fantasmaParado, 'z')).toBe(fz)
      expect(api.timeLeft()).toBe(restante)
      apertarBotao(stage, 'dica', 'Continuar')
      expect(api.state()).toBe('jogando')
      expect(telaAtiva(stage, 'dica')).toBe(false)
      expect(vivos(api, 'heroi')[0]).toBe(heroi)
      api.place(heroi, api.posOf(coruja, 'x'), 1, api.posOf(coruja, 'z') + 3)
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' }))
      step(1)
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyE', key: 'e' }))
      apertarBotao(stage, 'dica', 'Voltar ao menu')
      expect(api.state()).toBe('menu')
    } finally {
      if (previous === undefined) delete win.__SZGAME_ASSETS_3D
      else win.__SZGAME_ASSETS_3D = previous
      if (previousSounds === undefined) delete win.__SZGAME_SOUNDS
      else win.__SZGAME_SOUNDS = previousSounds
      win.Audio = previousAudio
      try {
        localStorage.clear()
      } catch {}
    }
  })
})
