import { describe, expect, test } from 'bun:test'
import { CAMINHOS_LIVRES_NAVE_ESCUDO } from '../../../tests/fixtures/caminhos-livres/nave-escudo'
import { scenePaths } from '../../../tests/fixtures/exploration-paths'
import { isSceneAction, type SceneAction, TIMED_SHIELD } from './actions'
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
import { isSceneState, type SceneState, timedShieldOver } from './state'
import { falasDaCena, VOZ_LIMITS } from './voz'

/**
 * O escudo temporário (`timed-shield`, Poder "Escudo temporário" do Construtor, Nave contra
 * Asteroides, 28/11/2026): pegar o item liga o Escudo em 5, ele desce 1 por segundo, e a pedra só
 * tira vida com o Escudo em 0. Só a ideia, em exploração livre com o Zappy.
 */
export const BLOCO_DO_ESCUDO: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'timed-shield',
  cenario: 'nave',
  setup: {
    freeExploration: true,
    goals: ['hit-costs', 'shield-protects', 'shield-ends', 'shield-renews'],
  },
}
const start = sceneStart(BLOCO_DO_ESCUDO)
const jogar = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const fala = (actions: SceneAction[]) => discoveryGuidance(BLOCO_DO_ESCUDO, jogar(actions)).id
const PEGAR: SceneAction = { type: 'pick-shield' }
const SEGUNDO: SceneAction = { type: 'tick-second' }
const PEDRA: SceneAction = { type: 'next-rock' }
const VOLTAR: SceneAction = { type: 'restart-case' }
const segundos = (n: number): SceneAction[] => Array.from({ length: n }, () => SEGUNDO)
const metas = (s: SceneState) => s.evidence.discoveries

const falas = new Map(
  discoverySpeechSteps('timed-shield').map(({ id, text }) => [id, text] as const),
)

