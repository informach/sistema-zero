import { describe, expect, test } from 'bun:test'
import {
  borda,
  CAMINHOS_LIVRES_DINO_B,
  escrever,
  espaco,
  FRASE,
  gravidade,
  impulso,
  instante,
  ouvir,
  pular,
  segundo,
  segundos,
  somNoPulo,
  tela,
} from '../../../tests/fixtures/caminhos-livres/dino-b'
import type { SceneAction } from './actions'
import { openScene, stepScene } from './engine'
import { evaluateExperimentation } from './evaluate'
import {
  discoveryGuidance,
  discoverySpeechSteps,
  type ExperimentationActivity,
  isSceneSetup,
  sceneTargets,
} from './index'
import { isSceneState, type SceneStart, type SceneState } from './state'

/**
 * As cinco cenas que só o Corre Dino usa, em exploração livre (02/11/2026, frente B): `stage-size`,
 * `screen-reader`, `gravity`, `impulse` e `jump-sound`. A experiência trabalha só a IDEIA (nada de
 * bloco, área do Estúdio, regra, Se, então, senão nem código), o Zappy pergunta antes do teste e
 * explica depois, e as metas do bloco de cada aula caem pela exploração livre, em mais de uma ordem.
 * Nenhuma das cinco precisou de mudança no motor: as metas de hoje já pedem o que a criança VIU.
 */

/** O caso de cada bloco, como o manifesto deve ficar, com a exploração livre ligada. */
export const ATIVIDADES_LIVRES_DINO_B = {
  'stage-size': {
    type: 'experimentation',
    scene: 'stage-size',
    cenario: 'corre-dino',
    setup: { freeExploration: true, goals: ['border-on', 'resized', 'target'] },
  },
  'screen-reader': {
    type: 'experimentation',
    scene: 'screen-reader',
    cenario: 'corre-dino',
    setup: { freeExploration: true, goals: ['heard-empty', 'says-goal', 'says-control'] },
  },
  gravity: {
    type: 'experimentation',
    scene: 'gravity',
    cenario: 'corre-dino',
    setup: { freeExploration: true, goals: ['floating', 'landed'] },
  },
  impulse: {
    type: 'experimentation',
    scene: 'impulse',
    cenario: 'corre-dino',
    setup: { freeExploration: true, goals: ['first-height', 'other-height'] },
  },
  'jump-sound': {
    type: 'experimentation',
    scene: 'jump-sound',
    cenario: 'corre-dino',
    setup: { freeExploration: true, goals: ['false-sound', 'silent-jump', 'every-jump'] },
  },
} satisfies Record<string, ExperimentationActivity>

type CenaB = keyof typeof ATIVIDADES_LIVRES_DINO_B
const CENAS = Object.keys(ATIVIDADES_LIVRES_DINO_B) as CenaB[]

/** Ordens diferentes da sugerida: as metas caem do mesmo jeito. */
const ORDENS_ALTERNATIVAS: Record<CenaB, SceneAction[]> = {
  // Os números antes da borda (não contam), depois a borda e a altura primeiro.
  'stage-size': [tela(600, 300), borda(true), tela(600, 270), tela(480, 270)],
  // Só o que fazer primeiro, depois a frase inteira.
  'screen-reader': [ouvir, escrever('Corra e pule os cactos'), ouvir, escrever(FRASE), ouvir],
  // O pulo com gravidade primeiro; depois sem gravidade; depois com ela de novo, num pulo novo.
  gravity: [
    gravidade(true),
    pular,
    ...segundos(2),
    gravidade(false),
    pular,
    ...segundos(2),
    gravidade(true),
    ...segundos(3),
  ],
  // O 14 primeiro, depois o 9.
  impulse: [impulso(14), pular, ...segundos(2), impulso(9), pular, ...segundos(2)],
  // O som no pulo primeiro, pelo toque; depois na tecla; e de volta ao pulo para concluir.
  'jump-sound': [
    somNoPulo(true),
    pular,
    ...segundos(2),
    espaco,
    ...segundos(2),
    somNoPulo(false),
    pular,
    ...segundos(2),
    espaco,
    instante,
    espaco,
    ...segundos(2),
    somNoPulo(true),
  ],
}

const inicio = (cena: CenaB): SceneStart => ({
  scene: cena,
  setup: ATIVIDADES_LIVRES_DINO_B[cena].setup,
})
const jogar = (cena: CenaB, acoes: readonly SceneAction[]): SceneState => {
  const start = inicio(cena)
  return acoes.reduce((s, a) => stepScene(start, s, a), openScene(start))
}
const fala = (cena: CenaB, acoes: readonly SceneAction[]) =>
  discoveryGuidance(ATIVIDADES_LIVRES_DINO_B[cena], jogar(cena, acoes))?.id
