import { describe, expect, test } from 'bun:test'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import { discoveryGuidance, discoverySpeechSteps, type ExperimentationActivity } from './index'
import { initialExperiment, stepExperiment } from './session'
import type { SceneStart, SceneState } from './state'

/**
 * Os Poderes "O baú dos símbolos" e "O segredo da cabana" (Faísca, 02/11/2026): só a IDEIA e o
 * convite à investigação. Nada de bloco, regra, evento, Se, então nem senão nas falas; antes do
 * teste, o Zappy pergunta e diz o que observar, e o resultado só vem na fala de depois.
 */
const falas = new Map(
  (['symbol-sequence', 'two-pieces'] as const).flatMap((cena) =>
    discoverySpeechSteps(cena).map(({ id, text }) => [id, text] as const),
  ),
)
const SO_A_IDEIA =
  /\b[Rr]egra|\b[Bb]loco|\b[Ee]vento|\b[Ee]ntão\b|\b[Ss]enão\b|\b[Ss]e\b passo|Quando o\b|Quando acontecer|Ao iniciar|\b[Cc]omando|\b[Cc]ódigo|\bVerdadeiro\b/

const caso = (scene: 'symbol-sequence' | 'two-pieces') => {
  const activity: ExperimentationActivity = {
    type: 'experimentation',
    scene,
    cenario: 'farol',
    setup: { freeExploration: true },
  }
  const start: SceneStart = { scene, setup: activity.setup }
  const play = (actions: SceneAction[]): SceneState =>
    actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
  const fala = (actions: SceneAction[]) => discoveryGuidance(activity, play(actions))?.id
  return { activity, play, fala }
}

