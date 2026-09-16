import { describe, expect, test } from 'bun:test'
import { MESH_SKIN_LABELS, type SceneAction, type SceneId } from './actions'
import { SCENE_MODELS } from './catalog'
import { openScene, sceneClockReachedStop, stepScene } from './engine'
import { sceneHint } from './evaluate'
import { SCENE_QUESTIONS } from './questions'
import { sceneReadout, sceneSituation } from './readout'
import type { SceneState } from './state'

/**
 * Os consertos dos dois reviews da onda B do lote 5 do Raio-X nas cenas do motor e do 3D (G6), no MOTOR,
 * nas perguntas, na faixa e na frase. O palco e a bancada estão no member-shell
 * (`tests/scene-motor-3d-consertos-5b.test.tsx`) e o deslizante que só conta ao SOLTAR, no kids
 * (`tests/lesson-scene-motor-3d.test.tsx`). Relatório: `implementacao/consertos-5b-g6.md`.
 */

const rodar = (scene: SceneId, acoes: SceneAction[], inicio?: SceneState): SceneState =>
  acoes.reduce((s, a) => stepScene({ scene }, s, a), inicio ?? openScene({ scene }))
const tempo = (segundos: number): SceneAction[] =>
  Array.from({ length: Math.round(segundos / 0.05) }, () => ({ type: 'advance', seconds: 0.05 }))
const viu = (s: SceneState, meta: string) => s.evidence.discoveries.includes(meta)

describe('entity-state: a pergunta final não depende de onde a chave parou (ALTO)', () => {
  test('⚠️⚠️ a cena conclui com o estado NO JOGO, e a pergunta cita o caso de cada torre', () => {
    // A última descoberta é o contraste: a tela fica com as três torres iguais e "O estado mora: no jogo".
    const fim = rodar('entity-state', [
      { type: 'brain', id: 1, state: 'mirar' },
      { type: 'brain', id: 2, state: 'atirar' },
      { type: 'brain', id: 3, state: 'recarregar' },
      ...tempo(1),
      { type: 'brain', id: 2, state: 'parado' },
      { type: 'brain-scope', shared: true },
      { type: 'brain', id: 1, state: 'atirar' },
    ])
    expect(['own', 'acts', 'independent', 'shared'].every((m) => viu(fim, m))).toBe(true)
    expect(fim.brains.shared).toBe(true)
    const { explain } = SCENE_QUESTIONS['entity-state']
    // "Onde o estado de cada torre mora?" tinha o distrator "No jogo inteiro" à vista na tela.
    expect(explain.prompt).not.toMatch(/onde .*mora/i)
    expect(explain.prompt).toContain('em cada torre')
    // A explicação fecha os DOIS lados da comparação.
    expect(explain.explanation).toContain('Cada torre guarda o próprio estado')
    expect(explain.explanation).toContain('no jogo')
    // Mesmos ids (sessões salvas), a certa continua sendo "cada".
    expect(explain.choices.map((c) => c.id)).toEqual(['cada', 'jogo'])
    expect(explain.correctChoiceId).toBe('cada')
  })
})

