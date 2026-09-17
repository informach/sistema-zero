import { describe, expect, test } from 'bun:test'
import type { SceneAction, SceneId, SceneSetup } from './actions'
import { sceneModel } from './catalog'
import {
  openScene,
  PARADA_DO_SALTO,
  sceneConnectRunsClock,
  sceneJumpLeftView,
  stepScene,
  TOPO_DO_SALTO,
} from './engine'
import { evaluateExperimentation, sceneHint, sceneSuccess } from './evaluate'
import { type DemonstrationActivity, sceneScript, sceneStart } from './index'
import { SCENE_QUESTIONS } from './questions'
import { sceneReadout, sceneSituation } from './readout'
import {
  applyDemonstrationSegment,
  initialDemonstration,
  initialExperiment,
  packDemonstration,
  packExperiment,
  readDemonstrationSession,
  readExperimentSession,
  stepDemonstration,
  stepExperiment,
} from './session'
import {
  type SceneState,
  sceneAreaPercent,
  sceneAreaWidth,
  sceneContact,
  sceneDrawingsGap,
} from './state'

/**
 * Os consertos dos dois reviews da onda A do lote 5 do Raio-X (16/09/2026), no MOTOR.
 *
 * Relatório: `community-kids/tmp/storyboard/implementacao/consertos-lote5-ondaA.md`. Cada `describe`
 * reprova sem o conserto dele (conferido desfazendo o conserto). As sessões guardadas são montadas
 * pelo motor e passam pelo `pack*`/`read*Session`, que é o caminho do banco.
 */

const FATIA = 0.05

function crianca(scene: SceneId, setup?: SceneSetup) {
  const start = setup ? { scene, setup } : { scene }
  let estado: SceneState = openScene(start)
  const api = {
    start,
    get estado() {
      return estado
    },
    set estado(s: SceneState) {
      estado = s
    },
    faz(...acoes: SceneAction[]) {
      for (const a of acoes) estado = stepScene(start, estado, a)
      return api
    },
    tempo(segundos: number) {
      for (let i = 0; i < Math.round(segundos / FATIA); i++)
        estado = stepScene(start, estado, { type: 'advance', seconds: FATIA })
      return api
    },
    viu: (meta: string) => estado.evidence.discoveries.includes(meta),
  }
  return api
}

const cinco = (unit = 0.3): SceneAction => ({
  type: 'sample',
  kind: 'velocity',
  unit,
  guided: false,
})

describe('A1 · acceleration: a ordem invertida não tranca as metas sem dizer', () => {
  test('⚠️⚠️ desligar a condição antes leva a base a −10, e religar diz o gesto que destrava', () => {
    const c = crianca('acceleration')
    c.faz({ type: 'connect', port: 'limit', enabled: false })
    for (let i = 0; i < 5; i++) c.faz(cinco())
    expect(c.viu('past-limit')).toBe(true)
    expect(c.estado.speed.base).toBe(-10)
    c.faz({ type: 'connect', port: 'limit', enabled: true }, cinco())
    // A base não volta (é a condição do Estúdio), e a frase diz o estado e o gesto.
    expect(c.estado.speed.base).toBe(-10)
    expect(c.estado.caption).toBe(
      'Passaram 5 segundos: a base continua em −10. Recomece para ver a base parar em −9.',
    )
    // A pista, em qualquer degrau, diz o mesmo: a escada pedia o que já não funciona.
    for (const nivel of [1, 2, 3])
      expect(sceneHint('acceleration', c.estado, nivel)).toContain('Recomece para ver a base parar')
    // Depois de Recomeçar volta a ser possível, e a frase volta ao normal.
    c.faz({ type: 'reset' })
    for (let i = 0; i < 9 && !c.viu('variation-limit'); i++) c.faz(cinco())
    expect(c.viu('base-limit')).toBe(true)
    expect(c.viu('variation-limit')).toBe(true)
    expect(c.estado.caption).not.toContain('Recomece')
  })

  test('⚠️⚠️ a sessão guardada com a base em −11 e a placa desligada reabre e diz como sair', () => {
    const start = { scene: 'acceleration' as const }
    // A ordem invertida: desligar a placa primeiro e deixar a base passar de −9.
    let guardada = stepExperiment(start, initialExperiment(start), {
      type: 'connect',
      port: 'limit',
      enabled: false,
    }).session
    for (let i = 0; i < 5; i++) guardada = stepExperiment(start, guardada, cinco()).session
    expect(guardada.state.speed.base).toBeLessThan(-9)
    // Pelo caminho do banco: empacota, relê e continua.
    const sessao = readExperimentSession('acceleration', packExperiment('acceleration', guardada))
    expect(sessao).not.toBeNull()
    if (!sessao) return
    expect(sessao.state.speed.limited).toBe(false)
    // ⚠️ O valor EXATO: cinco sorteios de 0,3 com a placa desligada param a base em −10, e é ele
    // que tem de atravessar o pacote (comparar a sessão relida com a guardada não fixaria nada).
    expect(sessao.state.speed.base).toBe(-10)
    expect(guardada.state.speed.base).toBe(-10)
    let s = stepExperiment(start, sessao, { type: 'connect', port: 'limit', enabled: true }).session
    s = stepExperiment(start, s, cinco()).session
    expect(s.state.caption).toContain('Recomece para ver a base parar em −9')
    expect(sceneHint('acceleration', s.state, 1)).toContain('Recomece')
  })

  test('com as duas metas feitas, voltar a religar não pede Recomeçar', () => {
    const c = crianca('acceleration')
    for (let i = 0; i < 9 && !c.viu('variation-limit'); i++) c.faz(cinco())
    c.faz({ type: 'connect', port: 'limit', enabled: false })
    for (let i = 0; i < 3; i++) c.faz(cinco())
    c.faz({ type: 'connect', port: 'limit', enabled: true }, cinco())
    expect(c.estado.caption).not.toContain('Recomece')
    expect(sceneHint('acceleration', c.estado, 1)).not.toContain('Recomece')
  })
})

