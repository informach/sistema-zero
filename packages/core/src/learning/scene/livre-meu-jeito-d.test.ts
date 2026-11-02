import { describe, expect, test } from 'bun:test'
import {
  asa,
  balde,
  CAMINHOS_LIVRES_MEU_JEITO_D,
  cratera,
  espelho,
  fantasma,
  fogo,
  iguais,
  lupa,
  pedra,
  previa,
  quadro,
  sol,
  sombra,
  tempo,
  tinta,
  velocidade,
} from '../../../tests/fixtures/caminhos-livres/meu-jeito-d'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import {
  discoveryGuidance,
  discoverySpeechSteps,
  type ExperimentationActivity,
  sceneTargets,
} from './index'
import type { SceneStart } from './state'

/**
 * O ateliê de O Jogo do Meu Jeito em exploração livre (Construtor, 02/11/2026): `pixel-vector`,
 * `symmetry`, `shading`, `fill-stroke`, `frames`, `onion-skin` e `motion-amount`. A experiência
 * trabalha só a IDEIA (os nomes dos controles do Pinta são a ferramenta da criança e podem aparecer)
 * e convida à investigação: antes do teste, o Zappy pergunta e diz o que observar; o resultado só
 * aparece na fala de DEPOIS dele.
 */
const CENAS = [
  'pixel-vector',
  'symmetry',
  'shading',
  'fill-stroke',
  'frames',
  'onion-skin',
  'motion-amount',
] as const
type Cena = (typeof CENAS)[number]

/** As metas de cada bloco do manifesto do Meu Jeito (aulas 2 a 5), com a exploração livre ligada. */
const METAS: Record<Cena, string[]> = {
  'pixel-vector': ['stairs', 'smooth', 'alike'],
  symmetry: ['one-side', 'two-sides', 'axis-decides', 'fill-ignores-mirror'],
  shading: ['volume', 'flat', 'side'],
  'fill-stroke': ['only-fill', 'only-stroke', 'both'],
  frames: ['two-drawings', 'movement', 'paused-one', 'slow-shows-two', 'same-frames'],
  'onion-skin': ['blind-move', 'ghost-on', 'even-step'],
  'motion-amount': ['no-change', 'local-move', 'too-much'],
}
const atividade = (scene: Cena): ExperimentationActivity => ({
  type: 'experimentation',
  scene,
  cenario: 'meu-jeito',
  ...(scene === 'motion-amount' ? { cast: { hero: { name: 'pedra', gender: 'f' } } } : {}),
  setup: { freeExploration: true, goals: METAS[scene] },
})
const jogar = (scene: Cena, actions: SceneAction[]) => {
  const activity = atividade(scene)
  const start: SceneStart = { scene, setup: activity.setup }
  return actions.reduce((s, a) => stepScene(start, s, a), openScene(start))
}
const fala = (scene: Cena, actions: SceneAction[]) =>
  discoveryGuidance(atividade(scene), jogar(scene, actions))?.id

const falas = new Map(
  CENAS.flatMap((cena) => discoverySpeechSteps(cena).map(({ id, text }) => [id, text] as const)),
)