describe('entity-state: a troca e as pistas (BAIXOS)', () => {
  test('ligar "no jogo" DIZ que as três passam a seguir a 1ª', () => {
    const s = rodar('entity-state', [
      { type: 'brain', id: 2, state: 'atirar' },
      { type: 'brain-scope', shared: true },
    ])
    expect(s.brains.states).toEqual(['parado', 'parado', 'parado'])
    expect(s.caption).toBe('Agora o estado mora no jogo: as três seguem a 1ª.')
    // Voltar para cada torre não tem frase própria: a situação diz o estado de cada uma.
    const volta = stepScene({ scene: 'entity-state' }, s, { type: 'brain-scope', shared: false })
    expect(volta.caption).toBe('')
  })

  test('⚠️ a pista 1 não diz "começam paradas" em cima de três torres atirando', () => {
    const s = rodar('entity-state', [
      { type: 'brain', id: 1, state: 'atirar' },
      { type: 'brain', id: 2, state: 'atirar' },
      { type: 'brain', id: 3, state: 'atirar' },
    ])
    const pista = sceneHint('entity-state', { ...s, caption: '' }, 1)
    expect(pista).toContain('A 1ª torre está atirando')
    expect(pista).not.toContain('começam paradas')
  })

  test('⚠️ com o estado no jogo e as metas de "cada torre" faltando, a pista manda voltar', () => {
    const s = rodar('entity-state', [{ type: 'brain-scope', shared: true }])
    for (const nivel of [1, 2, 3])
      expect(sceneHint('entity-state', s, nivel)).toContain(
        'Aperte O estado mora até ficar em cada torre.',
      )
  })

  test('⚠️⚠️ a escada fala da meta que FALTA: as três diferentes, e depois o estado no jogo', () => {
    // Duas torres diferentes e o tempo passou, mas nunca as três: falta `own`.
    const duas = rodar('entity-state', [{ type: 'brain', id: 1, state: 'mirar' }, ...tempo(1)])
    expect(viu(duas, 'acts')).toBe(true)
    expect(viu(duas, 'own')).toBe(false)
    expect(sceneHint('entity-state', duas, 2)).toBe(
      'Deixe cada torre num estado diferente das outras duas.',
    )
    // Tudo de "cada torre" feito: falta `shared`, que a escada de fábrica nunca citava.
    const quase = rodar(
      'entity-state',
      [
        { type: 'brain', id: 2, state: 'atirar' },
        { type: 'brain', id: 3, state: 'recarregar' },
      ],
      duas,
    )
    expect(['own', 'acts', 'independent'].every((m) => viu(quase, m))).toBe(true)
    expect(viu(quase, 'shared')).toBe(false)
    expect(sceneHint('entity-state', quase, 2)).toBe('Agora mude onde o estado mora para no jogo.')
    expect(sceneHint('entity-state', quase, 3)).toContain('Aperte O estado mora até ficar no jogo.')
  })
})

describe('circle-collision: o relógio para na batida (MÉDIO)', () => {
  test('⚠️⚠️ com o ▶ muito tempo ligado, os dois param encostando, e não fundidos em 0', () => {
    const s = rodar('circle-collision', tempo(12))
    expect(s.circles.distance).toBe(s.circles.a + s.circles.b)
    expect(viu(s, 'touch')).toBe(true)
    expect(sceneClockReachedStop('circle-collision', s)).toBe(true)
    // Longe, o ▶ segue aproximando.
    expect(
      sceneClockReachedStop('circle-collision', openScene({ scene: 'circle-collision' })),
    ).toBe(false)
    // A régua é só desta cena.
    expect(sceneClockReachedStop('contact', s)).toBe(false)
  })

  test('⭐ o pedido seguinte funciona: um raio menor separa, e o ▶ volta a aproximar até a batida nova', () => {
    const encostados = rodar('circle-collision', tempo(12))
    const menor = stepScene({ scene: 'circle-collision' }, encostados, {
      type: 'radius',
      which: 'a',
      value: encostados.circles.a - 10,
    })
    expect(viu(menor, 'formula')).toBe(true)
    expect(sceneClockReachedStop('circle-collision', menor)).toBe(false)
    const denovo = rodar('circle-collision', tempo(3), menor)
    expect(denovo.circles.distance).toBe(denovo.circles.a + denovo.circles.b)
  })

  test('⚠️ sobrepostos pela medida da distância, a pista manda afastar (BAIXO-9)', () => {
    const sobrepostos = rodar('circle-collision', [{ type: 'approach', distance: 20 }])
    expect(viu(sobrepostos, 'touch')).toBe(true)
    for (const nivel of [1, 2, 3])
      expect(sceneHint('circle-collision', sobrepostos, nivel)).toContain(
        'Afaste os centros até os dois só encostarem.',
      )
    // Só encostando, a escada de sempre.
    const encostados = rodar('circle-collision', tempo(12))
    expect(sceneHint('circle-collision', encostados, 3)).toBe(
      SCENE_MODELS['circle-collision'].hints[2] as string,
    )
  })

  test('a instrução e a pista não pedem mais reflexo ("e pare")', () => {
    const modelo = SCENE_MODELS['circle-collision']
    expect(modelo.instruction).not.toMatch(/e pare/)
    expect(modelo.hints.join(' ')).not.toMatch(/pare o tempo/)
  })
})

