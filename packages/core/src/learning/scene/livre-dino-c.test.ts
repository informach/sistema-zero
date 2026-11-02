import { describe, expect, test } from 'bun:test'
import {
  aproximarAte,
  area,
  CAMINHOS_LIVRES_DINO_C,
  cincoSegundos,
  distancia,
  enter,
  escutarTudo,
  inicio,
  pergunta,
  ponto,
  segundo,
  sinal,
  somar,
  tocar,
  voltar,
} from '../../../tests/fixtures/caminhos-livres/dino-c'
import type { SceneAction, SceneId } from './actions'
import { openScene, stepScene } from './engine'
import { discoveryGuidance, discoverySpeechSteps, type ExperimentationActivity } from './index'
import { initialExperiment, stepExperiment } from './session'
import type { SceneStart } from './state'
import { SCENE_SPEECH_SLOTS } from './voz'

/**
 * A exploração livre das cenas `controls`, `hitbox`, `score`, `number-line` e `acceleration` (Corre
 * Dino, frente C, 02/11/2026): a experiência trabalha só a IDEIA e convida à investigação. Antes do
 * teste, o Zappy pergunta e diz o que observar; o resultado só aparece na fala de DEPOIS dele.
 */
const caso = (scene: SceneId, goals?: string[]): ExperimentationActivity => ({
  type: 'experimentation',
  scene,
  cenario: 'corre-dino',
  setup: { freeExploration: true, ...(goals ? { goals } : {}) },
})

/** As experiências como o manifesto as terá (a `hitbox` em duas: aulas 9 e 10). */
export const CONVITE = caso('controls', ['missing-touch', 'start-key', 'start-tap'])
export const CONTATO = caso('hitbox', ['contact'])
export const AREA = caso('hitbox', ['contact', 'area-contrast', 'too-small'])
export const PLACAR = caso('score', [
  'score-runaway',
  'score-idle-wrong',
  'score-start',
  'score-playing',
  'score-end',
])
export const RETA = caso('number-line', ['colder', 'greater', 'stops', 'silent'])
export const ACELERACAO = caso('acceleration', [
  'old-speed',
  'base-limit',
  'variation-limit',
  'past-limit',
])

const ATIVIDADES = [CONVITE, CONTATO, AREA, PLACAR, RETA, ACELERACAO]
const CENAS = ['controls', 'hitbox', 'score', 'number-line', 'acceleration'] as const

const start = (activity: ExperimentationActivity): SceneStart => ({
  scene: activity.scene,
  setup: activity.setup,
})
const jogar = (activity: ExperimentationActivity, actions: SceneAction[]) =>
  actions.reduce((s, a) => stepScene(start(activity), s, a), openScene(start(activity)))
const fala = (activity: ExperimentationActivity, actions: SceneAction[]) =>
  discoveryGuidance(activity, jogar(activity, actions))?.id
const descobertas = (activity: ExperimentationActivity, actions: SceneAction[]) =>
  jogar(activity, actions).evidence.discoveries

const falas = new Map(
  CENAS.flatMap((scene) => discoverySpeechSteps(scene).map(({ id, text }) => [id, text] as const)),
)

