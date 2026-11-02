import { describe, expect, test } from 'bun:test'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { discoveryGuidance, discoverySpeechSteps, type ExperimentationActivity } from './index'
import type { SceneStart } from './state'

/**
 * Os Poderes "A ponte apressada" e "Moedas no caminho" (Faísca, 02/11/2026): a experiência trabalha só
 * a IDEIA e convida à investigação. Antes do teste, o Zappy pergunta e diz o que observar; o resultado
 * só aparece na fala de DEPOIS dele.
 */
const falas = new Map(
  (['timed-bridge', 'coin-counter'] as const).flatMap((cena) =>
    discoverySpeechSteps(cena).map(({ id, text }) => [id, text] as const),
  ),
)

const PONTE: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'timed-bridge',
  cenario: 'farol',
  setup: { freeExploration: true },
}
const MOEDAS: ExperimentationActivity = {
  type: 'experimentation',
  scene: 'coin-counter',
  cenario: 'farol',
  setup: {
    freeExploration: true,
    goals: ['each-adds', 'no-double', 'counts-again', 'kept', 'below-goal', 'compare-rules'],
  },
}
const jogar = (activity: ExperimentationActivity, actions: SceneAction[]) => {
  const start: SceneStart = { scene: activity.scene, setup: activity.setup }
  return actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
}
const fala = (activity: ExperimentationActivity, actions: SceneAction[]) =>
  discoveryGuidance(activity, jogar(activity, actions))?.id

const puxar: SceneAction = { type: 'pull-lever' }
const esperar: SceneAction = { type: 'wait-second' }
const ponte: SceneAction = { type: 'touch-bridge' }
const recomecar: SceneAction = { type: 'restart-bridge' }
const quatro: SceneAction[] = [esperar, esperar, esperar, esperar]
const moeda = (coin: 0 | 1 | 2 | 3 | 4 | 5): SceneAction => ({ type: 'touch-coin', coin })
const afastar: SceneAction = { type: 'leave-coin' }
const bau: SceneAction = { type: 'try-chest' }

