import { describe, expect, test } from 'bun:test'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { ponteGuidance } from './guidance-ponte'
import { discoveryGuidance, discoverySpeechSteps, type ExperimentationActivity } from './index'
import type { SceneStart } from './state'

/**
 * Os Poderes "A ponte apressada" e "Moedas no caminho" (Faísca). Desde 08/11/2026 (proposta
 * "Experiências do Faísca", aprovada) o personagem ANDA até a alavanca, a ponte, as moedas e o baú,
 * e o Zappy fala curto, uma coisa por vez, na língua da tela nova (sem os botões de antes).
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
const relogio: SceneAction = { type: 'timer-place', place: 'start' }
const moeda = (coin: 0 | 1 | 2 | 3 | 4 | 5): SceneAction => ({ type: 'touch-coin', coin })
const afastar: SceneAction = { type: 'leave-coin' }
const bau: SceneAction = { type: 'try-chest' }

describe('Ponte e Moedas: o Zappy fala curto, só da ideia', () => {
  test('as duas cenas têm falas próprias, com a ideia e o "No seu jogo"', () => {
    for (const p of ['bridge', 'coin']) {
      expect(falas.get(`${p}-idea`)).toBeString()
      expect(falas.get(`${p}-bridge`)).toStartWith('No seu jogo: ')
      expect(falas.get(`${p}-complete`)).toBeString()
    }
  })

  test.each([...falas.keys()])('%s é curta e não fala de bloco, botão nem variável', (id) => {
    const texto = falas.get(id) ?? ''
    if (!/-(?:idea|bridge)$/.test(id)) expect(texto.split(/\s+/).length).toBeLessThanOrEqual(12)
    expect(texto).not.toMatch(
      /\bregra|\bbloco|\bentão\b|\bsenão\b|\bgrupo|\bcomando|\bcódigo|ponteAberta|[Cc]lique em|Encostar|Esperar 1 segundo|Afastar|[−+]/,
    )
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
      relogio,
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

  test('a fala segue o que a criança já viu', () => {
    expect(fala(PONTE, [])).toBe('bridge-start')
    expect(fala(PONTE, [ponte])).toBe('bridge-closed')
    expect(fala(PONTE, [ponte, puxar])).toBe('bridge-hurry')
    expect(fala(PONTE, [ponte, puxar, ponte])).toBe('bridge-crossed')
    // Na pedra a alavanca não responde: a fala manda jogar de novo (full review 08/11/2026).
    expect(falas.get('bridge-crossed')).toContain('Jogue de novo')
    expect(fala(PONTE, [ponte, puxar, ...quatro])).toBe('bridge-rose')
    expect(fala(PONTE, [ponte, puxar, ponte, recomecar, puxar])).toBe('bridge-wait')
    const subiu = [ponte, puxar, ponte, recomecar, puxar, ...quatro]
    expect(fala(PONTE, subiu)).toBe('bridge-rose')
    expect(fala(PONTE, [...subiu, puxar, ponte])).toBe('bridge-crossed-again')
    expect(fala(PONTE, [...subiu, puxar, ponte, recomecar])).toBe('bridge-place')
  })

  test('com o relógio da partida, a fala acompanha o relógio que conta', () => {
    expect(fala(PONTE, [relogio])).toBe('bridge-clock-start')
    expect(fala(PONTE, [relogio, esperar])).toBe('bridge-clock-running')
    expect(fala(PONTE, [relogio, esperar, puxar])).toBe('bridge-clock-lowered')
    expect(fala(PONTE, [relogio, ...quatro])).toBe('bridge-clock-again')
    expect(fala(PONTE, [relogio, ...quatro, puxar])).toBe('bridge-clock-wait')
    expect(fala(PONTE, [relogio, ...quatro, puxar, ...quatro])).toBe('bridge-clock-back')
  })

  test('na tela, o relógio da partida corre desde o primeiro passo (antes de 1 segundo)', () => {
    const s = jogar(PONTE, [relogio])
    const has = (id: string) => s.evidence.discoveries.includes(id)
    expect(ponteGuidance(s, has)).toBe('bridge-clock-start')
    expect(ponteGuidance(s, has, { rodando: true })).toBe('bridge-clock-running')
  })
})

describe('Moedas: a exploração livre completa as metas e a fala acompanha a ordem', () => {
  const desligar: SceneAction = { type: 'coin-disappears', enabled: false }
  const exatamente: SceneAction = { type: 'chest-rule', rule: 'equals' }

  test('o caminho completa as seis descobertas', () => {
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
    const umaVez = [moeda(0), moeda(1), afastar, moeda(0)]
    expect(fala(MOEDAS, umaVez)).toBe('coin-compare-off')
    expect(fala(MOEDAS, [...umaVez, desligar])).toBe('coin-compare-again')
    // Quatro moedas: o baú com menos de 5.
    expect(fala(MOEDAS, [...umaVez, desligar, moeda(2), afastar, moeda(2)])).toBe('coin-chest')
    // Cinco moedas: jogar de novo para levar menos de 5.
    expect(fala(MOEDAS, [...umaVez, desligar, moeda(2), moeda(3), moeda(2)])).toBe(
      'coin-chest-restart',
    )
    // Sem nenhuma moeda (logo depois de jogar de novo), pegar algumas antes (full review).
    expect(
      fala(MOEDAS, [...umaVez, desligar, moeda(2), afastar, moeda(2), { type: 'restart-coins' }]),
    ).toBe('coin-chest-take')
  })

  test('com o sumiço desligado desde o começo, a fala pede para religar (full review 08/11/2026)', () => {
    // A moeda que não some (`no-double`) só aparece com o sumiço ligado: a fala precisa pedir.
    const semSumico: SceneAction[] = [desligar, moeda(0), moeda(1), afastar, moeda(0)]
    const s = jogar(MOEDAS, semSumico)
    expect(s.evidence.discoveries).toContain('counts-again')
    expect(s.evidence.discoveries).not.toContain('no-double')
    expect(fala(MOEDAS, semSumico)).toBe('coin-compare-on')
  })

  test('a comparação das perguntas do baú: ir até ele e, parado lá, trocar a peça', () => {
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
    expect(fala(MOEDAS, base)).toBe('coin-rules-go')
    expect(fala(MOEDAS, [...base, bau])).toBe('coin-rules-swap')
  })

  test('a fala da comparação não promete 6 moedas quando a criança tem 7', () => {
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
    expect(jogar(MOEDAS, sete).coins.moedas).toBe(7)
    for (const acoes of [sete, [...sete, bau], [...sete, exatamente, bau]]) {
      const texto = discoveryGuidance(MOEDAS, jogar(MOEDAS, acoes))?.text ?? ''
      expect(texto).not.toMatch(/\b(?:6|seis)\b/i)
    }
  })

  test('trocar a pergunta com o personagem no baú tira ele de lá, e o baú fecha', () => {
    const seis = [moeda(0), moeda(1), moeda(2), moeda(3), moeda(4), moeda(5), bau]
    expect(jogar(MOEDAS, seis).coins).toMatchObject({ at: 'chest', chest: 'open' })
    expect(jogar(MOEDAS, [...seis, exatamente]).coins).toMatchObject({ at: null, chest: 'closed' })
    // A tela pergunta de novo na hora (o personagem continua parado no baú): é outro teste.
    const s = jogar(MOEDAS, [...seis, exatamente, bau])
    expect(s.coins).toMatchObject({ at: 'chest', chest: 'closed' })
    expect(s.evidence.discoveries).toContain('compare-rules')
  })
})

describe('Ponte: o relógio da partida não engana o teste', () => {
  test('ir à ponte assim que puxa, com o relógio da partida, não conta como chegar a tempo', () => {
    const s = jogar(PONTE, [relogio, puxar, ponte])
    expect(s.evidence.discoveries).not.toContain('in-time')
  })
})