describe('A3 · a demonstração com o roteiro que ENCOLHEU recomeça, sem lançar', () => {
  test('⚠️⚠️ a sessão parada na 4ª etapa reabre com o roteiro de 3, no player e no servidor', () => {
    // O roteiro do bloco pode ENCOLHER a qualquer momento: a professora tira uma etapa do roteiro
    // autoral e as sessões em andamento apontam para uma etapa que não existe mais. Antes, o
    // primeiro tique LANÇAVA "Etapa de demonstração inválida." no player e o members respondia 500.
    const activity: DemonstrationActivity = {
      type: 'demonstration',
      scene: 'lives',
      cast: { hero: { name: 'nave', gender: 'f' } },
    }
    const start = sceneStart(activity)
    const script = sceneScript(activity)
    expect(script.length).toBe(3)
    // A sessão foi guardada com o roteiro ANTIGO, de 4 etapas, parada na última.
    const maior = [...script, { ...script[0]!, id: 'etapa-4' }]
    let antes = stepDemonstration(start, maior, initialDemonstration(start), {
      type: 'start',
    }).session
    for (let i = 0; i < 600 && antes.step < maior.length - 1; i++) {
      antes = stepDemonstration(start, maior, antes, { type: 'tick', seconds: 0.05 }).session
      if (antes.ready && antes.step < maior.length - 1)
        antes = stepDemonstration(start, maior, antes, { type: 'next' }).session
    }
    expect(antes.step).toBe(3)
    const sessao = readDemonstrationSession('lives', packDemonstration('lives', antes))
    expect(sessao?.step).toBe(3)
    if (!sessao) return
    // No player: o tique recomeça do zero, e o `viewed` fica como estava.
    const tique = stepDemonstration(
      start,
      script,
      { ...sessao, viewed: true },
      {
        type: 'tick',
        seconds: 0.05,
      },
    )
    expect(tique.session.step).toBe(0)
    expect(tique.session.action).toBe(0)
    expect(tique.session.viewed).toBe(true)
    // E o `next` também não fica preso na etapa que sumiu.
    expect(stepDemonstration(start, script, sessao, { type: 'next' }).session.step).toBe(0)
    // No servidor: o segmento aplica (era o 500 do members).
    const aplicado = applyDemonstrationSegment(
      start,
      script,
      { sequence: 10, sessionId: 'x', segmentId: 'y', session: sessao },
      {
        sessionId: 'x',
        segmentId: 'z',
        baseSequence: 10,
        commands: [{ type: 'tick', seconds: 0.05 }],
      },
    )
    expect(aplicado.session.step).toBe(0)
  })

  test('uma etapa que perdeu AÇÕES também recomeça, e a sessão válida segue igual', () => {
    const activity: DemonstrationActivity = { type: 'demonstration', scene: 'layers' }
    const start = sceneStart(activity)
    const script = sceneScript(activity)
    const valida = stepDemonstration(
      start,
      script,
      {
        state: openScene(start),
        step: 0,
        action: 0,
        elapsed: 0,
        ready: false,
        viewed: false,
      },
      { type: 'tick', seconds: 0.5 },
    )
    expect(valida.session.action).toBe(1)
    const quebrada = stepDemonstration(
      start,
      script,
      { ...valida.session, action: 5, ready: false },
      { type: 'tick', seconds: 0.05 },
    )
    expect(quebrada.session.step).toBe(0)
    expect(quebrada.session.action).toBe(0)
  })
})

