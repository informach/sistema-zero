import { describe, expect, test } from 'bun:test'
import {
  apertarE,
  apertarEspaco,
  CAMINHOS_LIVRES_NAVE_ARMA,
  novaPartida,
  pegarPlasma,
} from '../../../tests/fixtures/caminhos-livres/nave-arma'
import { scenePaths } from '../../../tests/fixtures/exploration-paths'
import { isSceneAction, type SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import {
  discoveryGuidance,
  discoverySpeechSteps,
  type ExperimentationActivity,
  isSceneSetup,
  sceneStart,
  sceneTargets,
} from './index'
import { sceneReadout, sceneSituation } from './readout'
import { initialExperiment, packExperiment, readExperimentSession, stepExperiment } from './session'
import { isSceneState, type SceneState, weaponSwapFrames } from './state'
import { falasDaCena, VOZ_LIMITS } from './voz'

/**
 * A troca de arma (`weapon-swap`, Poder "Troca de arma" do Construtor, Nave contra Asteroides,
 * 28/11/2026): uma arma que muda o tiro. Só a ideia, em exploração livre com o Zappy.
 */
export const BLOCO_DA_ARMA: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'weapon-swap',
  cast: { hero: { name: 'nave', gender: 'f' }, obstacle: { name: 'asteroide', gender: 'm' } },
  cenario: 'nave',
  setup: {
    freeExploration: true,
    goals: ['locked', 'unlocked-swap', 'shot-follows', 'new-match-laser'],
  },
}
const start = sceneStart(BLOCO_DA_ARMA)
const jogar = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const fala = (actions: SceneAction[]) => discoveryGuidance(BLOCO_DA_ARMA, jogar(actions)).id
const metas = (s: SceneState) => s.evidence.discoveries
const PLASMA = [pegarPlasma, apertarE]

const falas = new Map(
  discoverySpeechSteps('weapon-swap').map(({ id, text }) => [id, text] as const),
)

