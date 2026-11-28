import { describe, expect, test } from 'bun:test'
import {
  CAMINHOS_LIVRES_NAVE_CHEFAO,
  disparar,
  guarda,
  lasers,
  recomecar,
  umQuadro,
} from '../../../tests/fixtures/caminhos-livres/nave-chefao'
import { scenePaths } from '../../../tests/fixtures/exploration-paths'
import { BOSS_HEALTH, isSceneAction, type SceneAction } from './actions'
import { actorFigure, sceneNativeCast } from './cast'
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
import { isSceneState, type SceneState } from './state'
import { falasDaCena, VOZ_LIMITS } from './voz'

/**
 * O chefão com resistência (`boss-health`, Poder "Chefão com resistência" do Construtor, Nave
 * contra Asteroides, 28/11/2026): o chefão com vida própria. Só a ideia, em exploração livre com o
 * Zappy.
 */
export const BLOCO_DO_CHEFAO: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'boss-health',
  cast: { hero: { name: 'nave', gender: 'f' }, obstacle: { name: 'chefão', gender: 'm' } },
  cenario: 'nave',
  setup: {
    freeExploration: true,
    goals: ['one-not-enough', 'count-down', 'falls-at-zero', 'falls-once'],
  },
}
const start = sceneStart(BLOCO_DO_CHEFAO)
const jogar = (actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
const fala = (actions: SceneAction[]) => discoveryGuidance(BLOCO_DO_CHEFAO, jogar(actions)).id
const metas = (s: SceneState) => s.evidence.discoveries
const vezes = (n: number, a: SceneAction) => Array.from({ length: n }, () => a)
const DERROTA_COM_GUARDA = [guarda(true), ...lasers(5), umQuadro]
const DERROTA_SEM_GUARDA = [...lasers(5), umQuadro]

const falas = new Map(
  discoverySpeechSteps('boss-health').map(({ id, text }) => [id, text] as const),
)

describe('o chefão com resistência: o motor', () => {
  test('abre com a vida em 5, o placar em 0 e a guarda desligada', () => {
    expect(openScene(start).bossHealth).toEqual({
      life: 5,
      score: 0,
      guard: false,
      defeated: false,
      framesAfter: 0,
      seenGuarded: false,
      seenUnguarded: false,
      last: null,
    })
  })

  test('cada laser tira 1; no 0 o chefão cai e o placar ganha o prêmio', () => {
    expect(jogar([disparar]).bossHealth.life).toBe(4)
    expect(jogar(lasers(3)).bossHealth.life).toBe(2)
    const caiu = jogar(lasers(5))
    expect(caiu.bossHealth).toMatchObject({ life: 0, score: 10, last: 'defeat' })
    expect(caiu.caption).toContain('O chefão caiu, e o placar ganhou 10.')
    // Com o chefão caído, Disparar não faz nada.
    expect(stepScene(start, caiu, disparar)).toBe(caiu)
  })

  test('sem a guarda o prêmio soma a cada quadro; com a guarda, uma vez só', () => {
    expect(jogar([...lasers(5), ...vezes(3, umQuadro)]).bossHealth.score).toBe(40)
    const comGuarda = jogar([guarda(true), ...lasers(5), ...vezes(3, umQuadro)]).bossHealth
    expect(comGuarda).toMatchObject({ score: 10, defeated: true, framesAfter: 3 })
    // Antes da queda, o quadro não mexe no placar.
    expect(jogar([disparar, umQuadro]).bossHealth).toMatchObject({ life: 4, score: 0 })
    // Depois de `maxFrames` quadros, a partida para.
    const fim = jogar([...lasers(5), ...vezes(BOSS_HEALTH.maxFrames, umQuadro)])
    expect(fim.bossHealth.score).toBe(BOSS_HEALTH.prize * (1 + BOSS_HEALTH.maxFrames))
    expect(stepScene(start, fim, umQuadro)).toBe(fim)
  })

  test('⚠️ a meta só cai quando a criança VIU', () => {
    expect(metas(openScene(start))).toEqual([])
    // Trocar a guarda, avançar e recomeçar sem acerto não mostram nada.
    expect(metas(jogar([guarda(true), umQuadro, guarda(false), umQuadro]))).toEqual([])
    expect(metas(jogar([disparar]))).toEqual(['one-not-enough'])
    expect(metas(jogar(lasers(2)))).toEqual(['one-not-enough'])
    expect(metas(jogar(lasers(3)))).toEqual(['one-not-enough', 'count-down'])
    // ⚠️ Os acertos contam na MESMA partida: dois, recomeçar e mais um não são três.
    expect(metas(jogar([...lasers(2), recomecar, disparar]))).toEqual(['one-not-enough'])
    expect(metas(jogar(lasers(5)))).toEqual(['one-not-enough', 'count-down', 'falls-at-zero'])
    // Uma guarda só não compara: o placar parado, ou subindo, sem o outro lado.
    expect(metas(jogar(DERROTA_COM_GUARDA))).not.toContain('falls-once')
    expect(metas(jogar(DERROTA_SEM_GUARDA))).not.toContain('falls-once')
    // A queda sem nenhum quadro depois também não.
    expect(metas(jogar([...DERROTA_SEM_GUARDA, guarda(true), ...lasers(5)]))).not.toContain(
      'falls-once',
    )
    expect(metas(jogar([...DERROTA_SEM_GUARDA, ...DERROTA_COM_GUARDA]))).toContain('falls-once')
    expect(metas(jogar([...DERROTA_COM_GUARDA, guarda(false), ...DERROTA_SEM_GUARDA]))).toContain(
      'falls-once',
    )
  })

  test('trocar a guarda recomeça a partida; Recomeçar guarda a escolha e as descobertas', () => {
    const antes = jogar(lasers(3))
    const trocou = stepScene(start, antes, guarda(true))
    expect(trocou.bossHealth).toMatchObject({ life: 5, score: 0, guard: true, last: 'guard' })
    expect(stepScene(start, trocou, guarda(true))).toBe(trocou)
    const s = stepScene(start, jogar([guarda(true), ...lasers(5), umQuadro]), recomecar)
    expect(s.bossHealth).toEqual({
      ...openScene(start).bossHealth,
      guard: true,
      seenGuarded: true,
      last: 'restart',
    })
    expect(metas(s)).toEqual(['one-not-enough', 'count-down', 'falls-at-zero'])
    const aberta = openScene(start)
    expect(stepScene(start, aberta, recomecar)).toBe(aberta)
  })

  test('as ações valem só nesta cena, e o caso não aceita nenhuma', () => {
    for (const a of [disparar, guarda(true), umQuadro, recomecar]) {
      expect(isSceneAction(a, 'boss-health')).toBe(true)
      expect(isSceneAction(a, 'enemy-fire')).toBe(false)
      expect(isSceneSetup({ ...BLOCO_DO_CHEFAO.setup, actions: [a] }, 'boss-health')).toBe(false)
    }
    expect(isSceneAction({ type: 'boss-guard', on: 'sim' }, 'boss-health')).toBe(false)
    expect(isSceneSetup(BLOCO_DO_CHEFAO.setup, 'boss-health')).toBe(true)
  })

  test('o retrato guardado volta igual, e o incoerente é recusado', () => {
    let sessao = initialExperiment(start)
    for (const a of [...lasers(5), umQuadro, umQuadro])
      sessao = stepExperiment(start, sessao, a).session
    const lido = readExperimentSession('boss-health', packExperiment('boss-health', sessao))
    expect(lido?.state.bossHealth).toEqual(sessao.state.bossHealth)
    const s = sessao.state
    expect(isSceneState(JSON.parse(JSON.stringify(s)))).toBe(true)
    const com = (e: SceneState, b: Partial<SceneState['bossHealth']>) =>
      isSceneState({ ...e, bossHealth: { ...e.bossHealth, ...b } })
    expect(com(s, { score: 10 })).toBe(false)
    expect(com(s, { defeated: true })).toBe(false)
    expect(com(s, { life: 6 })).toBe(false)
    expect(com(openScene(start), { score: 10 })).toBe(false)
    expect(com(openScene(start), { last: 'hit' })).toBe(false)
  })

  test('a faixa e a frase dizem os números, nunca a regra', () => {
    expect(
      sceneReadout('boss-health', jogar([disparar])).map((r) => `${r.label} ${r.value}`),
    ).toEqual(['vida do chefão 4', 'placar 0', 'guarda do prêmio Desligada'])
    expect(sceneSituation('boss-health', openScene(start))).toBe(
      'O chefão está no alto da tela, com 5 de vida, e o placar está em 0. A Guarda do prêmio está desligada.',
    )
    expect(sceneSituation('boss-health', { ...jogar(lasers(5)), caption: '' })).toBe(
      'O chefão saiu da tela, e o placar está em 10. A Guarda do prêmio está desligada.',
    )
  })

  test('o chefão do elenco é desenhado como um asteroide gigante, não como o cacto do papel', () => {
    expect(actorFigure(sceneNativeCast('boss-health', BLOCO_DO_CHEFAO.cast), 'obstacle')).toBe(
      'asteroide',
    )
    expect(actorFigure(sceneNativeCast('boss-health'), 'obstacle')).toBe('asteroide')
    // O nome que diz figura continua valendo.
    const pedra = { obstacle: { name: 'pedra', gender: 'f' as const } }
    expect(actorFigure(sceneNativeCast('boss-health', pedra), 'obstacle')).toBe('pedra')
  })
})

describe('o chefão com resistência: o Zappy fala só da ideia', () => {
  test('as falas têm o prefixo da cena e cabem na voz do bloco', () => {
    for (const id of falas.keys()) expect(id.startsWith('boss-health-')).toBe(true)
    const slots = falasDaCena({ instructions: 'Teste o chefão.', activity: BLOCO_DO_CHEFAO })
    expect(slots.length).toBeLessThanOrEqual(VOZ_LIMITS.entradas)
    expect(falas.size).toBe(13)
  })
  test.each([
    ...falas.keys(),
  ])('%s não fala de bloco, Se, então, senão, variável nem código', (id) => {
    expect(falas.get(id)).not.toMatch(
      /\bbloco|\bregra|\bentão\b|\bsenão\b|\bSe\b|variável|constante|código|\baperte\b|\bele\b|\bela\b|\beles\b|\bdele\b|\bnele\b/,
    )
  })
  test('os botões citados são os da tela', () => {
    const botoes = ['Disparar', 'Ligada', 'Desligada', 'Avançar um quadro', 'Recomeçar a partida']
    let citados = 0
    for (const [id, texto] of falas)
      for (const citado of texto.matchAll(
        /(?:clique em|depois em|escolha) ([^.?,:]+?)(?: e |[.?,:]| até | uma vez| mais duas| algumas)/gi,
      )) {
        citados++
        expect(
          botoes.some((b) => citado[1]?.startsWith(b)),
          `${id}: "${citado[1]}"`,
        ).toBe(true)
      }
    expect(citados).toBeGreaterThan(12)
  })
  // Antes de um teste, a fala não conta o que ele mostra.
  const ANTES: [string, RegExp][] = [
    ['boss-health-start', /continuou|não derrota|não basta|para 4/i],
    ['boss-health-ask-one', /continuou|não derrota|não basta|para 4/i],
    ['boss-health-ask-count', /desceu|desce 1|encolheu/i],
    ['boss-health-ask-falls', /caiu|ganhou|10/i],
    ['boss-health-ask-once', /subir|ficou em|uma vez só|de novo/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
})

describe('o chefão com resistência: a fala acompanha a ordem', () => {
  test('na ordem da aula', () => {
    expect(fala([])).toBe('boss-health-start')
    expect(fala([guarda(true)])).toBe('boss-health-start')
    expect(fala([disparar])).toBe('boss-health-one-then-count')
    expect(fala(lasers(2))).toBe('boss-health-ask-count')
    expect(fala(lasers(3))).toBe('boss-health-count-then-falls')
    expect(fala(lasers(5))).toBe('boss-health-falls-then-once')
    expect(fala([...lasers(5), umQuadro])).toBe('boss-health-ask-once')
    expect(fala([...DERROTA_SEM_GUARDA, ...DERROTA_COM_GUARDA])).toBe('boss-health-complete')
  })
  test('com os primeiros testes feitos noutra partida, a fala convida ao que falta', () => {
    expect(fala([...lasers(3), recomecar, disparar])).toBe('boss-health-one-then-falls')
    expect(fala([...lasers(5), recomecar, disparar])).toBe('boss-health-one-then-once')
  })
})

describe('o chefão com resistência: o caminho livre', () => {
  test.each([
    ['o caminho de fábrica', scenePaths['boss-health']],
    ['o caminho livre', CAMINHOS_LIVRES_NAVE_CHEFAO['boss-health'] ?? []],
  ])('%s completa as quatro metas e fecha com boss-health-complete', (_nome, caminho) => {
    let sessao = initialExperiment(start)
    for (const a of caminho) sessao = stepExperiment(start, sessao, a).session
    for (const meta of sceneTargets(BLOCO_DO_CHEFAO))
      expect(sessao.state.evidence.discoveries).toContain(meta)
    expect(discoveryGuidance(BLOCO_DO_CHEFAO, sessao.state).id).toBe('boss-health-complete')
  })
})