describe('Poderes da Faísca: o Zappy fala da ideia', () => {
  test('as duas cenas têm falas próprias', () => {
    expect([...falas.keys()].filter((id) => id.startsWith('symbols-')).length).toBeGreaterThan(5)
    expect([...falas.keys()].filter((id) => id.startsWith('cabin-')).length).toBeGreaterThan(5)
  })

  test.each([...falas.keys()])('%s não fala de bloco, regra, evento, Se, então nem senão', (id) => {
    expect(falas.get(id)).not.toMatch(SO_A_IDEIA)
    // O "e" e o "ou" entram como ideia ("pede as duas peças", "uma das peças"), nunca entre aspas.
    expect(falas.get(id)).not.toMatch(
      /"e"|"ou"|\bou\b no lugar|Só contando|Na ordem\b(?! da placa)/,
    )
  })

  const ANTES: [string, RegExp][] = [
    ['symbols-start', /passo (vai|fica|vira|vale)|acende|1|2|abre/i],
    ['symbols-sun', /era a vez da lua|foi para 2|lua acendeu/i],
    ['symbols-moon', /baú abriu|abre o baú|abriu/i],
    ['symbols-opened', /voltou|volta a 0|apag/i],
    ['symbols-middle', /continuou 0|nada acendeu/i],
    ['symbols-again', /abriu o baú do mesmo jeito|recomeça pelo sol/i],
    ['symbols-count', /qualquer ordem|abriu mesmo|também abr/i],
    ['symbols-retry', /abriu/i],
    ['symbols-sun-again', /foi para 2|lua acendeu|baú abr/i],
    ['symbols-again-err', /abriu o baú do mesmo jeito|recomeça pelo sol/i],
    ['symbols-count-early', /abriu|qualquer ordem/i],
    ['symbols-count-try', /qualquer ordem|abriu|também abr/i],
    ['cabin-start', /abriu|fechada|avisou|abre/i],
    ['cabin-none', /abriu|fechada|avisou/i],
    ['cabin-one', /abriu|fechada|avisou|não basta/i],
    ['cabin-two', /abriu|fechada|avisou/i],
    ['cabin-opened', /do mesmo jeito|não importa|qualquer ordem/i],
    ['cabin-order-try', /do mesmo jeito|não importa|abriu/i],
    ['cabin-or', /já abriu|basta|uma só abre/i],
    ['cabin-or-try', /abriu|basta|fica fechada|continua fechada/i],
  ]
  test.each(ANTES)('%s não conta o resultado antes do teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
})

const tocar = (symbol: 'sol' | 'lua' | 'estrela'): SceneAction => ({ type: 'touch-symbol', symbol })
const recomecar: SceneAction = { type: 'restart-symbols' }
const contar: SceneAction = { type: 'sequence-mode', mode: 'count' }
const ordem: SceneAction = { type: 'sequence-mode', mode: 'order' }

describe('O baú dos símbolos em exploração livre', () => {
  const { play, fala } = caso('symbol-sequence')

  test('o caminho da escada fecha todas as metas e o Zappy conclui', () => {
    const caminho: SceneAction[] = [
      tocar('sol'),
      tocar('lua'),
      tocar('estrela'),
      recomecar,
      tocar('sol'),
      tocar('estrela'),
      tocar('lua'),
      tocar('sol'),
      tocar('lua'),
      tocar('estrela'),
      contar,
      tocar('estrela'),
      tocar('lua'),
      tocar('sol'),
    ]
    const fim = play(caminho)
    expect(evaluateExperimentation('symbol-sequence', fim).passed).toBe(true)
    expect(fala(caminho)).toBe('symbols-complete')
  })

  test('a fala acompanha cada passo da escada', () => {
    expect(fala([])).toBe('symbols-start')
    expect(fala([tocar('sol')])).toBe('symbols-sun')
    expect(fala([tocar('sol'), tocar('lua')])).toBe('symbols-moon')
    const aberto = [tocar('sol'), tocar('lua'), tocar('estrela')]
    expect(fala(aberto)).toBe('symbols-opened')
    const pulou = [...aberto, recomecar, tocar('sol'), tocar('estrela')]
    expect(fala(pulou)).toBe('symbols-middle')
    const meio = [...pulou, tocar('lua')]
    expect(fala(meio)).toBe('symbols-again')
    const deNovo = [...meio, tocar('sol'), tocar('lua'), tocar('estrela')]
    expect(fala(deNovo)).toBe('symbols-count')
  })

  test('quem começa pelo meio ouve o recomeço e volta ao sol', () => {
    expect(fala([tocar('lua')])).toBe('symbols-retry')
    expect(play([tocar('lua')]).evidence.discoveries).toContain('middle-start')
    expect(fala([tocar('lua'), tocar('sol')])).toBe('symbols-sun')
    // Errou antes e abriu depois: a ordem certa e o recomeço caem juntos; falta pular a lua.
    const errouAntes = [tocar('lua'), tocar('sol'), tocar('lua'), tocar('estrela')]
    expect(play(errouAntes).evidence.discoveries).toEqual(
      expect.arrayContaining(['middle-start', 'right-order', 'restart-works']),
    )
    expect(fala(errouAntes)).toBe('symbols-opened')
  })

  test('o baú que só conta: a comparação pede antes o baú que confere a vez (full review)', () => {
    expect(fala([contar])).toBe('symbols-count-early')
    // Sem o primeiro termo, a ordem errada abrindo o baú que só conta ainda não é comparação.
    const semPrimeiroTermo = [contar, tocar('estrela'), tocar('lua'), tocar('sol')]
    expect(play(semPrimeiroTermo).evidence.discoveries).not.toContain('count-vs-order')
    expect(fala(semPrimeiroTermo)).toBe('symbols-count-early')
    expect(fala([...semPrimeiroTermo, ordem])).toBe('symbols-start')
    // Visto o baú da vez responder (aqui, começando pelo meio), a comparação vale fora da ordem.
    const viuAVez = [tocar('lua'), contar]
    expect(fala(viuAVez)).toBe('symbols-count-try')
    const comparou = [...viuAVez, tocar('estrela'), tocar('lua'), tocar('sol')]
    expect(play(comparou).evidence.discoveries).toContain('count-vs-order')
    expect(fala(comparou)).toBe('symbols-count-back')
    expect(fala([...comparou, ordem])).toBe('symbols-start')
  })

  test('tocar o sol de novo com a lua acesa não diz "de 0 para 1"', () => {
    expect(play([tocar('sol'), tocar('lua'), tocar('sol')]).sequence.lit).toContain('lua')
    expect(fala([tocar('sol'), tocar('lua'), tocar('sol')])).toBe('symbols-sun-again')
  })

  test('depois de começar pelo meio, a fala pede a ordem da placa só quando já houve erro', () => {
    const aberto = [tocar('sol'), tocar('lua'), tocar('estrela')]
    const meio = [...aberto, recomecar, tocar('sol'), tocar('estrela'), tocar('lua')]
    expect(fala(meio)).toBe('symbols-again')
    // Recomeçou: ainda não errou nesta partida, então o pedido é errar primeiro.
    expect(fala([...meio, recomecar])).toBe('symbols-again-err')
  })

  test('desfazer restaura as descobertas e a fala daquela tentativa', () => {
    const start: SceneStart = { scene: 'symbol-sequence', setup: { freeExploration: true } }
    const activity: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'symbol-sequence',
      cenario: 'farol',
      setup: { freeExploration: true },
    }
    let s = initialExperiment(start)
    for (const a of [tocar('sol'), tocar('lua')]) s = stepExperiment(start, s, a).session
    expect(s.state.evidence.discoveries).toContain('step-moves')
    s = stepExperiment(start, s, { type: 'undo' }).session
    expect(s.state.evidence.discoveries).not.toContain('step-moves')
    expect(discoveryGuidance(activity, s.state)?.id).toBe('symbols-sun')
  })

  test('fora da exploração livre, o baú que só conta ainda pede a ordem certa antes', () => {
    const start: SceneStart = { scene: 'symbol-sequence' }
    const s = [contar, tocar('estrela'), tocar('lua'), tocar('sol')].reduce(
      (e, a) => stepScene(start, e, a),
      openScene(start),
    )
    expect(s.evidence.discoveries).not.toContain('count-vs-order')
  })
})