const metas = (cena: CenaB) => sceneTargets(ATIVIDADES_LIVRES_DINO_B[cena])

const falas = new Map(
  CENAS.flatMap((cena) => discoverySpeechSteps(cena).map(({ id, text }) => [id, text] as const)),
)

/** O que a exploração livre não diz: bloco, área do Estúdio, regra, condição e os nomes dos blocos. */
export const SO_A_IDEIA_DINO_B =
  /\bregra|\bbloco|\bent[aã]o\b|\bsen[aã]o\b|\bcomando|\bc[oó]digo|\bEst[uú]dio|(^|\s)áreas?\b|Ao iniciar|Enquanto estiver|\bA cada (\d+ )?quadros?\b|Tocar efeito|Quando apertar|Quando o (Dino|sprite) pular|Aplicar a gravidade|Gravidade ao Dino|Mostrar a borda|Preparar o jogo|Descrever o jogo|leitor de tela\b.*\bbloco|força do pulo|Controlar o dinossauro|\baperte\b/i

describe('Dino B: os casos dos manifestos ligam a exploração livre', () => {
  test.each(CENAS)('%s: o caso é válido e cobra as metas do bloco', (cena) => {
    expect(isSceneSetup(ATIVIDADES_LIVRES_DINO_B[cena].setup, cena)).toBe(true)
    expect(metas(cena).length).toBeGreaterThan(1)
  })
})

describe('Dino B: o Zappy fala só da ideia', () => {
  test.each(CENAS)('%s tem falas próprias, com o prefixo da cena', (cena) => {
    const ids = discoverySpeechSteps(cena).map((s) => s.id)
    expect(ids.length).toBeGreaterThanOrEqual(5)
    for (const id of ids) expect(id.startsWith(`${cena}-`)).toBe(true)
  })

  test.each([
    ...falas.keys(),
  ])('%s não fala de bloco, área, regra, Se, então, senão nem código', (id) => {
    expect(falas.get(id)).not.toMatch(SO_A_IDEIA_DINO_B)
    // O "Se" da condição, com maiúscula como no bloco; o "se" da frase comum fica.
    expect(falas.get(id)).not.toMatch(/\bSe\b/)
    expect((falas.get(id) ?? '').length).toBeGreaterThan(40)
  })

  test('toda instrução de clique cita um rótulo exato da tela livre', () => {
    const ROTULOS = [
      'Ligar a borda',
      'Largura 800',
      'Largura 600',
      'Largura 480',
      'Altura 270',
      'Ouvir a tela',
      'Pular',
      'Ligar a gravidade',
      'Desligar a gravidade',
      'Impulso 9',
      'Impulso 14',
      'Apertar Espaço',
      'Tocar para pular',
      'Quando o Dino pula',
      'Quando a tecla Espaço é apertada',
    ]
    for (const [id, texto] of falas) {
      for (const m of texto.matchAll(/[Cc]lique em ([^,.:;?]+?)(?= e | depois|,|\.|$)/g)) {
        const citado = (m[1] ?? '').trim()
        // "clique de novo" e "clique em X e depois em Y": o primeiro rótulo é o conferido.
        expect([id, ROTULOS.some((r) => citado.startsWith(r))]).toEqual([id, true])
      }
    }
  })

  /** A fala de ANTES de um teste não pode contar o resultado dele. */
  const ANTES: [string, RegExp][] = [
    ['stage-size-start', /contorno|retângulo|mostra onde|acaba ali/i],
    ['stage-size-sized-hidden', /contorno|retângulo|mostra onde|mesma cor/i],
    ['stage-size-border', /muda junto|acompanha|fica (maior|menor|mais)/i],
    ['stage-size-border-600', /muda junto|acompanha|fica (maior|menor|mais)/i],
    ['stage-size-resized', /menor que|cabe dentro|mais baixa|mais estreita/i],
    // O campo Descrição do jogo só aparece depois da primeira escuta: a abertura não fala dele.
    ['screen-reader-start', /Imagem|só|não vê|nada|Descrição do jogo|vazio/i],
    ['screen-reader-empty', /lê a sua frase|ouve a sua frase|lê a frase/i],
    ['screen-reader-written', /lê a sua frase|ouve a sua frase|lê a frase|fica sabendo/i],
    ['gravity-start', /não volta|não para|sobe sem parar|só cresce|\bcai|volt(a|ou) ao chão/i],
    ['gravity-start-on', /\bcai|volt(a|ou) ao chão|devagar|para no alto|queda/i],
    ['gravity-flying', /não volta|sobe sem parar|só cresce|\bcai|volt(a|ou) ao chão|queda/i],
    ['gravity-landed-first', /não volta|não para de subir|sobe sem parar|só cresce/i],
    ['gravity-landed-first-off', /não volta|não para de subir|sobe sem parar|só cresce/i],
    ['gravity-floating', /volt(a|ou) ao chão|\bcai|desce|freia|devagar|queda/i],
    ['gravity-floating-ground', /volt(a|ou) ao chão|\bcai|desce|freia|devagar|queda/i],
    ['gravity-floating-on', /volt(a|ou) ao chão|\bcai|desce|freia|devagar|queda/i],
    ['impulse-start', /\b68\b|\b163\b|mais alt|mais baix/i],
    ['impulse-flying', /\b68\b|\b163\b|mais alt|mais baix/i],
    ['impulse-first', /mais alt|mais baix|bem acima|maior|menor/i],
    ['impulse-first-14', /mais alt|mais baix|bem acima|maior|menor/i],
    ['impulse-chosen', /mais alt|mais baix|bem acima|maior|menor/i],
    ['impulse-small', /mais alt|bem acima|muito acima/i],
    ['jump-sound-key-mode', /dois sons|2 sons|sem pulo|sem som|nenhum som|um som só/i],
    ['jump-sound-in-air', /dois sons|2 sons|sem pulo|um som só/i],
    ['jump-sound-false', /nenhum som|sem som|som nenhum|não toc/i],
    ['jump-sound-silent', /dois sons|2 sons|sem pulo/i],
    ['jump-sound-key-done', /um som em cada|uma vez em cada|cada pulo tem|não toc/i],
    ['jump-sound-jump-mode', /um som em cada|uma vez em cada|cada pulo tem|não toc/i],
    ['jump-sound-key-sound', /toque (veio|tocou)|também/i],
    ['jump-sound-tap-sound', /tecla (veio|tocou)|não toc|também/i],
    ['jump-sound-back-to-key', /dois sons|sem pulo|pulo sem som|som nenhum|nenhum som/i],
  ]
  test.each(ANTES)('%s não conta o resultado do próximo teste', (id, resultado) => {
    expect(falas.get(id)).toBeString()
    expect(falas.get(id)).not.toMatch(resultado)
  })
})