describe('Corre Dino (frente C): o Zappy fala só da ideia', () => {
  test('cada cena tem as falas próprias, com o id da cena na frente', () => {
    for (const scene of CENAS) {
      const ids = discoverySpeechSteps(scene).map((f) => f.id)
      expect(ids.length).toBeGreaterThan(3)
      for (const id of ids) expect(id.startsWith(`${scene}-`)).toBe(true)
    }
  })

  test.each([...falas.keys()])('%s não fala de bloco, regra, Se, então, senão nem código', (id) => {
    const texto = falas.get(id) ?? ''
    expect(texto).not.toMatch(
      /\bregra|\bbloco|\bentão\b|\bsenão\b|comando|código|\bcampo\b|\bevento|Somar ponto|estado do jogo|Quando apertar|Distância do cacto|Tamanho da área|condição|valor da base|Mudar velocidade|\binicio\b|\bjogando ?\?/i,
    )
    expect(texto).not.toMatch(/A cada quadro do jogo|a cada quadro do jogo/)
    // "Se" com maiúscula é o nome do bloco; "se" no meio da frase é português.
    expect(texto).not.toMatch(/\bSe\b/)
    // A instrução de clique é sempre "Clique em <rótulo>".
    expect(texto).not.toMatch(/\baperte\b|\baperta\b/i)
  })

  const ANTES: [string, RegExp][] = [
    ['controls-start', /nada aconteceu|nada acontece|não ouve|não fez nada|começou/i],
    ['controls-enter', /partida começou|começou a partida/i],
    ['controls-enter-first', /partida começou|começou a partida/i],
    ['controls-toque', /toque também|toque começ|não fez nada/i],
    ['controls-toque-first', /toque também|toque começ|não fez nada|partida começou/i],
    [
      'hitbox-start',
      /\bvão\b|separados|não olha o desenho|quem se encostou|se encostaram|é por elas|decide se/i,
    ],
    ['hitbox-area', /batida sumiu|não bateu|desapareceu/i],
    ['hitbox-area-perto', /batida sumiu|não bateu|desapareceu/i],
    ['hitbox-small', /não marcou|não marca|pequena demais/i],
    ['hitbox-small-first', /não marcou|não marca|pequena demais|batida sumiu/i],
    ['score-start', /60 pontos|dispara/i],
    ['score-solto', /cresceu na tela de início|cresce até|até na tela de início/i],
    ['score-solto-first', /cresceu|cresce até|dispara/i],
    ['score-espera', /esperou|resposta foi não|não cresce|parado/i],
    ['score-jogando', /resposta foi sim|um ponto a cada segundo|cresceu um/i],
    ['score-jogando-first', /resposta foi|um ponto a cada segundo|cresceu|esperou/i],
    ['score-fim', /parou|parado|ficou|o placar espera/i],
    ['number-line-start', /para a esquerda|ficou menor/i],
    ['number-line-maior', /resposta foi sim|mora à direita|maior que -9[^?]/i],
    ['number-line-maior-first', /resposta foi|mora à direita|maior que -9[^?]|esquerda/i],
    ['number-line-para', /resposta virou|não é maior|para de diminuir|base para/i],
    [
      'number-line-para-first',
      /resposta (foi|virou)|não é maior|para de diminuir|base para|direita/i,
    ],
    ['number-line-igual', /não em todo lugar|só no -9|menos no -9/i],
    ['number-line-igual-first', /não em todo lugar|só no -9|menos no -9|resposta foi|virou/i],
    // A velocidade dos cactos novos e o sorteio são o que os testes mostram (os antigos guardam, o -10).
    ['acceleration-start', /guardaram|não mudaram|não mudam|guardam|cactos novos|sorteio|-10/i],
    ['acceleration-para', /parou|para ali|resposta da pergunta foi não|fica no -9/i],
    ['acceleration-para-first', /parou|para ali|resposta (da pergunta )?foi|fica no -9|guardaram/i],
    ['acceleration-sorteio', /-10|sorteio vem depois/i],
    ['acceleration-sem', /passa do -9|passou do -9|não para/i],
    ['acceleration-sem-first', /passa do -9|passou do -9|não para|-10|parou/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })

  test('a reta vem antes da base (aula 12): nenhuma fala da reta fala da base', () => {
    for (const [id, texto] of falas)
      if (id.startsWith('number-line-'))
        expect({ id, base: /\bbase\b/i.test(texto) }).toEqual({ id, base: false })
  })

  test('toda fala de antes tem a sua regra (nenhuma fala nova escapa da conferência)', () => {
    const conferidas = new Set(ANTES.map(([id]) => id))
    for (const id of falas.keys())
      if (!id.includes('complete')) expect(conferidas.has(id)).toBe(true)
  })

  test('as falas podem ter a pronúncia ajustada no Admin', () => {
    const slots = new Set<string>(SCENE_SPEECH_SLOTS)
    for (const id of falas.keys()) expect(slots.has(`discovery:${id}`)).toBe(true)
  })
})

describe('Corre Dino (frente C): os caminhos completam as metas', () => {
  test.each(
    ATIVIDADES.map((a) => [a.scene, a.setup?.goals?.join(', '), a] as const),
  )('%s (%s)', (scene, _metas, activity) => {
    const caminho = CAMINHOS_LIVRES_DINO_C[scene] ?? []
    for (const a of caminho) if (a.type === 'advance') expect(a.seconds).toBeLessThanOrEqual(1)
    const s = jogar(activity, caminho)
    for (const meta of activity.setup?.goals ?? []) expect(s.evidence.discoveries).toContain(meta)
    const fim = discoveryGuidance(activity, s)?.id
    expect(fim).toBe(activity === CONTATO ? 'hitbox-complete-contact' : `${scene}-complete`)
  })

  test('sem metas no bloco, a fala segue a missão de fábrica', () => {
    for (const scene of CENAS) {
      const activity = caso(scene)
      expect(fala(activity, CAMINHOS_LIVRES_DINO_C[scene] ?? [])).toBe(`${scene}-complete`)
    }
  })
})