describe('a troca de arma: o motor', () => {
  test('abre com o laser, o plasma trancado e nenhum tiro', () => {
    expect(openScene(start).weaponSwap).toEqual({
      weapon: 'laser',
      unlocked: false,
      shot: null,
      fired: [],
      last: null,
    })
  })

  test('o E só troca a arma com o plasma liberado, nos dois sentidos', () => {
    expect(jogar([apertarE]).weaponSwap).toMatchObject({ weapon: 'laser', last: 'locked' })
    expect(jogar(PLASMA).weaponSwap.weapon).toBe('plasma')
    expect(jogar([...PLASMA, apertarE]).weaponSwap.weapon).toBe('laser')
    // Pegar o item de novo não faz nada.
    const liberado = jogar([pegarPlasma])
    expect(stepScene(start, liberado, pegarPlasma)).toBe(liberado)
  })

  test('o Espaço dispara a arma de agora: o laser chega antes do plasma', () => {
    expect(weaponSwapFrames('laser')).toBeLessThan(weaponSwapFrames('plasma'))
    expect(jogar([apertarEspaco]).weaponSwap.shot).toEqual({
      weapon: 'laser',
      frames: weaponSwapFrames('laser'),
    })
    expect(jogar([...PLASMA, apertarEspaco]).weaponSwap.shot).toEqual({
      weapon: 'plasma',
      frames: weaponSwapFrames('plasma'),
    })
  })

  test('⚠️ a meta só cai quando a criança VIU', () => {
    expect(metas(openScene(start))).toEqual([])
    expect(metas(jogar([pegarPlasma]))).toEqual([])
    // O E depois do item que volta ao laser não é a troca para o plasma.
    expect(metas(jogar([apertarE]))).toEqual(['locked'])
    expect(metas(jogar(PLASMA))).toEqual(['unlocked-swap'])
    // Um tiro só, ou dois da mesma arma, não comparam nada.
    expect(metas(jogar([apertarEspaco, apertarEspaco]))).toEqual([])
    expect(metas(jogar([apertarEspaco, ...PLASMA, apertarEspaco]))).toEqual([
      'unlocked-swap',
      'shot-follows',
    ])
    // A Nova partida com o laser não mostra a volta ao laser.
    expect(metas(jogar([pegarPlasma, novaPartida]))).toEqual([])
    expect(metas(jogar([...PLASMA, novaPartida]))).toEqual(['unlocked-swap', 'new-match-laser'])
    const aberta = openScene(start)
    expect(stepScene(start, aberta, novaPartida)).toBe(aberta)
  })

  test('a Nova partida volta ao laser, tranca o plasma e tira o tiro; a memória dos tiros fica', () => {
    const s = jogar([apertarEspaco, ...PLASMA, apertarEspaco, novaPartida])
    expect(s.weaponSwap).toEqual({
      weapon: 'laser',
      unlocked: false,
      shot: null,
      fired: ['laser', 'plasma'],
      last: 'back-to-laser',
    })
  })

  test('a legenda da Nova partida diz só o que mudou', () => {
    expect(jogar([...PLASMA, novaPartida]).caption).toBe(
      'Nova partida: a arma voltou para laser, e o plasma ficou trancado de novo.',
    )
    expect(jogar([pegarPlasma, novaPartida]).caption).toBe(
      'Nova partida: a arma continua laser, e o plasma ficou trancado de novo.',
    )
    // Só um tiro de laser, sem o item: nem a arma nem o plasma mudam.
    expect(jogar([apertarEspaco, novaPartida]).caption).toBe(
      'Nova partida: a arma continua laser, e o plasma continua trancado.',
    )
  })

  test('as ações valem só nesta cena, e o caso não aceita nenhuma', () => {
    for (const a of [pegarPlasma, apertarE, apertarEspaco, novaPartida]) {
      expect(isSceneAction(a, 'weapon-swap')).toBe(true)
      expect(isSceneAction(a, 'boss-health')).toBe(false)
      expect(isSceneSetup({ ...BLOCO_DA_ARMA.setup, actions: [a] }, 'weapon-swap')).toBe(false)
    }
    expect(isSceneSetup(BLOCO_DA_ARMA.setup, 'weapon-swap')).toBe(true)
  })

  test('o retrato guardado volta igual, e o incoerente é recusado', () => {
    let sessao = initialExperiment(start)
    for (const a of [apertarEspaco, ...PLASMA, apertarEspaco])
      sessao = stepExperiment(start, sessao, a).session
    const lido = readExperimentSession('weapon-swap', packExperiment('weapon-swap', sessao))
    expect(lido?.state.weaponSwap).toEqual(sessao.state.weaponSwap)
    const s = sessao.state
    expect(isSceneState(JSON.parse(JSON.stringify(s)))).toBe(true)
    const com = (e: SceneState, w: Partial<SceneState['weaponSwap']>) =>
      isSceneState({ ...e, weaponSwap: { ...e.weaponSwap, ...w } })
    expect(com(s, { unlocked: false })).toBe(false)
    expect(com(s, { shot: { weapon: 'plasma', frames: 1 } })).toBe(false)
    expect(com(s, { fired: ['laser', 'laser'] })).toBe(false)
    expect(com(openScene(start), { weapon: 'plasma' })).toBe(false)
  })

  test('a faixa e a frase dizem a arma e os números, nunca a regra', () => {
    expect(
      sceneReadout('weapon-swap', jogar([apertarEspaco])).map((r) => `${r.label} ${r.value}`),
    ).toEqual(['arma laser', 'plasma trancado', `quadros até a pedra ${weaponSwapFrames('laser')}`])
    expect(sceneSituation('weapon-swap', openScene(start))).toBe(
      'Arma: laser. O plasma está trancado. A pedra espera no alto da tela.',
    )
  })
})