describe('axis-z: o z para quem ouve e as cores dos eixos (MÉDIOS)', () => {
  test('⚠️⚠️ a frase muda com o cubo na frente e no fundo, no chão e no ar', () => {
    const frente = rodar('axis-z', [{ type: 'place3d', x: 0, y: 0, z: 120 }])
    const fundo = rodar('axis-z', [{ type: 'place3d', x: 0, y: 0, z: -120 }])
    const meio = openScene({ scene: 'axis-z' })
    const frases = [frente, fundo, meio].map((s) => sceneSituation('axis-z', s))
    expect(new Set(frases).size).toBe(3)
    expect(frases[0]).toContain('parece maior')
    expect(frases[1]).toContain('parece menor')
    // Sem a regra do sinal: "negativo" é da faixa e da bancada.
    for (const f of frases) expect(f).not.toMatch(/negativ|z /)
    const noArFundo = rodar('axis-z', [{ type: 'place3d', x: 0, y: 60, z: -120 }])
    expect(sceneSituation('axis-z', noArFundo)).toBe(
      'O cubo está no ar, lá no fundo. A sombra ficou no chão, bem embaixo. No fundo, o cubo parece menor.',
    )
  })

  test('⚠️ cada número da faixa na cor do SEU eixo (x vermelho, y verde, z azul)', () => {
    const tons = sceneReadout('axis-z', openScene({ scene: 'axis-z' })).map((l) => l.tone)
    expect(tons).toEqual(['alert', 'leaf', 'a'])
  })

  test('o sentido do z mora na faixa depois de mexer nele: "negativo é o fundo"', () => {
    const s = rodar('axis-z', [{ type: 'place3d', x: 0, y: 0, z: -40 }])
    expect(sceneReadout('axis-z', s)[2]?.label).toBe('z (negativo é o fundo)')
  })
})

describe('mesh: a faixa e a instrução não respondem a previsão (ALTO)', () => {
  test('⚠️⚠️ antes de ver, nada de "pontos" na faixa, na instrução nem no nome do controle', () => {
    const abertura = openScene({ scene: 'mesh' })
    const faixa = sceneReadout('mesh', abertura)
    expect(faixa.map((l) => `${l.label} ${l.value}`).join(' ')).not.toMatch(/ponto/)
    expect(faixa[0]).toMatchObject({ label: 'a pele', value: 'inteira' })
    const modelo = SCENE_MODELS.mesh
    expect(modelo.instruction).not.toMatch(/ponto/i)
    expect(modelo.hints[0]).not.toMatch(/ponto/i)
    // A previsão pergunta do que o modelo é feito; a certa é "Pontos ligados por linhas".
    expect(SCENE_QUESTIONS.mesh.prediction.prompt).toContain('do que um modelo 3D é feito')
    expect(Object.values(MESH_SKIN_LABELS).join(' ')).not.toMatch(/ponto/)
  })

  test('depois de ver os pontos, a faixa conta quantos são', () => {
    const viuOsPontos = rodar('mesh', [{ type: 'see-points', level: 'metade' }])
    expect(viu(viuOsPontos, 'points')).toBe(true)
    const faixa = sceneReadout('mesh', viuOsPontos)
    expect(faixa.map((l) => l.label)).toContain('pontos do modelo')
    expect(faixa[0]?.value).toBe('transparente')
  })

  test('⚠️ a revelação não fala de pele transparente para quem tirou a pele inteira (BAIXO)', () => {
    const macico = SCENE_QUESTIONS.mesh.prediction.choices.find((c) => c.id === 'macico')
    expect(macico?.shows).toBeDefined()
    expect(macico?.shows).not.toMatch(/transparente/)
  })
})

describe('camera-3d e delta-time: as palavras (BAIXOS)', () => {
  test('o atalho diz para ONDE a câmera volta', () => {
    const s = rodar('camera-3d', [{ type: 'orbit', yaw: 4, pitch: 2 }, { type: 'recenter' }])
    expect(s.caption).toBe('A câmera voltou para onde começou.')
    expect(JSON.stringify(SCENE_MODELS['camera-3d'])).not.toMatch(/vista de sempre/)
  })

  test('"marcas", e não "pegadas": o elenco de nave não deixa pegada', () => {
    expect(JSON.stringify(SCENE_MODELS['delta-time'])).not.toMatch(/pegada/)
    expect(SCENE_MODELS['delta-time'].hints[1]).toContain('marcas')
  })
})