describe('controls: o que o jogo escuta para começar', () => {
  test('a fala segue o curso: o toque escutando só o Enter, o Enter, o toque escutando tudo', () => {
    expect(fala(CONVITE, [])).toBe('controls-start')
    expect(fala(CONVITE, [tocar])).toBe('controls-enter')
    expect(fala(CONVITE, [tocar, enter])).toBe('controls-toque')
    expect(fala(CONVITE, [tocar, enter, inicio, escutarTudo(true), tocar])).toBe(
      'controls-complete',
    )
  })

  test('quem começa pelo outro jeito ouve o pedido de antes, sem explicação do que não viu', () => {
    // Escutando tudo, o toque começa: falta o toque que não faz nada, que é o começo da ordem.
    expect(fala(CONVITE, [escutarTudo(true), tocar])).toBe('controls-start')
    // O toque que não fez nada visto depois: falta o Enter, e o toque de antes já foi visto.
    expect(fala(CONVITE, [escutarTudo(true), tocar, inicio, escutarTudo(false), tocar])).toBe(
      'controls-enter',
    )
    // O Enter primeiro: falta o toque escutando só o Enter.
    expect(fala(CONVITE, [enter])).toBe('controls-start')
    // Pulando o Enter de propósito num bloco que não o cobra.
    const semEnter = caso('controls', ['missing-touch', 'start-tap'])
    expect(fala(semEnter, [tocar])).toBe('controls-toque-first')
  })
})

describe('hitbox: a área de contato e o desenho', () => {
  test('aula 9: o BATEU com os desenhos separados fecha, e o fim não fala da área menor', () => {
    expect(fala(CONTATO, [])).toBe('hitbox-start')
    expect(fala(CONTATO, aproximarAte(59))).toBe('hitbox-start')
    expect(fala(CONTATO, aproximarAte(49))).toBe('hitbox-complete-contact')
  })

  test('aula 10: a fala segue as três áreas', () => {
    expect(fala(AREA, aproximarAte(49))).toBe('hitbox-area')
    // Perto demais (com 80% ainda bateria): a fala pede para voltar ao primeiro BATEU.
    expect(fala(AREA, [...aproximarAte(49), distancia(39)])).toBe('hitbox-area-perto')
    expect(fala(AREA, [...aproximarAte(49), area(80)])).toBe('hitbox-small')
    expect(fala(AREA, [...aproximarAte(49), area(80), distancia(39), area(40)])).toBe(
      'hitbox-complete',
    )
  })

  test('a área bem pequena testada primeiro: o Zappy pede o BATEU antes', () => {
    const pequena = [area(40), ...aproximarAte(39)]
    expect(descobertas(AREA, pequena)).toContain('too-small')
    expect(fala(AREA, pequena)).toBe('hitbox-start')
    // Sem o contraste no bloco, o pedido da área pequena vem sem a explicação dele.
    const semContraste = caso('hitbox', ['contact', 'too-small'])
    expect(fala(semContraste, aproximarAte(49))).toBe('hitbox-small-first')
  })

  test('os apelidos de caso (early-hit, fair-hit) seguem o mesmo passo', () => {
    const apelidos = caso('hitbox', ['early-hit', 'fair-hit', 'too-small'])
    expect(fala(apelidos, aproximarAte(49))).toBe('hitbox-area')
    expect(fala(apelidos, [...aproximarAte(49), area(80)])).toBe('hitbox-small')
    expect(fala(apelidos, CAMINHOS_LIVRES_DINO_C.hitbox ?? [])).toBe('hitbox-complete')
  })

  test('o BATEU com vão só cai com a área inteira (as escolhas da tela são 100, 80 e 40)', () => {
    for (const pct of [80, 40])
      for (let d = 260; d >= 20; d -= 1)
        expect(descobertas(AREA, [area(pct), distancia(d)])).not.toContain('contact')
  })
})