describe('A4 · hitbox: a sessão com a área em 75% tem saída', () => {
  test('⚠️⚠️ a sessão guardada reabre, e a pista manda aumentar a área em vez de aproximar à toa', () => {
    const start = { scene: 'hitbox' as const }
    // A criança diminuiu a área antes de ver o BATEU: dali em diante aproximar não mostra nada.
    const guardada = stepExperiment(start, initialExperiment(start), {
      type: 'resize',
      width: sceneAreaWidth(75),
    }).session
    const sessao = readExperimentSession('hitbox', packExperiment('hitbox', guardada))
    expect(sessao).not.toBeNull()
    if (!sessao) return
    expect(sceneAreaPercent(sessao.state.contact.width)).toBe(75)
    expect(sessao.state.evidence.discoveries).not.toContain('contact')
    for (const nivel of [1, 2, 3])
      expect(sceneHint('hitbox', sessao.state, nivel)).toContain(
        'Aumente o Tamanho da área do Dino',
      )
    // Seguindo a pista (aumentar a área e aproximar de novo), a batida com vão aparece.
    let s = stepExperiment(start, sessao, { type: 'resize', width: sceneAreaWidth(130) }).session
    for (
      let d = s.state.contact.distance;
      d >= 20 && !s.state.evidence.discoveries.includes('contact');
      d -= 10
    )
      s = stepExperiment(start, s, { type: 'move', distance: d }).session
    expect(s.state.evidence.discoveries).toContain('contact')
  })

  test('com a área de 100% em diante a pista de sempre volta', () => {
    const c = crianca('hitbox').faz({ type: 'resize', width: sceneAreaWidth(100) })
    expect(sceneHint('hitbox', c.estado, 1)).not.toContain('Aumente o Tamanho')
  })
})

describe('A5 · o CASO não pré-semeia metas nas cenas redesenhadas', () => {
  const casos: [SceneId, SceneSetup, string, (c: ReturnType<typeof crianca>) => void][] = [
    ['acceleration', { actions: [cinco(0), cinco(0)] }, 'old-speed', (c) => c.faz(cinco(0))],
    [
      'random',
      {
        actions: [
          { type: 'sample', kind: 'velocity', unit: 0.1, guided: false },
          { type: 'sample', kind: 'velocity', unit: 0.9, guided: false },
        ],
      },
      'velocities',
      (c) => c.faz({ type: 'sample', kind: 'velocity', unit: 0.1, guided: false }),
    ],
    [
      'impulse',
      {
        actions: [
          { type: 'jump', input: 'tap' },
          { type: 'advance', seconds: 3 },
          { type: 'impulse', force: 14 },
        ],
      },
      'other-height',
      (c) => c.faz({ type: 'jump', input: 'tap' }).tempo(3),
    ],
    [
      'cleanup',
      { actions: [{ type: 'advance', seconds: 2 }] },
      'invisible-stored',
      (c) => c.tempo(0.05),
    ],
    [
      'spawn',
      { actions: [{ type: 'advance', seconds: 1 }] },
      'every-frame',
      (c) => c.tempo(1 / 30),
    ],
  ]
  for (const [scene, setup, meta, gesto] of casos)
    test(`⚠️⚠️ ${scene}: o primeiro gesto da criança não fecha ${meta}`, () => {
      const c = crianca(scene, setup)
      expect(c.estado.evidence.discoveries).toEqual([])
      gesto(c)
      expect(c.viu(meta)).toBe(false)
    })

  test('a cleanup do caso guarda na tela só quem ainda está nela, e os números batem', () => {
    const c = crianca('cleanup', { actions: [{ type: 'advance', seconds: 2 }] })
    expect(c.estado.crowd.cacti.every((k) => k.x >= 0)).toBe(true)
    expect(c.estado.crowd.born).toBe(c.estado.crowd.cacti.length)
    // E a meta continua possível: dois saem da tela DEPOIS da abertura.
    c.tempo(4)
    expect(c.viu('invisible-stored')).toBe(true)
  })
})