describe('Dino B: a exploração livre completa as metas do bloco', () => {
  for (const [nome, caminhos] of [
    ['o caminho sugerido', CAMINHOS_LIVRES_DINO_B],
    ['outra ordem', ORDENS_ALTERNATIVAS],
  ] as const)
    test.each(CENAS)(`%s: ${nome}`, (cena) => {
      const acoes = caminhos[cena] ?? []
      for (const a of acoes) if (a.type === 'advance') expect(a.seconds).toBeLessThanOrEqual(1)
      const s = jogar(cena, acoes)
      for (const meta of metas(cena)) expect(s.evidence.discoveries).toContain(meta)
      expect(evaluateExperimentation(cena, s, true, undefined, metas(cena)).passed).toBe(true)
      expect(isSceneState(s)).toBe(true)
      expect(fala(cena, acoes)).toBe(`${cena}-complete`)
    })

  test('a fala de cada cena começa pelo convite e acompanha o que foi testado', () => {
    expect(fala('stage-size', [])).toBe('stage-size-start')
    expect(fala('stage-size', [tela(600, 480)])).toBe('stage-size-sized-hidden')
    expect(fala('stage-size', [borda(true)])).toBe('stage-size-border')
    expect(fala('stage-size', [tela(600, 480), borda(true)])).toBe('stage-size-border-600')
    expect(fala('stage-size', [borda(true), borda(false)])).toBe('stage-size-border-off')
    expect(fala('stage-size', [borda(true), tela(600, 480)])).toBe('stage-size-resized')
    expect(
      fala('stage-size', [borda(true), tela(600, 480), borda(false), tela(480, 270), borda(true)]),
    ).toBe('stage-size-at-target-hidden')

    expect(fala('screen-reader', [])).toBe('screen-reader-start')
    expect(fala('screen-reader', [ouvir])).toBe('screen-reader-empty')
    expect(fala('screen-reader', [ouvir, escrever(FRASE)])).toBe('screen-reader-written')
    expect(fala('screen-reader', [ouvir, escrever('Corra e pule os cactos'), ouvir])).toBe(
      'screen-reader-goal-only',
    )
    expect(fala('screen-reader', [ouvir, escrever('Use a tecla espaço'), ouvir])).toBe(
      'screen-reader-control-only',
    )
    expect(fala('screen-reader', [ouvir, escrever('Um jogo bonito'), ouvir])).toBe(
      'screen-reader-neither',
    )

    expect(fala('gravity', [])).toBe('gravity-start')
    expect(fala('gravity', [gravidade(true)])).toBe('gravity-start-on')
    expect(fala('gravity', [pular, instante])).toBe('gravity-flying')
    expect(fala('gravity', [pular, ...segundos(2)])).toBe('gravity-floating')
    expect(fala('gravity', [gravidade(true), pular, ...segundos(2)])).toBe('gravity-landed-first')
    expect(fala('gravity', [gravidade(true), pular, ...segundos(2), gravidade(false)])).toBe(
      'gravity-landed-first-off',
    )

    expect(fala('impulse', [])).toBe('impulse-start')
    expect(fala('impulse', [pular, instante])).toBe('impulse-flying')
    expect(fala('impulse', [pular, ...segundos(2)])).toBe('impulse-first')
    expect(fala('impulse', [impulso(14), pular, ...segundos(2)])).toBe('impulse-first-14')
    expect(fala('impulse', [pular, ...segundos(2), impulso(14)])).toBe('impulse-chosen')
    expect(fala('impulse', [pular, ...segundos(2), pular, ...segundos(2)])).toBe('impulse-same')
    expect(fala('impulse', [impulso(5), pular, segundo, impulso(9), pular, segundo])).toBe(
      'impulse-small',
    )

    expect(fala('jump-sound', [])).toBe('jump-sound-key-mode')
    expect(fala('jump-sound', [espaco])).toBe('jump-sound-in-air')
    expect(fala('jump-sound', [espaco, instante, espaco])).toBe('jump-sound-false')
    expect(fala('jump-sound', [pular, ...segundos(2)])).toBe('jump-sound-silent')
    const teclaFeita = [espaco, instante, espaco, ...segundos(2), pular, ...segundos(2)]
    expect(fala('jump-sound', teclaFeita)).toBe('jump-sound-key-done')
    expect(fala('jump-sound', [...teclaFeita, somNoPulo(true)])).toBe('jump-sound-jump-mode')
    expect(fala('jump-sound', [somNoPulo(true), espaco, ...segundos(2)])).toBe(
      'jump-sound-key-sound',
    )
    expect(fala('jump-sound', [somNoPulo(true), pular, ...segundos(2)])).toBe(
      'jump-sound-tap-sound',
    )
    const pulos = [espaco, ...segundos(2), pular, ...segundos(2)]
    expect(fala('jump-sound', [somNoPulo(true), ...pulos])).toBe('jump-sound-back-to-key')
    expect(fala('jump-sound', [...teclaFeita, somNoPulo(true), ...pulos, somNoPulo(false)])).toBe(
      'jump-sound-settle',
    )
  })
})