describe('score: quando o ponto soma', () => {
  test('a fala segue o curso: a cada quadro, solto, com a pergunta no início, jogando, no fim', () => {
    const passos: [SceneAction[], string][] = [
      [[], 'score-start'],
      [[ponto('frame', false), segundo], 'score-solto'],
      [[ponto('frame', false), segundo, ponto('second', false), segundo], 'score-espera'],
      [
        [ponto('frame', false), segundo, ponto('second', false), segundo, ponto('second', true)],
        'score-espera',
      ],
      [(CAMINHOS_LIVRES_DINO_C.score ?? []).slice(0, 6), 'score-jogando'],
      [(CAMINHOS_LIVRES_DINO_C.score ?? []).slice(0, 8), 'score-fim'],
    ]
    for (const [acoes, esperada] of passos) expect(fala(PLACAR, acoes)).toBe(esperada)
  })

  test('quem testa a partida antes ouve o pedido do começo, e depois o pedido sem explicação', () => {
    const jogandoPrimeiro = [ponto('second', true), enter, segundo]
    expect(descobertas(PLACAR, jogandoPrimeiro)).toContain('score-playing')
    expect(fala(PLACAR, jogandoPrimeiro)).toBe('score-start')
    // Um bloco que não cobra o placar disparado nem o solto pede a partida sem explicar nada.
    const soAPartida = caso('score', ['score-playing'])
    expect(fala(soAPartida, [])).toBe('score-jogando-first')
    expect(fala(soAPartida, jogandoPrimeiro)).toBe('score-complete-parcial')
  })
})

describe('number-line: a reta e a pergunta', () => {
  test('a fala segue o curso: somar -1, o > no -5, o > no -9, o = do -5 ao -9', () => {
    expect(fala(RETA, [])).toBe('number-line-start')
    expect(fala(RETA, somar(3))).toBe('number-line-maior')
    expect(fala(RETA, [...somar(3), voltar, sinal('>')])).toBe('number-line-para')
    expect(fala(RETA, [...somar(3), voltar, sinal('>'), ...somar(4)])).toBe('number-line-igual')
  })

  test('o sinal escolhido primeiro: a fala pede o -1 e depois segue sem repetir', () => {
    expect(fala(RETA, [sinal('>')])).toBe('number-line-start')
    // Com o > e três -1, o marcador vai ao -8: o -1 e o > no -5 já foram vistos.
    expect(fala(RETA, [sinal('>'), ...somar(3)])).toBe('number-line-para')
  })

  test('"Voltar ao começo" guarda as descobertas e o sinal; "Recomeçar experiência" apaga', () => {
    const s = { scene: RETA.scene, setup: RETA.setup } satisfies SceneStart
    const sessao = [...somar(3), sinal('>')].reduce(
      (x, a) => stepExperiment(s, x, a).session,
      initialExperiment(s),
    )
    const voltou = stepExperiment(s, sessao, voltar).session.state
    expect(voltou.numberLine.value).toBe(-5)
    expect(voltou.numberLine.operator).toBe('>')
    expect(voltou.evidence.discoveries).toEqual(sessao.state.evidence.discoveries)
    expect(stepExperiment(s, sessao, { type: 'reset' }).session.state.evidence.discoveries).toEqual(
      [],
    )
  })
})

describe('acceleration: a base, os cactos e a pergunta', () => {
  const zero = cincoSegundos(0.1)
  const menosUm = cincoSegundos(0.9)
  test('a fala segue o curso: os cactos guardam, a base para, o -10, sem a pergunta', () => {
    expect(fala(ACELERACAO, [])).toBe('acceleration-start')
    expect(fala(ACELERACAO, [zero, zero])).toBe('acceleration-para')
    expect(
      fala(
        ACELERACAO,
        Array.from({ length: 5 }, () => zero),
      ),
    ).toBe('acceleration-sorteio')
    expect(fala(ACELERACAO, [...Array.from({ length: 5 }, () => zero), menosUm])).toBe(
      'acceleration-sem',
    )
  })

  test('sem a pergunta primeiro: o Zappy pede a base que para e o "Voltar ao começo"', () => {
    const semPergunta = [pergunta(false), ...Array.from({ length: 5 }, () => zero)]
    expect(descobertas(ACELERACAO, semPergunta)).toContain('past-limit')
    expect(fala(ACELERACAO, semPergunta)).toBe('acceleration-para')
  })

  test('⚠️ livre: "Voltar ao começo" guarda a pergunta como a criança deixou', () => {
    const s = jogar(ACELERACAO, [pergunta(false), zero, voltar])
    expect(s.speed.base).toBe(-5)
    expect(s.speed.limited).toBe(false)
    expect(s.crowd.cacti).toEqual([])
  })

  test('sem a exploração livre, o recomeço religa a condição como antes', () => {
    const antigo: SceneStart = { scene: 'acceleration' }
    const s = [pergunta(false), zero, { type: 'reset' } as SceneAction].reduce(
      (x, a) => stepScene(antigo, x, a),
      openScene(antigo),
    )
    expect(s.speed.limited).toBe(true)
  })
})