describe('A6 · score: "parou no fim" pede ter visto os pontos crescerem jogando', () => {
  test('⚠️⚠️ dois toques em Próxima tela até o Fim, com 0 pontos, NÃO fecham score-end', () => {
    const c = crianca('score').faz(
      { type: 'connect', port: 'condition', enabled: true },
      { type: 'start', input: 'key' },
      { type: 'collide' },
    )
    c.tempo(2)
    expect(c.estado.match.points).toBe(0)
    expect(c.viu('score-end')).toBe(false)
  })

  test('jogando um segundo inteiro antes, o fim fecha', () => {
    const c = crianca('score')
      .faz({ type: 'connect', port: 'condition', enabled: true }, { type: 'start', input: 'key' })
      .tempo(1.2)
    expect(c.viu('score-playing')).toBe(true)
    c.faz({ type: 'collide' }).tempo(1.2)
    expect(c.viu('score-end')).toBe(true)
  })

  test('⚠️ trocar a peça recomeça o placar e a fileira, e diz isso', () => {
    const c = crianca('score').tempo(3.2)
    expect(c.estado.match.points).toBeGreaterThan(0)
    c.faz({ type: 'connect', port: 'condition', enabled: true })
    expect(c.estado.match.points).toBe(0)
    expect(c.estado.match.seen).toEqual([-1, -1, -1])
    expect(c.estado.caption).toBe(
      'O placar recomeçou do zero, com Somar ponto dentro de Se jogando.',
    )
    c.tempo(1.2)
    expect(c.estado.match.points).toBe(0)
    expect(c.viu('score-start')).toBe(true)
  })
})

describe('B2 e B3 · o pedido e a previsão que não se sustentavam', () => {
  test('o pedido de positions derruba a meta mesmo quando o sorteio repete', () => {
    expect(sceneModel('random').goals.find((g) => g.id === 'positions')?.pedido).toBe(
      'Aperte Sortear lugar até sair um lugar diferente.',
    )
  })

  test('⚠️ a previsão da variable fica exata no instante em que o palpite volta', () => {
    const p = SCENE_QUESTIONS.variable.prediction
    expect(p.revealOn).toBe('changed-hidden')
    const c = crianca('variable').faz({ type: 'store', value: 0 }, { type: 'change', by: 1 })
    expect(c.viu('changed-hidden')).toBe(true)
    const certa = p.choices.find((o) => o.id === p.correctChoiceId)
    expect(certa?.label).toBe(String(c.estado.box.value))
  })
})