describe('O ateliê livre: o Zappy fala só da ideia', () => {
  test.each(CENAS)('%s tem falas próprias, com o prefixo da cena', (cena) => {
    const ids = discoverySpeechSteps(cena).map(({ id }) => id)
    expect(ids.length).toBeGreaterThanOrEqual(5)
    for (const id of ids) expect(id.startsWith(`${cena}-`)).toBe(true)
    expect(ids).toContain(`${cena}-complete`)
  })

  test.each([
    ...falas.keys(),
  ])('%s não fala de bloco, regra, código, área do Estúdio nem programação', (id) => {
    expect(falas.get(id)).not.toMatch(
      /\bregra|\bbloco|\bc[óo]digo|\bEst[úu]dio|\bentão\b|\bsenão\b|\bcomando|\bprograma|\bvari[áa]vel|\bAo iniciar\b|\bEnquanto\b/i,
    )
  })

  test('a motion-amount diz desenho, e não quadro (o quadro do jogo é outra coisa)', () => {
    for (const [id, texto] of falas)
      if (id.startsWith('motion-amount-')) expect(texto).not.toMatch(/\bquadros?\b/i)
  })

  /** A fala de ANTES do teste não conta o que o teste vai mostrar. */
  const ANTES: [string, RegExp][] = [
    ['pixel-vector-start', /degrau|quadradinho|lisa|ponto/i],
    ['pixel-vector-stairs', /\blisa|pontos/i],
    ['pixel-vector-far', /mesma pedra|parecem iguais|voltaram a parecer/i],
    ['pixel-vector-close-late', /\blisa|pontos/i],
    ['symmetry-start', /só onde|uma asa só|ficou só/i],
    ['symmetry-off-late', /só onde|uma asa só|ficou só/i],
    ['symmetry-mirror', /cópia|outro lado|virada/i],
    ['symmetry-axis', /embaixo|em cima|deitad/i],
    ['symmetry-fill', /só a asa|um lado só|não copia/i],
    ['shading-start', /redond|três tons|volume/i],
    ['shading-flat', /chapad|adesivo/i],
    ['shading-flat-late', /chapad|adesivo/i],
    ['shading-side', /trocaram|troca de lado|virado para o sol/i],
    ['fill-stroke-start', /sobrou|sem a linha|vazi/i],
    ['fill-stroke-stroke', /só a linha|vazia por dentro/i],
    ['fill-stroke-fill-late', /sobrou a cor de dentro|sem a linha da borda/i],
    ['fill-stroke-both', /juntas|as três versões ficam/i],
    ['frames-start', /só o fogo|corpo da nave fica igual/i],
    ['frames-start-late', /só o fogo|corpo da nave fica igual/i],
    ['frames-fast', /pulsou|parece movimento/i],
    ['frames-pause', /um quadro só|um desenho de cada vez/i],
    ['frames-slow', /um quadro e depois o outro/i],
    ['frames-same', /nada se mexe|parou de pulsar|não pulsa/i],
    ['onion-skin-start', /memória|não dá|só o fogo 2 aparece/i],
    ['onion-skin-ghost', /tracejado|fogo do quadro 1/i],
    ['onion-skin-blind-late', /memória|só o fogo 2 aparece/i],
    ['onion-skin-step', /cabe|dentro do quadro|sem passar/i],
    ['motion-amount-start', /fica parada|nada mudou/i],
    ['motion-amount-still-late', /fica parada|nada mudou/i],
    ['motion-amount-local', /girar|gira|rolar|rola/i],
    ['motion-amount-much', /pula|pular/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })

  test('toda fala do registro está na tabela do antes ou é a de conclusão', () => {
    const naTabela = new Set(ANTES.map(([id]) => id))
    for (const id of falas.keys())
      expect([id, naTabela.has(id) || id.endsWith('-complete')]).toEqual([id, true])
  })
})