describe('o escudo temporário: o motor', () => {
  test('a partida abre no segundo 0, com 3 vidas e o Escudo em 0', () => {
    expect(openScene(start).timedShield).toEqual({
      second: 0,
      lives: 3,
      shield: 0,
      shieldBefore: null,
      damaged: [],
      last: null,
    })
  })

  test('o exemplo da aula: pegar no 0, o Escudo desce 4, 3, 2, 1, 0; a pedra do 2 só sai e a do 5 tira vida', () => {
    const escudos: number[] = []
    let s = jogar([PEGAR])
    expect(s.timedShield.shield).toBe(5)
    for (let i = 0; i < 5; i++) {
      s = stepScene(start, s, SEGUNDO)
      escudos.push(s.timedShield.shield)
      if (s.timedShield.second === 2) {
        expect(s.timedShield.lives).toBe(3)
        expect(metas(s)).toEqual(['shield-protects'])
      }
    }
    expect(escudos).toEqual([4, 3, 2, 1, 0])
    expect(s.timedShield).toMatchObject({ second: 5, lives: 2, damaged: [5] })
    expect(metas(s)).toEqual(['shield-protects', 'shield-ends'])
  })

  test('sem pegar o item, cada pedra tira uma vida, e a partida acaba sem vidas no segundo 8', () => {
    const s = jogar([PEDRA])
    expect(s.timedShield).toMatchObject({ second: 2, lives: 2, damaged: [2] })
    expect(metas(s)).toEqual(['hit-costs'])
    const fim = jogar([PEDRA, PEDRA, PEDRA])
    expect(fim.timedShield).toMatchObject({ second: 8, lives: 0, damaged: [2, 5, 8] })
    expect(timedShieldOver(fim.timedShield)).toBe(true)
    // Sem vidas, nada mais avança, nem o item é pego.
    for (const a of [PEDRA, SEGUNDO, PEGAR]) expect(stepScene(start, fim, a)).toBe(fim)
  })

  test('o tempo para no segundo 14; depois da pedra do 11 não há próxima pedra', () => {
    const s = jogar([PEGAR, PEDRA, PEGAR, PEDRA, PEGAR, PEDRA, PEGAR, PEDRA])
    expect(s.timedShield).toMatchObject({ second: 11, lives: 3, damaged: [] })
    expect(stepScene(start, s, PEDRA)).toBe(s)
    const fim = jogar([PEGAR, PEDRA, PEGAR, PEDRA, PEGAR, PEDRA, PEGAR, PEDRA, ...segundos(3)])
    expect(fim.timedShield.second).toBe(TIMED_SHIELD.lastSecond)
    expect(stepScene(start, fim, SEGUNDO)).toBe(fim)
  })

  test('⚠️ a meta só cai quando a criança VIU', () => {
    // Abrir, pegar o item no 0 e passar um segundo sem pedra não fecham nada.
    expect(metas(openScene(start))).toEqual([])
    expect(metas(jogar([PEGAR, SEGUNDO]))).toEqual([])
    // Pegar com o Escudo em 0 ou em 5 não é renovar: o número não desceu e voltou.
    expect(metas(jogar([PEGAR, PEGAR]))).toEqual([])
    expect(metas(jogar([PEDRA, PEGAR]))).toEqual(['hit-costs'])
    // Com o Escudo entre 1 e 4, pegar de novo volta a 5.
    const renovou = jogar([PEGAR, SEGUNDO, PEGAR])
    expect(renovou.timedShield).toMatchObject({ shield: 5, shieldBefore: 4 })
    expect(metas(renovou)).toEqual(['shield-renews'])
    // Uma batida com 0 DEPOIS de pegar o item não é "sem escudo": é o escudo que acabou.
    expect(metas(jogar([PEGAR, ...segundos(5)]))).not.toContain('hit-costs')
    // E a batida com 0 sem nunca ter pegado não é "o escudo acabou".
    expect(metas(jogar([PEDRA, PEDRA]))).not.toContain('shield-ends')
  })

  test('"Voltar ao começo" volta ao segundo 0 com as descobertas; fora do modo livre não faz nada', () => {
    const s = jogar([PEGAR, PEDRA, VOLTAR])
    expect(s.timedShield).toEqual(openScene(start).timedShield)
    expect(metas(s)).toEqual(['shield-protects'])
    const guiada = { scene: 'timed-shield' as const }
    const aberta = openScene(guiada)
    expect(stepScene(guiada, aberta, VOLTAR)).toBe(aberta)
  })

  test('as ações valem só nesta cena, e o caso não pega o item nem passa o tempo', () => {
    for (const a of [PEGAR, SEGUNDO, PEDRA]) {
      expect(isSceneAction(a, 'timed-shield')).toBe(true)
      expect(isSceneAction(a, 'invincibility')).toBe(false)
      expect(isSceneSetup({ ...BLOCO_DO_ESCUDO.setup, actions: [a] }, 'timed-shield')).toBe(false)
    }
    expect(isSceneSetup(BLOCO_DO_ESCUDO.setup, 'timed-shield')).toBe(true)
  })

  test('o retrato guardado volta igual, e o incoerente é recusado', () => {
    let sessao = initialExperiment(start)
    for (const a of [PEDRA, PEGAR, SEGUNDO]) sessao = stepExperiment(start, sessao, a).session
    const lido = readExperimentSession('timed-shield', packExperiment('timed-shield', sessao))
    expect(lido?.state.timedShield).toEqual(sessao.state.timedShield)
    const s = sessao.state
    expect(isSceneState(JSON.parse(JSON.stringify(s)))).toBe(true)
    const com = (t: Partial<SceneState['timedShield']>) =>
      isSceneState({ ...s, timedShield: { ...s.timedShield, ...t } })
    expect(com({ lives: 3 })).toBe(false)
    expect(com({ shield: 6 })).toBe(false)
    expect(com({ damaged: [3] })).toBe(false)
    expect(com({ second: 15 })).toBe(false)
    expect(com({ shieldBefore: null })).toBe(false)
  })

  test('a faixa e a frase dizem os números, nunca a regra', () => {
    const s = jogar([PEGAR, SEGUNDO])
    expect(sceneReadout('timed-shield', s).map((r) => `${r.label} ${r.value}`)).toEqual([
      'segundo 1',
      'vidas 3',
      'escudo 4',
    ])
    expect(sceneSituation('timed-shield', s)).toBe(
      'Segundo 1. A nave tem 3 vidas e o Escudo está em 4. As pedras batem nos segundos 2, 5, 8 e 11.',
    )
  })
})