describe('a experiência: o que a criança vê no motor', () => {
  test('⚠️⚠️ coordinates: o fantasma fica onde a SEQUÊNCIA começou, no mesmo eixo e sentido', () => {
    const c = crianca('coordinates', {
      actions: [
        { type: 'stage', width: 800, height: 480 },
        { type: 'place', x: 400, y: 40 },
      ],
    })
    c.faz(
      { type: 'place', x: 400, y: 60 },
      { type: 'place', x: 400, y: 80 },
      { type: 'place', x: 400, y: 100 },
    )
    expect([c.estado.place.fromX, c.estado.place.fromY]).toEqual([400, 40])
    // A legenda continua sendo a do toque.
    expect(c.estado.caption).toBe('y foi de 80 para 100: o Dino desceu. O x ficou igual.')
    // Trocar de sentido ou de eixo recomeça o fantasma.
    c.faz({ type: 'place', x: 400, y: 80 })
    expect([c.estado.place.fromX, c.estado.place.fromY]).toEqual([400, 100])
    c.faz({ type: 'place', x: 420, y: 80 })
    expect([c.estado.place.fromX, c.estado.place.fromY]).toEqual([400, 80])
  })

  test('⚠️⚠️ restart: a partida herdada acaba NO TOQUE, com a frase dela', () => {
    const c = crianca('restart').faz({ type: 'start', input: 'tap' }).tempo(3)
    expect(c.estado.match.screen).toBe('end')
    c.faz({ type: 'start', input: 'tap' }, { type: 'start', input: 'tap' })
    expect(c.viu('screen-only')).toBe(true)
    expect(c.estado.match.screen).toBe('end')
    expect(c.estado.caption).toMatch(
      /^A partida nova começou com \d+ cactos? da partida anterior e acabou na hora, com uma batida\.$/,
    )
  })

  test('⚠️⚠️ hitbox: de 10 em 10 a partir da abertura, o BATEU aparece com um vão de 19', () => {
    const c = crianca('hitbox')
    expect(c.estado.contact.distance).toBe(149)
    while (!sceneContact(c.estado.contact))
      c.faz({ type: 'move', distance: c.estado.contact.distance - 10 })
    expect(c.estado.contact.distance).toBe(59)
    expect(sceneDrawingsGap(c.estado.contact)).toBe(19)
    expect(c.viu('contact')).toBe(true)
  })

  test('⚠️⚠️ velocity: para cima e para baixo pedem três quadros, e o quadro parado soma 0', () => {
    const c = crianca('velocity').faz({ type: 'velocity', vx: 0, vy: 9 }).tempo(0.4)
    expect(c.viu('down')).toBe(false)
    c.tempo(0.2)
    expect(c.viu('down')).toBe(true)
    const parado = crianca('velocity')
      .faz({ type: 'velocity', vx: 5, vy: 0 })
      .tempo(1)
      .faz({ type: 'velocity', vx: 0, vy: 0 })
      .tempo(0.6)
    expect(parado.estado.drive.steps).toBe(3)
    expect(new Set(parado.estado.drive.trailX).size).toBe(1)
    expect(parado.estado.drive.trailX.length).toBe(4)
  })

  test('⚠️⚠️ layers e jump-sound: com as metas feitas e a montagem desfeita, a frase diz o que falta', () => {
    const cast = { hero: { name: 'pedra', gender: 'f' as const } }
    const l = crianca('layers').faz({ type: 'layer', front: true }, { type: 'layer', front: false })
    expect(evaluateExperimentation('layers', l.estado).passed).toBe(false)
    // ⚠️ Mudou de propósito (full review de experiência, M4): a arrumação final virou a meta
    // `back-in-front`. A frase só diz o que se vê, e quem diz o gesto é a pista (e o "Conferir").
    expect(sceneSituation('layers', l.estado, cast)).toBe(
      'Só um pedacinho da pedra aparece no desenho.',
    )
    expect(sceneHint('layers', l.estado, 1, cast)).toBe(
      'Só um pedacinho da pedra aparece no desenho. Leve a pedra de novo para o fim da ordem de desenhar.',
    )

    const j = crianca('jump-sound').faz(
      { type: 'jump', input: 'key' },
      { type: 'jump', input: 'key' },
    )
    j.tempo(2).faz({ type: 'jump', input: 'tap' }).tempo(2)
    j.faz({ type: 'connect', port: 'sound', enabled: true }, { type: 'jump', input: 'key' }).tempo(
      2,
    )
    j.faz({ type: 'jump', input: 'tap' }).tempo(2)
    expect(j.viu('every-jump')).toBe(true)
    j.faz({ type: 'connect', port: 'sound', enabled: false })
    expect(sceneSituation('jump-sound', j.estado)).toContain(
      'Leve Tocar som de volta para Quando o Dino pular, como fica no jogo.',
    )
  })

  test('⚠️ as pistas seguem a meta que falta', () => {
    const coord = crianca('coordinates')
    expect(sceneHint('coordinates', coord.estado, 3)).toBe(
      'Aperte + no x três vezes, sem tocar no y.',
    )
    coord.faz({ type: 'place', x: 130, y: 150 })
    expect(sceneHint('coordinates', coord.estado, 3)).toBe(
      'Aperte + no y três vezes, sem tocar no x.',
    )

    const leitor = crianca('screen-reader').faz({ type: 'listen' })
    expect(sceneHint('screen-reader', leitor.estado, 1)).toContain('Escreva o que se faz no jogo')

    expect(sceneHint('stage-size', crianca('stage-size').estado, 3)).toBe(
      'Aperte A borda da tela: escondida, logo abaixo do desenho.',
    )

    const desenho = crianca('draw-loop').tempo(0.25)
    expect(desenho.viu('frozen')).toBe(true)
    expect(sceneHint('draw-loop', desenho.estado, 2)).toBe(
      'Escolha A cada quadro e aperte Avançar 1 quadro duas vezes.',
    )
  })

  test('spawn: os dois lados da comparação no mesmo molde, com o tempo de cada um', () => {
    const c = crianca('spawn').tempo(2)
    const sem = c.estado.crowd.born
    c.faz({ type: 'connect', port: 'timer', enabled: true }).tempo(2)
    const faixa = sceneReadout('spawn', c.estado)
    expect(faixa.map((r) => r.label)).toEqual(['nasce', 'sem relógio', 'com relógio'])
    expect(faixa[1]?.value).toBe(`${sem} em 2 s`)
    expect(faixa[2]?.value).toBe(`${c.estado.crowd.born} em 2 s`)
  })

  test('⚠️⚠️ gravity: o ▶ para em 500, e a subida freando cabe inteira no palco (até 600)', () => {
    const start = { scene: 'gravity' as const }
    let estado = stepScene(start, openScene(start), { type: 'jump', input: 'tap' })
    // O player: fatia por fatia, parando na passagem.
    for (let i = 0; i < 400; i++) {
      const depois = stepScene(start, estado, { type: 'advance', seconds: FATIA })
      const parou = sceneJumpLeftView('gravity', estado, depois)
      estado = depois
      if (parou) break
    }
    expect(estado.flight.y).toBeGreaterThanOrEqual(PARADA_DO_SALTO)
    expect(estado.flight.y).toBeLessThan(PARADA_DO_SALTO + 20)
    expect(sceneSituation('gravity', estado)).toContain('segue subindo')
    // Liga a gravidade ali: o ponto mais alto fica abaixo do topo da régua, e o Dino volta.
    const c = crianca('gravity')
    c.estado = stepScene(start, estado, { type: 'connect', port: 'gravity', enabled: true })
    let maisAlto = c.estado.flight.y
    for (let i = 0; i < 200 && c.estado.flight.time !== null; i++) {
      c.tempo(FATIA)
      maisAlto = Math.max(maisAlto, c.estado.flight.y)
    }
    expect(maisAlto).toBeLessThan(TOPO_DO_SALTO)
    expect(c.viu('landed')).toBe(true)
    // Desligar a gravidade de novo, lá em cima (acima da parada), PARA o ▶.
    expect(
      sceneConnectRunsClock(
        'gravity',
        { type: 'connect', port: 'gravity', enabled: false },
        estado,
      ),
    ).toBe(false)
    // B1: só LIGAR solta o ▶; desligar abaixo da parada deixa como está.
    expect(
      sceneConnectRunsClock('gravity', { type: 'connect', port: 'gravity', enabled: true }, estado),
    ).toBe(true)
    const baixo = crianca('gravity').faz({ type: 'jump', input: 'tap' }).tempo(0.3).estado
    expect(
      sceneConnectRunsClock('gravity', { type: 'connect', port: 'gravity', enabled: false }, baixo),
    ).toBeNull()
  })
})