describe('Dino B: a meta só cai quando a criança VIU', () => {
  test('as metas não caem sem o gesto que as mostra', () => {
    // Sem a borda, mudar o tamanho não mostra nada.
    expect(jogar('stage-size', [tela(480, 270)]).evidence.discoveries).toEqual([])
    // Escrever não é ouvir.
    expect(jogar('screen-reader', [escrever(FRASE)]).evidence.discoveries).toEqual([])
    // Ligar a gravidade sem pulo, e o pulo com gravidade antes do pulo sem ela, não fecham nada.
    expect(jogar('gravity', [gravidade(true), pular, ...segundos(2)]).evidence.discoveries).toEqual(
      [],
    )
    // Trocar o impulso sem pular não fecha nada; dois saltos iguais não comparam.
    expect(jogar('impulse', [impulso(14)]).evidence.discoveries).toEqual([])
    expect(
      jogar('impulse', [pular, ...segundos(2), pular, ...segundos(2)]).evidence.discoveries,
    ).not.toContain('other-height')
    // Trocar o momento do som sem pular não fecha nada.
    expect(jogar('jump-sound', [somNoPulo(true)]).evidence.discoveries).toEqual([])
  })

  test('a conclusão do som pede o som no pulo (settled), também na exploração livre', () => {
    const tudoSemFicar = [...(ORDENS_ALTERNATIVAS['jump-sound'] ?? [])].slice(0, -1)
    const s = jogar('jump-sound', tudoSemFicar)
    for (const meta of metas('jump-sound')) expect(s.evidence.discoveries).toContain(meta)
    expect(
      evaluateExperimentation('jump-sound', s, true, undefined, metas('jump-sound')).passed,
    ).toBe(false)
    expect(fala('jump-sound', tudoSemFicar)).toBe('jump-sound-settle')
  })
})
