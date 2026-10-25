import { afterEach, beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import { compileStatements, generateJS } from '#generators'
import { type BehaviorIR, behaviorStatements, type JSStatement } from '#ir'
import 'blockly/blocks'
import { registerExtensionBlocks } from '../../../blockly/blocks'
import { buildIRFromWorkspace } from '../../../blockly/buildIR'
import { ensureBlocklyInitialized } from '../../../blockly/setup'
import { buildWorkspaceStateFromIR } from '../../../blockly/workspaceState'
import { parseJS } from '../../../parsers/js'
import { ARENA_CRISTAIS_SOURCE } from '../__gen_arenaCristais'
import { HEROI_MOLDA_SOURCE } from '../__gen_heroiMolda'
import { gameKit3DBlocks } from '../blocks'
import { gameKit3DExamples } from '../exampleCatalog'
import { arenaDosCristaisExample, heroiDoMoldaExample } from '../examples'
import { parseExampleLifecycleSource } from './exampleLifecycleSource'
import { type KitApi, loadExampleKit } from './kitHarness'
import { collectTypes, stripIds } from './testUtils'

/**
 * Os dois exemplos do lote 12 do review 3D: "Arena dos Cristais" (o jogo completo e curto:
 * patrulha, mochila, fases e recorde) e "Herói do Molda" (o modelo animado do Molda com uma
 * animação por estado). Drift contra o parser real, round-trip pelos blocos e PARTIDA de
 * verdade com three real (a bancada do `playthrough.test.ts`).
 */

const CASES = [
  { example: arenaDosCristaisExample, source: ARENA_CRISTAIS_SOURCE },
  { example: heroiDoMoldaExample, source: HEROI_MOLDA_SOURCE },
] as const

beforeAll(() => {
  ensureBlocklyInitialized()
  registerExtensionBlocks(gameKit3DBlocks)
})

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
})

for (const { example, source } of CASES) {
  describe(`Exemplo ${example.name} — drift e round-trip`, () => {
    it('está no catálogo e parseJS(fonte) ≡ IR embutida, sem código avançado', () => {
      expect(gameKit3DExamples).toContain(example)
      const parsed = stripIds(parseExampleLifecycleSource(source)) as JSStatement[]
      const types = collectTypes(parsed)
      expect(types.has('rawJS')).toBe(false)
      expect(types.has('memberCall')).toBe(false)
      expect(parsed).toEqual(stripIds(behaviorStatements(example.ir)) as JSStatement[])
    })

    it('fixpoint textual e IR → blocos → IR estável', () => {
      const ir = stripIds(behaviorStatements(example.ir)) as JSStatement[]
      const code = compileStatements(ir, 0)
      expect(compileStatements(stripIds(parseJS(code)) as JSStatement[], 0)).toBe(code)
      const state = buildWorkspaceStateFromIR(
        example.ir as Parameters<typeof buildWorkspaceStateFromIR>[0],
      )
      const ws = new Blockly.Workspace()
      try {
        Blockly.serialization.workspaces.load(state as unknown as Record<string, unknown>, ws)
        expect(stripIds(behaviorStatements(buildIRFromWorkspace(ws)))).toEqual(
          stripIds(behaviorStatements(example.ir)),
        )
      } finally {
        ws.dispose()
      }
    })
  })
}

