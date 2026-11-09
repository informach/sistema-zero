import { describe, expect, test } from 'bun:test'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import { discoveryGuidance, discoverySpeechSteps, type ExperimentationActivity } from './index'
import { initialExperiment, stepExperiment } from './session'
import type { SceneStart, SceneState } from './state'

/**
 * Os Poderes "O baú dos símbolos" e "O segredo da cabana" (Faísca). Desde 08/11/2026 (proposta
 * "Experiências do Faísca", aprovada) o personagem ANDA até as pedras, as peças e a porta, e o
 * Zappy fala curto, uma coisa por vez. O "e" e o "ou" são peças que se trocam na pergunta da
 * cabana, por isso aparecem entre aspas, como a criança os vê.
 */
const falas = new Map(
  (['symbol-sequence', 'two-pieces'] as const).flatMap((cena) =>
    discoverySpeechSteps(cena).map(({ id, text }) => [id, text] as const),
  ),
)
const SO_A_IDEIA =
  /\b[Rr]egra|\b[Bb]loco|\b[Ee]vento|\b[Ee]ntão\b|\b[Ss]enão\b|Quando o\b|Quando acontecer|Ao iniciar|\b[Cc]omando|\b[Cc]ódigo|\bVerdadeiro\b|temChave|temEmblema|[Cc]lique em|Tocar o|Encostar|[−+]/

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