const pegar = (piece: 'key' | 'emblem'): SceneAction => ({ type: 'take-piece', piece })
const encostar: SceneAction = { type: 'try-cabin' }
const nova: SceneAction = { type: 'restart-cabin' }
const uma: SceneAction = { type: 'cabin-rule', rule: 'or' }
const duas: SceneAction = { type: 'cabin-rule', rule: 'and' }

describe('O segredo da cabana em exploração livre', () => {
  const { play, fala } = caso('two-pieces')

  test('o caminho da escada fecha todas as metas e o Zappy conclui', () => {
    const caminho: SceneAction[] = [
      encostar,
      pegar('key'),
      encostar,
      pegar('emblem'),
      encostar,
      nova,
      pegar('emblem'),
      pegar('key'),
      encostar,
      uma,
      nova,
      pegar('key'),
      encostar,
    ]
    expect(evaluateExperimentation('two-pieces', play(caminho)).passed).toBe(true)
    expect(fala(caminho)).toBe('cabin-complete')
  })

  test('a fala acompanha cada passo da escada', () => {
    expect(fala([])).toBe('cabin-start')
    expect(fala([encostar])).toBe('cabin-after-none')
    expect(fala([encostar, pegar('key')])).toBe('cabin-one')
    expect(fala([encostar, pegar('key'), encostar])).toBe('cabin-after-closed')
    const abriu = [encostar, pegar('key'), encostar, pegar('emblem'), encostar]
    expect(fala(abriu)).toBe('cabin-opened')
    expect(fala([...abriu, nova, pegar('emblem'), pegar('key')])).toBe('cabin-order-try')
    const outraOrdem = [...abriu, nova, pegar('emblem'), pegar('key'), encostar]
    expect(fala(outraOrdem)).toBe('cabin-or')
    expect(fala([...outraOrdem, uma])).toBe('cabin-or-try')
  })

  test('quem pega as duas peças primeiro testa as duas e depois é chamado aos casos sem elas', () => {
    expect(fala([pegar('emblem')])).toBe('cabin-one')
    expect(fala([pegar('emblem'), pegar('key')])).toBe('cabin-two')
    const abriu = [pegar('emblem'), pegar('key'), encostar]
    expect(fala(abriu)).toBe('cabin-opened-closed')
    expect(fala([...abriu, nova])).toBe('cabin-none')
    expect(fala([pegar('key'), encostar])).toBe('cabin-after-one')
  })

  test('quem começa pedindo uma das peças é chamado de volta depois de testar', () => {
    expect(fala([uma])).toBe('cabin-or-try')
    const abriuComUma = [uma, pegar('key'), encostar]
    expect(play(abriuComUma).evidence.discoveries).toContain('and-vs-or')
    expect(fala(abriuComUma)).toBe('cabin-back-and')
    // De volta às duas peças com a cabana aberta: só uma partida nova a fecha.
    expect(fala([...abriuComUma, duas])).toBe('cabin-restart')
    expect(fala([...abriuComUma, duas, nova])).toBe('cabin-none')
  })

  test('trocar o pedido com o personagem na porta tira a resposta antiga (full review)', () => {
    const naPorta = play([encostar])
    expect(naPorta.pieces.at).toBe('door')
    const trocou = play([encostar, uma])
    expect(trocou.pieces.at).toBeNull()
    expect(trocou.pieces.rule).toBe('or')
    // A resposta nova só vem do próximo encontro.
    expect(play([encostar, uma, pegar('key'), encostar]).evidence.discoveries).toContain(
      'and-vs-or',
    )
  })

  test('desfazer restaura as descobertas e a fala daquela tentativa', () => {
    const start: SceneStart = { scene: 'two-pieces', setup: { freeExploration: true } }
    const activity: ExperimentationActivity = {
      type: 'experimentation',
      scene: 'two-pieces',
      cenario: 'farol',
      setup: { freeExploration: true },
    }
    let s = initialExperiment(start)
    s = stepExperiment(start, s, encostar).session
    expect(discoveryGuidance(activity, s.state)?.id).toBe('cabin-after-none')
    s = stepExperiment(start, s, { type: 'undo' }).session
    expect(s.state.evidence.discoveries).not.toContain('none-closed')
    expect(discoveryGuidance(activity, s.state)?.id).toBe('cabin-start')
  })
})