it('a Arena usa os blocos do lote 12 e os do Herói tocam a animação por estado', () => {
  const arena = collectTypes(stripIds(behaviorStatements(arenaDosCristaisExample.ir)))
  for (const type of [
    'g3k:patrol',
    'g3k:bag',
    'g3k:bagValue',
    'g3k:saveValue',
    'g3k:savedValue',
    'g3k:nextLevel',
    'g3k:levelNumber',
    'g3k:onLevelStart',
  ])
    expect(arena.has(type)).toBe(true)
  const heroi = collectTypes(stripIds(behaviorStatements(heroiDoMoldaExample.ir)))
  for (const type of [
    'g3k:setStateAnim',
    'g3k:onAnimEnd',
    'g3k:animSpeed',
    'g3k:playAnim', // o pulo toca "Esticar" uma vez, na mão
    'g3k:stopAnim', // o floco de gelo congela o boneco
  ])
    expect(heroi.has(type)).toBe(true)
  expect(heroiDoMoldaExample.assets?.map((asset) => [asset.name, asset.kind])).toEqual([
    ['heroi-do-molda', 'model3d'],
  ])
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

function vivos(api: KitApi, mold: string): unknown[] {
  const out: unknown[] = []
  api.forEachAlive(mold, (e) => out.push(e))
  return out
}

function visitar(api: KitApi, step: (n: number) => void, heroi: unknown, alvo: unknown) {
  api.place(heroi, api.posOf(alvo, 'x'), 0, api.posOf(alvo, 'z'))
  step(2)
}

describe('Arena dos Cristais — jogar até o fim', () => {
  it('cristais, chave na mochila, porta → fase 2, porta → vitória com recorde guardado', async () => {
    window.localStorage.removeItem('szg3k-val-recorde')
    const { api, step, stage } = await loadExampleKit(jsDoExemplo(arenaDosCristaisExample))
    expect(api.state()).toBe('menu')
    apertarBotao(stage, 'menu')
    expect(api.state()).toBe('jogando')
    expect(api.level()).toBe(1)
    expect(api.countAlive('guarda')).toBe(1)
    const heroi = vivos(api, 'heroi')[0]
    // O guarda patrulha sozinho: anda no eixo x.
    const guarda = vivos(api, 'guarda')[0]
    const x0 = api.posOf(guarda, 'x')
    step(15)
    expect(Math.abs(api.posOf(guarda, 'x') - x0)).toBeGreaterThan(0.5)

    // Sem a chave a porta não abre.
    visitar(api, step, heroi, vivos(api, 'porta')[0])
    expect(api.level()).toBe(1)
    for (const cristal of vivos(api, 'cristal')) visitar(api, step, heroi, cristal)
    expect(api.score()).toBe(4)
    visitar(api, step, heroi, vivos(api, 'chave')[0])
    expect(api.bagHas('chave')).toBe(true)
    api.place(heroi, 0, 0, 10)
    step(2)
    visitar(api, step, heroi, vivos(api, 'porta')[0])
    step(1)
    // Fase 2: a arena se montou de novo, com mais guardas e a chave do outro lado.
    expect(api.level()).toBe(2)
    expect(api.state()).toBe('jogando')
    expect(api.countAlive('guarda')).toBe(3)
    expect(api.score()).toBe(4)
    expect(api.bagHas('chave')).toBe(false)
    expect(api.posOf(vivos(api, 'chave')[0], 'x')).toBeGreaterThan(10)

    const heroi2 = vivos(api, 'heroi')[0]
    for (const cristal of vivos(api, 'cristal')) visitar(api, step, heroi2, cristal)
    visitar(api, step, heroi2, vivos(api, 'chave')[0])
    api.place(heroi2, 0, 0, 10)
    step(2)
    visitar(api, step, heroi2, vivos(api, 'porta')[0])
    expect(api.state()).toBe('vitoria')
    expect(window.localStorage.getItem('szg3k-val-recorde')).toBe(String(api.score()))
    expect(api.score()).toBe(8)

    // "Sair para o menu" e jogar de novo: fase 1 e mochila vazia.
    apertarBotao(stage, 'vitoria', 'Sair para o menu')
    expect(api.state()).toBe('menu')
    expect(api.level()).toBe(1)
    apertarBotao(stage, 'menu')
    expect(api.level()).toBe(1)
    expect(api.countAlive('guarda')).toBe(1)
    window.localStorage.removeItem('szg3k-val-recorde')
  })

  it('o guarda persegue quem chega perto e derrota o herói parado', async () => {
    const { api, step, stage } = await loadExampleKit(jsDoExemplo(arenaDosCristaisExample))
    apertarBotao(stage, 'menu')
    const heroi = vivos(api, 'heroi')[0]
    const guarda = vivos(api, 'guarda')[0]
    api.place(heroi, api.posOf(guarda, 'x') + 3, 0, api.posOf(guarda, 'z'))
    step(2)
    expect(api.stateOf(guarda)).toBe('perseguir')
    let frames = 0
    while (api.state() === 'jogando' && frames < 600) {
      step(1)
      frames++
    }
    expect(api.state()).toBe('fim')
  })

  it('⭐ a fase 2 começa com o herói longe dos guardas e o aviso "Fase 2!"', async () => {
    // Antes, um guarda da fase 2 nascia a 4 m do herói (o raio de perseguir é 6 m) e
    // derrubava a criança parada em 2 s, antes de ela entender que a fase tinha trocado.
    const { api, step, stage } = await loadExampleKit(jsDoExemplo(arenaDosCristaisExample))
    apertarBotao(stage, 'menu')
    const falas = () => [...stage.querySelectorAll('.szg3k-say')].map((el) => el.textContent)
    expect(falas()).toContain('Fase 1!')
    api.nextLevel()
    step(1)
    expect(api.level()).toBe(2)
    expect(falas()).toContain('Fase 2!')
    const heroi = vivos(api, 'heroi')[0]
    const guardas = vivos(api, 'guarda')
    expect(guardas).toHaveLength(3)
    for (const guarda of guardas) {
      expect(api.stateOf(guarda)).toBe('parado')
      expect(api.distanceBetween(guarda, heroi)).toBeGreaterThan(6)
    }
    // Parado no nascimento por 3 s, ninguém corre atrás e nenhum coração cai.
    step(90)
    expect(api.state()).toBe('jogando')
    expect(api.healthOf(heroi)).toBe(3)
    for (const guarda of guardas) expect(api.stateOf(guarda)).toBe('parado')
  })

  it('a tela "fim" serve aos dois jeitos de perder (os guardas e a contagem)', async () => {
    const { api, step, stage } = await loadExampleKit(jsDoExemplo(arenaDosCristaisExample))
    apertarBotao(stage, 'menu')
    // Perder pela contagem: o herói fica a salvo no canto e os 60 s acabam.
    const heroi = vivos(api, 'heroi')[0]
    let frames = 0
    while (api.state() === 'jogando' && frames < 30 * 70) {
      api.place(heroi, 18, 0, 18)
      step(1)
      frames++
    }
    expect(api.state()).toBe('fim')
    expect(api.healthOf(heroi)).toBe(3)
    const tela = stage.querySelector('[data-szg3k-screen="fim"]')?.textContent ?? ''
    expect(tela).toContain('o tempo acabou')
    expect(tela).toContain('Os guardas te pegaram')
  })
})

describe('Herói do Molda — o modelo animado de verdade', () => {
  it('carrega o .glb do Molda, troca a animação pelo estado e volta do pulo pelo fim da animação', async () => {
    const win = window as unknown as Record<string, unknown>
    const previous = win.__SZGAME_ASSETS_3D
    const asset = heroiDoMoldaExample.assets?.[0]
    win.__SZGAME_ASSETS_3D = {
      'heroi-do-molda': {
        kind: 'model3d',
        dataUrl: asset?.dataUrl,
        fileName: 'heroi-do-molda.glb',
      },
    }
    try {
      const { api, step, stage } = await loadExampleKit(jsDoExemplo(heroiDoMoldaExample))
      apertarBotao(stage, 'menu')
      const heroi = vivos(api, 'heroi')[0] as { _action?: { getClip(): { name: string } } | null }
      step(2)
      expect(api.stateOf(heroi)).toBe('parado')
      expect(heroi._action?.getClip().name).toBe('Acenar')
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }))
      step(2)
      expect(api.stateOf(heroi)).toBe('andando')
      expect(heroi._action?.getClip().name).toBe('Esticar')
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: 'w' }))
      step(2)
      expect(api.stateOf(heroi)).toBe('parado')
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ' }))
      step(1)
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ' }))
      expect(api.stateOf(heroi)).toBe('pulando')
      let frames = 0
      while (api.stateOf(heroi) === 'pulando' && frames < 300) {
        step(1)
        frames++
      }
      expect(api.stateOf(heroi)).toBe('parado')
      // O floco de gelo congela: "Parar a animação" deixa o boneco duro, e o "depois de
      // 1.5 s" o devolve ao "parado", que volta a acenar (a animação do estado).
      const floco = vivos(api, 'floco')[0]
      api.place(heroi, api.posOf(floco, 'x'), 0, api.posOf(floco, 'z'))
      step(2)
      expect(api.stateOf(heroi)).toBe('congelado')
      expect(heroi._action).toBeNull()
      step(50)
      expect(api.stateOf(heroi)).toBe('parado')
      expect(heroi._action?.getClip().name).toBe('Acenar')
      for (const estrela of vivos(api, 'estrela')) {
        api.place(heroi, api.posOf(estrela, 'x'), 0, api.posOf(estrela, 'z'))
        step(2)
      }
      expect(api.state()).toBe('vitoria')
    } finally {
      if (previous === undefined) delete win.__SZGAME_ASSETS_3D
      else win.__SZGAME_ASSETS_3D = previous
    }
  })
})