describe('O ateliê livre: o caminho completa as metas', () => {
  test.each(CENAS)('%s completa as metas do manifesto e termina na conclusão', (cena) => {
    const caminho = CAMINHOS_LIVRES_MEU_JEITO_D[cena] ?? []
    expect(caminho.length).toBeGreaterThan(0)
    const s = jogar(cena, caminho)
    for (const meta of sceneTargets(atividade(cena))) expect(s.evidence.discoveries).toContain(meta)
    expect(discoveryGuidance(atividade(cena), s)?.id).toBe(`${cena}-complete`)
  })

  test.each(CENAS)('%s só chega à conclusão no último gesto que conta', (cena) => {
    const caminho = CAMINHOS_LIVRES_MEU_JEITO_D[cena] ?? []
    for (let i = 0; i < caminho.length - 1; i++)
      expect(fala(cena, caminho.slice(0, i + 1))).not.toBe(`${cena}-complete`)
  })

  test.each(CENAS)('%s abre sem nenhuma descoberta e com a fala de começo', (cena) => {
    expect(jogar(cena, []).evidence.discoveries).toEqual([])
    expect(fala(cena, [])).toBe(`${cena}-start`)
  })

  test('a fala explica só o que já foi testado (a ordem da história)', () => {
    const trilhas: [Cena, string[]][] = [
      [
        'pixel-vector',
        ['start', 'start', 'stairs', 'stairs', 'far', 'far', 'far', 'far', 'complete'],
      ],
      ['symmetry', ['mirror', 'mirror', 'axis', 'axis', 'fill', 'fill', 'complete']],
      ['shading', ['flat', 'side', 'side', 'complete']],
      ['fill-stroke', ['stroke', 'stroke', 'complete']],
      ['onion-skin', ['start', 'ghost', 'step', 'step', 'complete']],
    ]
    for (const [cena, esperadas] of trilhas) {
      const caminho = CAMINHOS_LIVRES_MEU_JEITO_D[cena] ?? []
      const vistas = caminho.map((_, i) => fala(cena, caminho.slice(0, i + 1)))
      expect(vistas).toEqual(esperadas.map((id) => `${cena}-${id}`))
    }
  })

  test('frames: a fala acompanha a Prévia', () => {
    expect(fala('frames', [quadro(2)])).toBe('frames-fast')
    expect(fala('frames', [quadro(2), velocidade(8), previa(true), tempo(0.5)])).toBe(
      'frames-pause',
    )
    expect(
      fala('frames', [quadro(2), velocidade(8), previa(true), tempo(0.5), previa(false)]),
    ).toBe('frames-slow')
    expect(
      fala('frames', [
        quadro(2),
        velocidade(8),
        previa(true),
        tempo(0.5),
        previa(false),
        velocidade(2),
        previa(true),
        tempo(1),
      ]),
    ).toBe('frames-same')
  })

  test('motion-amount: a fala acompanha a Prévia', () => {
    expect(fala('motion-amount', [previa(true), tempo(0.5)])).toBe('motion-amount-local')
    expect(fala('motion-amount', [previa(true), tempo(0.5), cratera(4), tempo(0.5)])).toBe(
      'motion-amount-much',
    )
  })
})

describe('O ateliê livre: a meta só cai quando a criança VIU', () => {
  test('motion-amount: no modo livre a Prévia abre parada e o tempo sozinho não descobre nada', () => {
    const aberta = jogar('motion-amount', [])
    expect(aberta.motionAmount.playing).toBe(false)
    expect(jogar('motion-amount', [tempo(1), tempo(1)]).evidence.discoveries).toEqual([])
    // Fora do modo livre, a bancada antiga continua abrindo com a Prévia tocando.
    expect(openScene({ scene: 'motion-amount' }).motionAmount.playing).toBe(true)
    // O Recomeçar volta ao caso livre, com a Prévia parada (as descobertas continuam marcadas).
    const recomecou = jogar('motion-amount', [previa(true), tempo(0.5), { type: 'reset' }])
    expect(recomecou.motionAmount.playing).toBe(false)
  })

  test('motion-amount: tocar a Prévia é o teste dos dois desenhos iguais', () => {
    expect(jogar('motion-amount', [previa(true), tempo(0.5)]).evidence.discoveries).toEqual([
      'no-change',
    ])
  })

  test('shading: desligar sem ter ligado não descobre nada', () => {
    expect(jogar('shading', [sombra(false)]).evidence.discoveries).toEqual([])
  })

  test('symmetry: com os dois espelhos ligados nenhuma meta cai', () => {
    expect(jogar('symmetry', [espelho('xy'), asa]).evidence.discoveries).toEqual([])
  })

  test('pixel-vector: voltar para longe sem ter aproximado não descobre nada', () => {
    expect(jogar('pixel-vector', [lupa(2), lupa(1)]).evidence.discoveries).toEqual([])
  })
})