describe('Ponte e Moedas: o Zappy fala só da ideia', () => {
  test('as duas cenas têm falas próprias', () => {
    expect([...falas.keys()].filter((id) => id.startsWith('bridge-')).length).toBeGreaterThan(8)
    expect([...falas.keys()].filter((id) => id.startsWith('coin-')).length).toBeGreaterThan(8)
  })

  test.each([
    ...falas.keys(),
  ])('%s não fala de regra, bloco, então, senão, grupo, somar nem do bloco que espera', (id) => {
    expect(falas.get(id)).not.toMatch(
      /\bregra|\bbloco|\bentão\b|\bsenão\b|\bgrupo|\bsomar\b|"depois de"|depois de \d|\bfazer\b|\bcomando|\bcódigo/i,
    )
  })

  const ANTES: [string, RegExp][] = [
    ['bridge-start', /não atravess|aviso pediu|baixou/i],
    ['bridge-closed', /baixa|vira verdadeiro|virou verdadeiro/i],
    ['bridge-lowered', /subiu|sobe sozinha|atravessou/i],
    ['bridge-rose', /atravessou|sino tocou/i],
    ['bridge-crossed', /subiu|sobe sozinha|já subiu/i],
    ['bridge-again', /baixou outra vez|contar de novo|a cada puxada/i],
    ['bridge-place', /uma vez só|não sobe mais|ficou baixada/i],
    ['bridge-clock-start', /uma vez só|não sobe mais|ficou baixada/i],
    ['bridge-closed-last', /não atravess|aviso pediu/i],
    ['coin-start', /soma|somou|\+ ?1|mais 1|sobe|subiu/i],
    ['coin-first', /cada moeda/i],
    ['coin-away', /guardado|não muda|continua igual/i],
    ['coin-back', /não contou|contou de novo|continuou igual|subiu/i],
    ['coin-compare-off', /(?<!não )contou de novo|subiu outra vez/i],
    ['coin-compare-on', /não contou|continuou igual/i],
    ['coin-chest', /ficou fechado|abriu|avisou/i],
    ['coin-rules', /abriu|não abre/i],
    ['coin-rules-equals', /ficou fechado|não abriu/i],
    ['coin-rules-atleast', /abriu/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
})

describe('Ponte: a exploração livre completa as metas e a fala acompanha a ordem', () => {
  test('o caminho da história completa as seis descobertas', () => {
    const caminho: SceneAction[] = [
      ponte,
      puxar,
      esperar,
      ponte,
      recomecar,
      puxar,
      ...quatro,
      puxar,
      { type: 'timer-place', place: 'start' },
      ...quatro,
      puxar,
      ...quatro,
    ]
    const s = jogar(PONTE, caminho)
    for (const meta of [
      'closed-start',
      'lever-opens',
      'in-time',
      'rises-alone',
      'pull-again',
      'timer-place',
    ])
      expect(s.evidence.discoveries).toContain(meta)
    expect(discoveryGuidance(PONTE, s)?.id).toBe('bridge-complete')
  })

  test('atravessar logo depois de puxar também é chegar a tempo', () => {
    expect(jogar(PONTE, [puxar, ponte]).evidence.discoveries).toContain('in-time')
  })

  test('a fala segue a história e explica só o que já foi testado', () => {
    expect(fala(PONTE, [])).toBe('bridge-start')
    expect(fala(PONTE, [ponte])).toBe('bridge-closed')
    expect(fala(PONTE, [ponte, puxar])).toBe('bridge-lowered')
    expect(fala(PONTE, [ponte, puxar, ...quatro])).toBe('bridge-rose')
    expect(fala(PONTE, [ponte, puxar, ponte])).toBe('bridge-crossed')
    expect(fala(PONTE, [ponte, puxar, ponte, recomecar, puxar, ...quatro])).toBe('bridge-again')
    expect(fala(PONTE, [ponte, puxar, ponte, recomecar, puxar, ...quatro, puxar])).toBe(
      'bridge-place',
    )
  })

  test('quem puxa primeiro testa a ponte fechada no fim', () => {
    const tudoMenosFechada: SceneAction[] = [
      puxar,
      ponte,
      recomecar,
      puxar,
      ...quatro,
      puxar,
      { type: 'timer-place', place: 'start' },
      ...quatro,
      puxar,
      ...quatro,
    ]
    expect(fala(PONTE, [puxar])).toBe('bridge-lowered')
    expect(fala(PONTE, tudoMenosFechada)).toBe('bridge-clock-back')
    expect(fala(PONTE, [...tudoMenosFechada, { type: 'timer-place', place: 'lever' }])).toBe(
      'bridge-closed-last',
    )
    expect(fala(PONTE, [...tudoMenosFechada, { type: 'timer-place', place: 'lever' }, ponte])).toBe(
      'bridge-complete',
    )
  })

  test('quem escolhe o relógio da partida antes da hora é acompanhado nessa comparação', () => {
    const relogio: SceneAction = { type: 'timer-place', place: 'start' }
    expect(fala(PONTE, [relogio])).toBe('bridge-clock-start')
    // Puxou antes de o relógio da partida chegar a 4: a ponte sobe uma vez, e a comparação continua.
    expect(fala(PONTE, [relogio, puxar, ...quatro])).toBe('bridge-clock-start')
    expect(fala(PONTE, [relogio, puxar, ...quatro, puxar, ...quatro])).toBe('bridge-clock-back')
  })
})

describe('Moedas: a exploração livre completa as metas e a fala acompanha a ordem', () => {
  const desligar: SceneAction = { type: 'coin-disappears', enabled: false }
  const ligar: SceneAction = { type: 'coin-disappears', enabled: true }
  const exatamente: SceneAction = { type: 'chest-rule', rule: 'equals' }

  test('o caminho da pista direta completa as seis descobertas', () => {
    const caminho: SceneAction[] = [
      moeda(0),
      moeda(1),
      afastar,
      moeda(0),
      bau,
      desligar,
      moeda(2),
      moeda(3),
      moeda(2),
      moeda(4),
      moeda(5),
      bau,
      exatamente,
      bau,
    ]
    const s = jogar(MOEDAS, caminho)
    for (const meta of MOEDAS.setup?.goals ?? []) expect(s.evidence.discoveries).toContain(meta)
    expect(discoveryGuidance(MOEDAS, s)?.id).toBe('coin-complete')
  })

  test('a fala segue o cofrinho e depois o baú', () => {
    expect(fala(MOEDAS, [])).toBe('coin-start')
    expect(fala(MOEDAS, [moeda(0)])).toBe('coin-first')
    expect(fala(MOEDAS, [moeda(0), moeda(1)])).toBe('coin-away')
    expect(fala(MOEDAS, [moeda(0), moeda(1), afastar])).toBe('coin-back')
    expect(fala(MOEDAS, [moeda(0), moeda(1), afastar, moeda(0)])).toBe('coin-compare-off')
    expect(fala(MOEDAS, [moeda(0), moeda(1), afastar, moeda(0), desligar, moeda(2)])).toBe(
      'coin-compare-off',
    )
    expect(
      fala(MOEDAS, [moeda(0), moeda(1), afastar, moeda(0), desligar, moeda(2), moeda(3), moeda(2)]),
    ).toBe('coin-chest')
  })

  test('quem volta primeiro com o sumiço desligado é convidado a ligá-lo', () => {
    const semSumir = [desligar, moeda(0), moeda(1), afastar, moeda(0)]
    expect(fala(MOEDAS, semSumir)).toBe('coin-compare-on')
    expect(fala(MOEDAS, [...semSumir, ligar, moeda(2), moeda(3), moeda(2)])).toBe('coin-chest')
  })

  test('a pergunta do baú testada primeiro é explicada, e a outra é pedida', () => {
    const base: SceneAction[] = [
      moeda(0),
      moeda(1),
      afastar,
      moeda(0),
      bau,
      desligar,
      moeda(2),
      moeda(3),
      moeda(2),
      moeda(4),
      moeda(5),
    ]
    expect(fala(MOEDAS, base)).toBe('coin-rules')
    expect(fala(MOEDAS, [...base, bau])).toBe('coin-rules-equals')
    expect(fala(MOEDAS, [...base, exatamente, bau])).toBe('coin-rules-atleast')
  })

  test('a fala da comparação não promete 6 moedas quando a criança tem 7', () => {
    // A pista antiga deixava o sumiço desligado: as moedas repetidas levavam o número a 7.
    const sete: SceneAction[] = [
      moeda(0),
      moeda(1),
      afastar,
      moeda(0),
      bau,
      desligar,
      moeda(2),
      moeda(3),
      moeda(2),
      moeda(4),
      moeda(5),
    ]
    const s = jogar(MOEDAS, sete)
    expect(s.coins.moedas).toBe(7)
    for (const acoes of [sete, [...sete, bau], [...sete, exatamente, bau]]) {
      const estado = jogar(MOEDAS, acoes)
      const texto = discoveryGuidance(MOEDAS, estado)?.text ?? ''
      expect(texto).not.toMatch(/\b(?:6|seis)\b/)
      expect(texto).toContain('mais de 5 moedas')
    }
  })

  test('trocar a pergunta com o personagem no baú tira ele de lá, e o baú fecha', () => {
    const seis = [moeda(0), moeda(1), moeda(2), moeda(3), moeda(4), moeda(5), bau]
    expect(jogar(MOEDAS, seis).coins).toMatchObject({ at: 'chest', chest: 'open' })
    expect(jogar(MOEDAS, [...seis, exatamente]).coins).toMatchObject({ at: null, chest: 'closed' })
  })
})

describe('Ponte: o relógio da partida não engana o teste', () => {
  test('ir à ponte assim que puxa, com o relógio da partida, não conta como chegar a tempo', () => {
    const s = jogar(PONTE, [{ type: 'timer-place', place: 'start' }, puxar, ponte])
    expect(s.evidence.discoveries).not.toContain('in-time')
  })
})