describe('o sucesso da missão restrita diz só o que ela cobrou', () => {
  test('⚠️⚠️ coordinates do Dia 1 (só `down`): sem "x maior vai para a direita" nem o 0, 0', () => {
    const nave = { hero: { name: 'nave', gender: 'f' as const } }
    const frase = sceneSuccess('coordinates', nave, ['down'])
    expect(frase).toBe('y maior leva a nave para baixo. O 0 do y fica lá no alto!')
    expect(frase).not.toContain('direita')
    // O avaliador devolve a MESMA frase no retorno.
    const c = crianca('coordinates', {
      actions: [
        { type: 'stage', width: 800, height: 480 },
        { type: 'place', x: 400, y: 40 },
      ],
      goals: ['down'],
    })
    c.faz({ type: 'place', x: 400, y: 80 }, { type: 'place', x: 400, y: 120 })
    const r = evaluateExperimentation('coordinates', c.estado, true, nave, ['down'])
    expect(r.passed).toBe(true)
    expect(r.feedback).toBe(frase)
    // Sem missão restrita, a de sempre; e numa lista sem frase própria também.
    expect(sceneSuccess('coordinates')).toContain('x maior vai para a direita')
    expect(sceneSuccess('velocity', undefined, ['down', 'up'])).toBe(sceneModel('velocity').success)
  })
})

describe('as legendas que diziam pouco (BAIXOS)', () => {
  test('coordinates: na beirada, a legenda diz que o Dino saiu da tela', () => {
    const c = crianca('coordinates').faz({ type: 'place', x: 110, y: 270 })
    expect(c.estado.caption).toBe(
      'y foi de 150 para 270: o Dino passou da beirada de baixo e saiu da tela.',
    )
    const x = crianca('coordinates').faz({ type: 'place', x: 480, y: 150 })
    expect(x.estado.caption).toContain('passou da beirada da direita e saiu da tela')
  })

  test('variable: a soma diz O QUÊ mudou', () => {
    const c = crianca('variable').faz({ type: 'store', value: 2 }, { type: 'change', by: 1 })
    expect(c.estado.caption).toBe('A caixa pontos foi de 2 para 3.')
  })
})