describe('o escudo temporário: o Zappy fala só da ideia', () => {
  test('as falas têm o prefixo da cena e cabem na voz do bloco', () => {
    for (const id of falas.keys()) expect(id.startsWith('timed-shield-')).toBe(true)
    const slots = falasDaCena({ instructions: 'Teste o escudo.', activity: BLOCO_DO_ESCUDO })
    expect(slots.length).toBeLessThanOrEqual(VOZ_LIMITS.entradas)
    expect(falas.size).toBe(27)
  })
  test.each([
    ...falas.keys(),
  ])('%s não fala de bloco, Se, então, senão, variável nem código', (id) => {
    expect(falas.get(id)).not.toMatch(
      /\bbloco|\bregra|\bentão\b|\bsenão\b|\bSe\b|variável|constante|código|\baperte\b|\bele\b|\bdele\b|\bnele\b/,
    )
  })
  test('os botões citados são os da tela', () => {
    const botoes = [
      'Pegar o item do escudo',
      'Avançar 1 segundo',
      'Avançar até a próxima pedra',
      'Voltar ao começo',
    ]
    for (const [id, texto] of falas)
      for (const citado of texto.matchAll(/Clique em ([^.?,]+?)(?: e |[.?,]| de novo)/g))
        expect(
          botoes.some((b) => citado[1]?.startsWith(b)),
          `${id}: "${citado[1]}"`,
        ).toBe(true)
  })
  // Antes de um teste, a fala não conta o que ele mostra.
  const ANTES: [string, RegExp][] = [
    ['timed-shield-start', /perde|perdeu|tira|tirou|só sai|ficam iguais/i],
    ['timed-shield-ask-hit', /perde|perdeu|tira|tirou/i],
    ['timed-shield-ask-hit-restart', /perde|perdeu|tira|tirou/i],
    ['timed-shield-ask-protects', /só sai|iguais|não perde/i],
    ['timed-shield-shield-on', /só sai|iguais|não perde/i],
    ['timed-shield-ask-ends', /voltou a tirar|perde|tira/i],
    ['timed-shield-ends-wait', /voltou a tirar|perde|tira/i],
    ['timed-shield-zero', /voltou a tirar|perde|tira/i],
    ['timed-shield-ask-renew', /volta a 5|vai para 5|voltou/i],
    ['timed-shield-renew-ready', /volta a 5|vai para 5|voltou/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
  test('a fala de depois explica o teste visto e só convida ao próximo', () => {
    expect(falas.get('timed-shield-hit-then-protects')).toMatch(/^Sem escudo, a pedra bateu/)
    expect(falas.get('timed-shield-hit-then-protects')).not.toMatch(/só saiu|iguais/)
    expect(falas.get('timed-shield-protects-then-ends')).not.toMatch(/voltou a tirar/)
    expect(falas.get('timed-shield-ends-then-renews')).not.toMatch(/voltou o Escudo a 5/)
  })
})

describe('o escudo temporário: a fala acompanha a ordem escolhida', () => {
  test('na ordem da aula', () => {
    expect(fala([])).toBe('timed-shield-start')
    expect(fala([SEGUNDO])).toBe('timed-shield-start')
    expect(fala([PEDRA])).toBe('timed-shield-hit-then-protects')
    expect(fala([PEDRA, PEGAR])).toBe('timed-shield-shield-on')
    expect(fala([PEDRA, PEGAR, PEDRA])).toBe('timed-shield-protects-then-ends')
    expect(fala([PEDRA, PEGAR, PEDRA, SEGUNDO])).toBe('timed-shield-ends-wait')
    expect(fala([PEDRA, PEGAR, PEDRA, SEGUNDO, SEGUNDO])).toBe('timed-shield-zero')
    const fim = [PEDRA, PEGAR, PEDRA, SEGUNDO, SEGUNDO, PEDRA]
    expect(fala(fim)).toBe('timed-shield-ends-then-renews')
    // Pegar com o Escudo em 0 liga o escudo, mas ainda não é a pegada de novo.
    expect(fala([...fim, PEGAR])).toBe('timed-shield-ask-renew')
    expect(fala([...fim, PEGAR, SEGUNDO])).toBe('timed-shield-renew-ready')
    expect(fala([...fim, PEGAR, SEGUNDO, PEGAR])).toBe('timed-shield-complete')
  })
  test('começando por pegar o item: a fala manda voltar ao começo para o teste sem escudo', () => {
    expect(fala([PEGAR])).toBe('timed-shield-ask-hit-restart')
    expect(fala([PEGAR, PEDRA])).toBe('timed-shield-protects-then-hit')
    expect(fala([PEGAR, PEDRA, SEGUNDO])).toBe('timed-shield-ask-hit-restart')
    expect(fala([PEGAR, PEDRA, VOLTAR])).toBe('timed-shield-ask-hit')
    expect(fala([PEGAR, PEDRA, VOLTAR, PEDRA])).toBe('timed-shield-hit-then-ends')
    expect(fala([PEGAR, SEGUNDO, PEGAR])).toBe('timed-shield-renews-then-hit')
  })
  test('quando a partida não tem mais tempo para o teste, a fala manda voltar ao começo', () => {
    // Sem vidas no segundo 8: a terceira batida explica e convida a recomeçar.
    expect(fala([PEDRA, PEDRA, PEDRA])).toBe('timed-shield-hit-then-restart')
    // Renovado no segundo 8, o Escudo não chega a 0 antes da pedra do 11: o fim dele não cabe mais.
    const tarde = [PEDRA, PEGAR, PEDRA, PEGAR, PEDRA, PEGAR]
    expect(fala(tarde)).toBe('timed-shield-renews-then-restart')
    expect(fala([...tarde, SEGUNDO])).toBe('timed-shield-restart')
  })
  test('a pegada de novo pede um segundo antes do fim: no segundo 13 com o Escudo em 0, voltar ao começo', () => {
    // As três primeiras metas, e o item pego no 8 protege a pedra do 11: o Escudo chega a 0 no 13.
    const ate13 = [PEDRA, PEGAR, PEDRA, SEGUNDO, SEGUNDO, PEDRA, PEGAR, ...segundos(5)]
    const s = jogar(ate13).timedShield
    expect([s.second, s.shield, timedShieldOver(s)]).toEqual([13, 0, false])
    // Pegar, Avançar 1 segundo e pegar de novo passaria do segundo 14, onde o item não é mais pego.
    const no14 = jogar([...ate13, PEGAR, SEGUNDO])
    expect(stepScene(start, no14, PEGAR)).toBe(no14)
    expect(fala(ate13)).toBe('timed-shield-restart')
    expect(fala([...ate13, PEGAR])).toBe('timed-shield-restart')
    // Um segundo antes, com o Escudo em 1, ainda cabe: basta pegar.
    expect(fala(ate13.slice(0, -1))).toBe('timed-shield-renew-ready')
    expect(fala([...ate13, VOLTAR])).toBe('timed-shield-ask-renew')
  })
})

describe('o escudo temporário: o caminho livre', () => {
  test.each([
    ['o caminho de fábrica', scenePaths['timed-shield']],
    ['o caminho livre', CAMINHOS_LIVRES_NAVE_ESCUDO['timed-shield'] ?? []],
  ])('%s completa as quatro metas e fecha com timed-shield-complete', (_nome, caminho) => {
    let sessao = initialExperiment(start)
    for (const a of caminho) sessao = stepExperiment(start, sessao, a).session
    for (const meta of sceneTargets(BLOCO_DO_ESCUDO))
      expect(sessao.state.evidence.discoveries).toContain(meta)
    expect(discoveryGuidance(BLOCO_DO_ESCUDO, sessao.state).id).toBe('timed-shield-complete')
  })
})