describe('O ateliê livre: ordens alternativas', () => {
  test('pixel-vector: voltar para longe antes de chegar bem perto', () => {
    const caminho = [lupa(2), lupa(3), lupa(4), lupa(3), lupa(2)]
    expect(fala('pixel-vector', caminho)).toBe('pixel-vector-close-late')
    expect(fala('pixel-vector', [...caminho, lupa(4), lupa(5), lupa(6)])).toBe(
      'pixel-vector-complete',
    )
  })

  test('symmetry: o espelho e o Balde antes de pintar com os espelhos desligados', () => {
    const caminho = [espelho('x'), asa, balde, espelho('y'), asa]
    expect(fala('symmetry', caminho)).toBe('symmetry-off-late')
    expect(fala('symmetry', [...caminho, espelho('off'), asa])).toBe('symmetry-complete')
  })

  test('shading: trocar o sol de lado antes de desligar a sombra e a luz', () => {
    const caminho = [sombra(true), sol('right')]
    expect(fala('shading', caminho)).toBe('shading-flat-late')
    expect(fala('shading', [...caminho, sombra(false)])).toBe('shading-complete')
  })

  test('shading: o sol do outro lado antes de ligar os tons também vale', () => {
    expect(fala('shading', [sombra(true), sombra(false), sol('right'), sombra(true)])).toBe(
      'shading-complete',
    )
  })

  test('fill-stroke: as duas partes em Sem cor no caminho, e a volta das cores no fim', () => {
    const caminho = [tinta('stroke', false), tinta('fill', false), tinta('stroke', true)]
    expect(fala('fill-stroke', caminho)).toBe('fill-stroke-both')
    expect(fala('fill-stroke', [...caminho, tinta('fill', true)])).toBe('fill-stroke-complete')
  })

  test('fill-stroke: o Preenchimento em Sem cor primeiro', () => {
    expect(fala('fill-stroke', [tinta('fill', false)])).toBe('fill-stroke-fill-late')
    expect(
      fala('fill-stroke', [tinta('fill', false), tinta('fill', true), tinta('stroke', false)]),
    ).toBe('fill-stroke-complete')
  })

  test('frames: a Prévia rápida e devagar antes de comparar os quadros parados', () => {
    const caminho = [velocidade(8), previa(true), tempo(0.5), previa(false)]
    expect(fala('frames', caminho)).toBe('frames-start-late')
    const depois = [
      ...caminho,
      quadro(2),
      velocidade(2),
      previa(true),
      tempo(1),
      iguais(true),
      velocidade(8),
      tempo(0.5),
    ]
    expect(fala('frames', depois)).toBe('frames-complete')
  })

  test('onion-skin: o Fantasma ligado antes de mudar o fogo sem ele', () => {
    const caminho = [fantasma(true), quadro(2)]
    expect(fala('onion-skin', caminho)).toBe('onion-skin-blind-late')
    expect(fala('onion-skin', [...caminho, fantasma(false), fogo(36)])).toBe('onion-skin-step')
    expect(fala('onion-skin', [...caminho, fogo(28)])).toBe('onion-skin-blind-late')
    expect(fala('onion-skin', [...caminho, fogo(28), fantasma(false), fogo(32)])).toBe(
      'onion-skin-complete',
    )
  })

  test('motion-amount: a pedra inteira andando muito antes dos desenhos iguais', () => {
    const caminho = [previa(true), pedra(10), tempo(0.5)]
    expect(fala('motion-amount', caminho)).toBe('motion-amount-still-late')
    const depois = [...caminho, pedra(0), tempo(0.5), cratera(4), tempo(0.5)]
    expect(fala('motion-amount', depois)).toBe('motion-amount-complete')
  })

  test('uma missão que não cobra uma meta não espera por ela', () => {
    const activity: ExperimentationActivity = {
      ...atividade('shading'),
      setup: { freeExploration: true, goals: ['volume', 'flat'] },
    }
    const start: SceneStart = { scene: 'shading', setup: activity.setup }
    const s = [sombra(true), sombra(false)].reduce(
      (estado, a) => stepScene(start, estado, a),
      openScene(start),
    )
    expect(discoveryGuidance(activity, s)?.id).toBe('shading-complete')
  })
})