describe('Poderes da Faísca: o Zappy fala curto, só da ideia', () => {
  test('as duas cenas têm falas próprias, com a ideia e o "No seu jogo"', () => {
    for (const p of ['symbols', 'cabin']) {
      expect(falas.get(`${p}-idea`)).toBeString()
      expect(falas.get(`${p}-bridge`)).toStartWith('No seu jogo: ')
      expect(falas.get(`${p}-complete`)).toBeString()
    }
  })

  test.each([...falas.keys()])('%s é curta e não fala de bloco, botão nem variável', (id) => {
    const texto = falas.get(id) ?? ''
    if (!/-(?:idea|bridge)$/.test(id)) expect(texto.split(/\s+/).length).toBeLessThanOrEqual(12)
    expect(texto).not.toMatch(SO_A_IDEIA)
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

  test('a fala acompanha a escada que a criança escolheu', () => {
    expect(fala([])).toBe('symbols-start')
    expect(fala([tocar('sol')])).toBe('symbols-sun')
    expect(fala([tocar('sol'), tocar('lua')])).toBe('symbols-follow')
    const aberto = [tocar('sol'), tocar('lua'), tocar('estrela')]
    // Com o baú aberto, tocar não faz nada: a fala pede para jogar de novo (full review 08/11/2026).
    expect(fala(aberto)).toBe('symbols-skip-restart')
    expect(fala([...aberto, recomecar])).toBe('symbols-skip')
    const pulou = [...aberto, recomecar, tocar('sol'), tocar('estrela')]
    expect(fala(pulou)).toBe('symbols-middle')
    const meio = [...pulou, tocar('lua')]
    expect(fala(meio)).toBe('symbols-retry')
    const deNovo = [...meio, tocar('sol'), tocar('lua'), tocar('estrela')]
    expect(fala(deNovo)).toBe('symbols-place')
  })

  test('quem começa pelo meio volta ao sol', () => {
    expect(play([tocar('lua')]).evidence.discoveries).toContain('middle-start')
    expect(fala([tocar('lua')])).toBe('symbols-start')
    expect(fala([tocar('lua'), tocar('sol')])).toBe('symbols-sun')
  })

  test('o "sem recomeçar" só vale depois de errar, com o baú fechado (full review 08/11/2026)', () => {
    // Sem erro nesta partida e com o baú aberto, seguir a placa não faz nada.
    const semErro = [
      tocar('lua'),
      recomecar,
      tocar('sol'),
      tocar('estrela'),
      recomecar,
      tocar('sol'),
      tocar('lua'),
      tocar('estrela'),
    ]
    expect(play(semErro).sequence.chest).toBe('open')
    expect(fala(semErro)).toBe('symbols-retry-restart')
    expect(fala([...semErro, recomecar])).toBe('symbols-retry-restart')
    expect(fala([...semErro, recomecar, tocar('lua')])).toBe('symbols-retry')
  })

  test('o baú que só conta: a comparação pede o baú que confere a vez antes', () => {
    // Sem ter visto o baú da ordem responder, a fala manda testar ele primeiro (full review).
    expect(fala([contar])).toBe('symbols-count-early')
    expect(fala([tocar('lua'), contar])).toBe('symbols-count')
    // Com o baú já aberto em ordem, tocar não faz nada: jogar de novo.
    const abriuEmOrdem = [tocar('lua'), contar, tocar('sol'), tocar('lua'), tocar('estrela')]
    expect(fala(abriuEmOrdem)).toBe('symbols-count-restart')
    // Sem o primeiro termo, a ordem errada abrindo o baú que só conta ainda não é comparação.
    const semPrimeiroTermo = [contar, tocar('estrela'), tocar('lua'), tocar('sol')]
    expect(play(semPrimeiroTermo).evidence.discoveries).not.toContain('count-vs-order')
    // Visto o baú da vez responder (aqui, começando pelo meio), a comparação vale fora da ordem.
    const comparou = [tocar('lua'), contar, tocar('estrela'), tocar('lua'), tocar('sol')]
    expect(play(comparou).evidence.discoveries).toContain('count-vs-order')
    expect(fala(comparou)).toBe('symbols-count-back')
    expect(fala([...comparou, ordem])).toBe('symbols-start')
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

  test('trocar ou por e com uma peça fecha a porta no novo teste', () => {
    const abriu = [uma, pegar('key'), encostar]
    expect(play(abriu).pieces.door).toBe('open')
    const fechou = play([...abriu, duas, encostar])
    expect(fechou.pieces).toMatchObject({ door: 'closed', at: 'door', temEmblema: false })
    expect(fechou.caption).toContain('continua fechada')
    expect(fechou.evidence.discoveries).toContain('one-closed')
    expect(play([...abriu, duas, encostar, uma, encostar]).pieces.door).toBe('open')
  })

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

  test('a fala acompanha a escada que a criança escolheu', () => {
    expect(fala([])).toBe('cabin-start')
    expect(fala([encostar])).toBe('cabin-one-take')
    expect(fala([encostar, pegar('key')])).toBe('cabin-one')
    expect(fala([encostar, pegar('key'), encostar])).toBe('cabin-both')
    // Com as duas na mão, vá até a cabana; sem nenhuma (jogou de novo), pegue as duas.
    expect(fala([encostar, pegar('key'), encostar, pegar('emblem')])).toBe('cabin-two')
    expect(fala([encostar, pegar('key'), encostar, nova])).toBe('cabin-both-take')
    const abriu = [encostar, pegar('key'), encostar, pegar('emblem'), encostar]
    expect(fala(abriu)).toBe('cabin-order')
    const outraOrdem = [...abriu, nova, pegar('emblem'), pegar('key'), encostar]
    expect(fala(outraOrdem)).toBe('cabin-rule')
    expect(fala([...outraOrdem, uma])).toBe('cabin-or')
  })

  test('quem pega uma peça antes de testar sem nada é chamado a jogar de novo', () => {
    expect(fala([pegar('emblem')])).toBe('cabin-start-restart')
    expect(fala([pegar('key'), encostar])).toBe('cabin-start-restart')
    expect(fala([encostar, pegar('key'), pegar('emblem')])).toBe('cabin-one-restart')
  })

  test('quem começa pedindo uma das peças é chamado de volta depois de testar', () => {
    expect(fala([uma])).toBe('cabin-or')
    const abriuComUma = [uma, pegar('key'), encostar]
    expect(play(abriuComUma).evidence.discoveries).toContain('and-vs-or')
    expect(fala(abriuComUma)).toBe('cabin-or-back')
    expect(fala([...abriuComUma, duas, nova])).toBe('cabin-start')
  })

  test('trocar o pedido com o personagem na porta tira a resposta antiga (full review)', () => {
    const naPorta = play([encostar])
    expect(naPorta.pieces.at).toBe('door')
    const trocou = play([encostar, uma])
    expect(trocou.pieces.at).toBeNull()
    expect(trocou.pieces.rule).toBe('or')
    // A resposta nova só vem do próximo encontro. Na tela, o personagem continua parado na porta,
    // e a cabana pergunta de novo na hora: é esse o próximo encontro.
    expect(play([encostar, uma, encostar]).pieces.at).toBe('door')
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
    expect(discoveryGuidance(activity, s.state)?.id).toBe('cabin-one-take')
    s = stepExperiment(start, s, { type: 'undo' }).session
    expect(s.state.evidence.discoveries).not.toContain('none-closed')
    expect(discoveryGuidance(activity, s.state)?.id).toBe('cabin-start')
  })
})