describe('a troca de arma: o Zappy fala só da ideia', () => {
  test('as falas têm o prefixo da cena e cabem na voz do bloco', () => {
    for (const id of falas.keys()) expect(id.startsWith('weapon-swap-')).toBe(true)
    const slots = falasDaCena({ instructions: 'Teste a arma.', activity: BLOCO_DA_ARMA })
    expect(slots.length).toBeLessThanOrEqual(VOZ_LIMITS.entradas)
    expect(falas.size).toBe(21)
  })
  test.each([
    ...falas.keys(),
  ])('%s não fala de bloco, Se, então, senão, variável nem código', (id) => {
    expect(falas.get(id)).not.toMatch(
      /\bbloco|\bregra|\bentão\b|\bsenão\b|\bSe\b|variável|constante|código|\baperte\b|\bele\b|\bela\b|\beles\b|\bdele\b|\bnele\b/,
    )
  })
  test('os botões citados são os da tela', () => {
    const botoes = ['Pegar o item de plasma', 'Apertar E', 'Apertar Espaço', 'Nova partida']
    let citados = 0
    for (const [id, texto] of falas)
      for (const citado of texto.matchAll(
        // Sem o `i`: o " E " da tecla não é o "e" da frase.
        /(?:[Cc]lique em|depois em) ([^.?,:]+?)(?: e |[.?,:]| com | sem )/g,
      )) {
        citados++
        expect(
          botoes.some((b) => citado[1]?.startsWith(b)),
          `${id}: "${citado[1]}"`,
        ).toBe(true)
      }
    expect(citados).toBeGreaterThan(20)
  })
  // Antes de um teste, a fala não conta o que ele mostra.
  const ANTES: [string, RegExp][] = [
    ['weapon-swap-start', /continuou|não troc/i],
    ['weapon-swap-ask-locked', /continuou|não troc/i],
    ['weapon-swap-ask-relock', /continuou|não troc|voltou/i],
    ['weapon-swap-ask-swap', /trocou|foi para/i],
    ['weapon-swap-ask-shots', /fino|grande|rápido|lento|demorou/i],
    ['weapon-swap-ask-newmatch', /voltou|trancado/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
})

describe('a troca de arma: a fala acompanha a ordem escolhida', () => {
  test('na ordem da aula', () => {
    expect(fala([])).toBe('weapon-swap-start')
    expect(fala([apertarE])).toBe('weapon-swap-locked-then-swap')
    expect(fala([apertarE, pegarPlasma])).toBe('weapon-swap-ask-swap')
    expect(fala([apertarE, ...PLASMA])).toBe('weapon-swap-swap-then-shots')
    expect(fala([apertarE, ...PLASMA, apertarEspaco, apertarE, apertarEspaco])).toBe(
      'weapon-swap-shots-then-newmatch',
    )
    expect(
      fala([apertarE, ...PLASMA, apertarEspaco, apertarE, apertarEspaco, apertarE, novaPartida]),
    ).toBe('weapon-swap-complete')
  })
  test('começando pelo item: o E sem o item pede uma Nova partida antes', () => {
    expect(fala([pegarPlasma])).toBe('weapon-swap-ask-relock')
    expect(fala(PLASMA)).toBe('weapon-swap-swap-then-relock')
    expect(fala([...PLASMA, novaPartida])).toBe('weapon-swap-newmatch-then-locked')
  })
})

describe('a troca de arma: o caminho livre', () => {
  test.each([
    ['o caminho de fábrica', scenePaths['weapon-swap']],
    ['o caminho livre', CAMINHOS_LIVRES_NAVE_ARMA['weapon-swap'] ?? []],
  ])('%s completa as quatro metas e fecha com weapon-swap-complete', (_nome, caminho) => {
    let sessao = initialExperiment(start)
    for (const a of caminho) sessao = stepExperiment(start, sessao, a).session
    for (const meta of sceneTargets(BLOCO_DA_ARMA))
      expect(sessao.state.evidence.discoveries).toContain(meta)
    expect(discoveryGuidance(BLOCO_DA_ARMA, sessao.state).id).toBe('weapon-swap-complete')
  })
})
