import {
  DesafioDoManifestoSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import type {
  ExecutionExpectation,
  ExecutionStep,
} from '../../../packages/core/src/learning/project-execution'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import { buildWorkspaceStateFromIR } from '../../../packages/studio/src/blockly/workspaceState'
import { createEmptyProject, type Project } from '../../../packages/studio/src/core/project'
import { generateProjectFiles } from '../../../packages/studio/src/generators/project'
import { assignStableIdsToIR } from '../../../packages/studio/src/ir/ids'
import type { JSExpr, JSStatement, SZIRV2 } from '../../../packages/studio/src/ir/schema'
import { dicasNaOrdemDaJornada, PEDIDOS_DOS_MORADORES } from '../pedidos-dos-moradores'
import { ASSETS_DO_RECIFE } from './projetos'

/**
 * Os quadros 1 a 5 do Recife Coral (lacunas, 01/11/2026; refeitos no gênero do posto): a proposta
 * põe no Recife o jogo de mira e alvos do Explorador, com sorteio de lugar, tempo de partida e
 * pontos. Os cinco quadros montam, um passo de cada vez, a "Mira do Recife": soltar uma bolha por
 * vez, prender o alvo e contar o ponto, sortear o lugar novo do alvo, o tempo da partida e a nova
 * partida. Cada quadro traz pronto o que os anteriores fizeram e deixa vazio só o passo dele. Só
 * blocos da trilha (Faísca, Construtor e Inventor), como os outros quadros em blocos da ilha.
 */
export const QUADROS_INICIAIS_DO_RECIFE = [
  {
    slug: 'uma-bolha-por-vez',
    titulo: 'Uma bolha por vez',
    texto:
      'A mira já anda com as setas e a bolha já sobe sozinha. Complete Espaço: quando emVoo for falso, leve a bolha até a mira, dê velocidade para cima, mostre a bolha, marque emVoo como verdadeiro e some um em lancamentos. Com uma bolha subindo, outro toque espera.',
    dica: 'Tudo fica dentro de um Se que confere emVoo. Quando a bolha sai pelo alto, o laço já marca emVoo como falso.',
  },
  {
    slug: 'alvo-preso',
    titulo: 'Alvo preso conta ponto',
    texto:
      'Soltar a bolha já funciona. Complete o encontro da bolha com o alvo: se emVoo for verdadeiro, marque emVoo como falso, esconda a bolha, pare a bolha e some um em pontos. Uma bolha prende o alvo uma vez só.',
    dica: 'O Se com emVoo impede que a mesma bolha conte o ponto de novo enquanto ainda encosta no alvo.',
  },
  {
    slug: 'alvo-em-outro-lugar',
    titulo: 'O alvo muda de lugar',
    texto:
      'Prender o alvo já conta ponto. Complete o mesmo encontro: depois de contar o ponto, leve o alvo para um lugar sorteado no alto, com x entre 200 e 560. Assim cada bolha pede uma mira nova.',
    dica: 'Use os mesmos passos que levam a bolha até a mira, com o sorteio entre 200 e 560 no lugar do x.',
  },
  {
    slug: 'tempo-de-partida',
    titulo: 'Tempo de partida',
    texto:
      'A mira, o alvo e os pontos já funcionam. Complete o relógio de cada segundo: enquanto fim for falso, tire um de tempo; quando tempo chegar a 0, marque fim como verdadeiro. Depois, faça Espaço soltar a bolha só enquanto fim for falso.',
    dica: 'Dois Se no relógio, um dentro do outro. No Espaço, o Se de fim fica por fora do Se de emVoo.',
  },
  {
    slug: 'nova-partida',
    titulo: 'Nova partida',
    texto:
      'A partida já tem tempo e fim. Complete Enter para começar outra partida sem recarregar: pontos e lancamentos voltam a 0, tempo volta a 8, fim e emVoo voltam a falso e a bolha some.',
    dica: 'Guarde de novo, no Enter, os mesmos valores do começo do jogo.',
  },
] as const
export type QuadroInicialDoRecife = 1 | 2 | 3 | 4 | 5

/** O tempo de uma partida (s): curto o bastante para conferir no executor, que espera até 10 s. */
export const TEMPO_DA_PARTIDA = 8
const MIRA = { x: 72, y: 360 }
const BOLHA_Y = 340
const ALVO = { x: 60, y: 120 }

const n = (value: number): JSExpr => ({ type: 'num', value })
const v = (name: string): JSExpr => ({ type: 'var', name })
const b = (value: boolean): JSExpr => ({ type: 'bool', value })
const set = (name: string, value: JSExpr): JSStatement => ({ type: 'assign', name, value })
const bin = (op: '===' | '+' | '-' | '<' | '>', left: JSExpr, right: JSExpr): JSExpr => ({
  type: 'binop',
  op,
  left,
  right,
})
const mais = (name: string, d: number) => set(name, bin(d < 0 ? '-' : '+', v(name), n(Math.abs(d))))
const iff = (cond: JSExpr, then: JSStatement[], otherwise: JSStatement[] = []): JSStatement => ({
  type: 'if',
  cond,
  then,
  else: otherwise,
})
const vel = (spriteVar: string, vx: JSExpr, vy: JSExpr): JSStatement => ({
  type: 'g2d:setVelocity',
  spriteVar,
  vx,
  vy,
})
const apply = (spriteVar: string): JSStatement => ({ type: 'g2d:applyVelocity', spriteVar })
const image = (varName: string, img: string, x: number, y: number, w: number, h: number) =>
  ({ type: 'g2d:createImageSprite', varName, image: img, x, y, w, h }) as JSStatement
const draw = (spriteVar: string): JSStatement => ({
  type: 'g2d:drawSprite',
  ctxVar: 'ctx',
  spriteVar,
})
const label = (text: string | JSExpr, x: number, y: number, size = 16): JSStatement => ({
  type: 'g2d:drawLabel',
  ctxVar: 'ctx',
  text,
  x,
  y,
  size,
  color: '#123d55',
  align: 'left',
})
const key = (k: string, body: JSStatement[]): JSStatement => ({ type: 'g2d:onKey', key: k, body })

/** Leva um desenho até (x, y) com velocidade e borda, os blocos da trilha (sem posição manual). */
function colocar(sprite: string, x: JSExpr, y: number): JSStatement[] {
  return [
    vel(sprite, n(-640), n(-480)),
    apply(sprite),
    { type: 'g2d:clampToScreen', spriteVar: sprite, ctxVar: 'ctx' },
    vel(sprite, x, n(y)),
    apply(sprite),
    vel(sprite, n(0), n(0)),
  ]
}

/**
 * As informações do começo (o Enter da nova partida guarda as mesmas). Uma função: cada uso ganha
 * blocos próprios (o mesmo objeto em dois lugares repetiria o identificador).
 */
const inicio = (): [string, JSExpr][] => [
  ['emVoo', b(false)],
  ['bolhaVisivel', b(false)],
  ['fim', b(false)],
  ['lancamentos', n(0)],
  ['pontos', n(0)],
  ['tempo', n(TEMPO_DA_PARTIDA)],
  ['recorde', n(0)],
]

function fonteDoQuadro(quadro: QuadroInicialDoRecife, pronto: boolean): SZIRV2 {
  // O passo do quadro só vem pronto no gabarito; os anteriores vêm sempre.
  const tem = (passo: number) => passo < quadro || (pronto && passo === quadro)
  const soltar = [
    ...colocar('bolha', { type: 'g2d:spriteX', spriteVar: 'mira' }, BOLHA_Y),
    vel('bolha', n(0), n(-5)),
    set('bolhaVisivel', b(true)),
    set('emVoo', b(true)),
    mais('lancamentos', 1),
  ]
  const espaco = tem(1)
    ? tem(4)
      ? [iff(bin('===', v('fim'), b(false)), [iff(bin('===', v('emVoo'), b(false)), soltar)])]
      : [iff(bin('===', v('emVoo'), b(false)), soltar)]
    : []
  const prender = tem(2)
    ? [
        iff(v('emVoo'), [
          set('emVoo', b(false)),
          set('bolhaVisivel', b(false)),
          vel('bolha', n(0), n(0)),
          mais('pontos', 1),
          ...(tem(3)
            ? colocar('alvo', { type: 'g2d:randomBetween', min: n(200), max: n(560) }, ALVO.y)
            : []),
        ]),
      ]
    : []
  const relogio = tem(4)
    ? [
        iff(bin('===', v('fim'), b(false)), [
          mais('tempo', -1),
          iff(bin('===', v('tempo'), n(0)), [set('fim', b(true))]),
        ]),
      ]
    : []
  const novaPartida = [
    // O extra do quinto quadro: o recorde fica com a melhor partida antes de zerar.
    ...(quadro === 5 && pronto
      ? [iff(bin('>', v('pontos'), v('recorde')), [set('recorde', v('pontos'))])]
      : []),
    ...inicio()
      .filter(([name]) => name !== 'recorde')
      .map(([name, value]) => set(name, value)),
    vel('bolha', n(0), n(0)),
  ]
  // O extra dos quadros 1 a 4: o Enter recomeça o jogo (o bloco da trilha do Faísca).
  const enter =
    quadro === 5
      ? tem(5)
        ? novaPartida
        : []
      : pronto
        ? [{ type: 'g2d:restart' } as JSStatement]
        : []
  return {
    version: 2,
    html: [],
    css: [],
    extensions: [{ extensionId: 'game-2d' }],
    behavior: {
      start: [
        { type: 'g2d:setupStage', width: 640, height: 480, bg: '#c6eff3' },
        { type: 'g2d:enableClassicControls', mode: 'auto' },
        ...inicio().map(([name, value]): JSStatement => ({ type: 'var', name, value })),
        image('mira', 'mira', MIRA.x, MIRA.y, 48, 48),
        image('bolha', 'bolha', 64, BOLHA_Y, 64, 64),
        image('alvo', 'alvo', ALVO.x, ALVO.y, 56, 56),
      ],
      events: [
        key('Space', espaco),
        key('Enter', enter),
        { type: 'g2d:onOverlap', aVar: 'bolha', bVar: 'alvo', body: prender },
      ],
      loops: [
        {
          type: 'g2d:updateEachFrame',
          body: [
            { type: 'g2d:arrowsX', spriteVar: 'mira', speed: 3 },
            { type: 'g2d:clampToScreen', spriteVar: 'mira', ctxVar: 'ctx' },
            iff(v('emVoo'), [
              apply('bolha'),
              iff(bin('<', { type: 'g2d:spriteY', spriteVar: 'bolha' }, n(-64)), [
                set('emVoo', b(false)),
                set('bolhaVisivel', b(false)),
                vel('bolha', n(0), n(0)),
              ]),
            ]),
            { type: 'g2d:clear' },
            { type: 'g2d:drawBackdrop', ctxVar: 'ctx', image: 'recife' },
            label(QUADROS_INICIAIS_DO_RECIFE[quadro - 1]!.titulo, 18, 32, 24),
            label('Setas mexem a mira. Espaço ou A solta a bolha.', 18, 60),
            draw('alvo'),
            draw('mira'),
            iff(v('bolhaVisivel'), [draw('bolha')]),
            {
              type: 'g2d:drawScore',
              ctxVar: 'ctx',
              label: 'Pontos: ',
              value: v('pontos'),
              x: 490,
              y: 32,
              size: 18,
              color: '#123d55',
            },
            ...(quadro >= 4
              ? [
                  label('Tempo:', 490, 60),
                  label(v('tempo'), 560, 60),
                  iff(v('fim'), [label('Fim da partida. Enter começa outra.', 160, 440, 18)]),
                ]
              : []),
          ],
        },
        // O relógio da partida: no quarto quadro vem vazio para completar.
        ...(quadro >= 4
          ? [{ type: 'g2d:everySeconds', seconds: n(1), body: relogio } as JSStatement]
          : []),
      ],
    },
  }
}

export function projetoDoQuadroRecife(quadro: QuadroInicialDoRecife, pronto: boolean): Project {
  const meta = QUADROS_INICIAIS_DO_RECIFE[quadro - 1]!
  const ir = assignStableIdsToIR(fonteDoQuadro(quadro, pronto), `recife_quadro_${quadro}`)
  return {
    ...createEmptyProject(`recife-${meta.slug}`, meta.titulo),
    programmingLanguage: 'javascript',
    mode: 'blocks',
    createdAt: 0,
    updatedAt: 0,
    ir,
    blocksState: buildWorkspaceStateFromIR(ir),
    files: generateProjectFiles({ ir, projectName: meta.titulo }),
    assets: ASSETS_DO_RECIFE,
    installedExtensions: [{ id: 'game-2d', version: '1.2.0', installedAt: 0 }],
  }
}

const press = (k: string, holdMs = 30): ExecutionStep => ({ action: 'press', key: k, holdMs })
const wait = (ms: number): ExecutionStep => ({ action: 'wait', ms })
const val = (
  path: string,
  value: number | boolean,
  compare: ExecutionExpectation['compare'] = 'equals',
): ExecutionExpectation => ({ target: { kind: 'value', path }, compare, value })
const check = (
  id: string,
  label: string,
  steps: ExecutionStep[],
  expect: ExecutionExpectation,
  checkpoints: { afterStep: number; expect: ExecutionExpectation }[] = [],
  optional = false,
): SectionJavaScriptProjectCheck => ({
  id,
  label,
  programmingLanguage: 'javascript',
  ...(optional ? { optional: true } : {}),
  rule: { type: 'behavior', steps, expect, ...(checkpoints.length ? { checkpoints } : {}) },
})
/** A bolha sai da mira e chega ao alvo (logo acima dela) em menos de um segundo. */
const ACERTO = 1200
/** Tempo para a partida acabar: os 8 segundos e uma folga para o jogo abrir. */
const ATE_O_FIM = 9500

export function objetivosDoQuadroRecife(
  quadro: QuadroInicialDoRecife,
): SectionJavaScriptProjectCheck[] {
  const recomecar = check(
    'recomecar',
    'Extra: Enter recomeça o jogo.',
    [press('Space'), press('Enter')],
    val('lancamentos', 0),
    [{ afterStep: 1, expect: val('lancamentos', 1) }],
    true,
  )
  if (quadro === 1)
    return [
      check('soltar', 'Espaço solta uma bolha.', [press('Space')], val('lancamentos', 1), [
        { afterStep: 0, expect: val('lancamentos', 0) },
      ]),
      check(
        'uma-por-vez',
        'Com uma bolha subindo, outro toque espera; depois que ela sai, sai outra.',
        [press('Space'), press('Space'), wait(1800), press('Space')],
        val('lancamentos', 2),
        [{ afterStep: 2, expect: val('lancamentos', 1) }],
      ),
      recomecar,
    ]
  if (quadro === 2)
    return [
      check(
        'prender',
        'A bolha que encosta no alvo conta um ponto.',
        [press('Space'), wait(ACERTO)],
        val('pontos', 1),
        [{ afterStep: 0, expect: val('pontos', 0) }],
      ),
      check(
        'outra-bolha',
        'Uma bolha conta uma vez; a próxima bolha conta de novo.',
        [press('Space'), wait(ACERTO), wait(600), press('Space'), wait(ACERTO)],
        val('pontos', 2),
        [{ afterStep: 3, expect: val('pontos', 1) }],
      ),
      recomecar,
    ]
  if (quadro === 3)
    return [
      check(
        'outro-lugar',
        'Preso o alvo, ele volta num lugar sorteado no alto.',
        [press('Space'), wait(ACERTO)],
        val('alvo.x', 190, 'atLeast'),
        [
          { afterStep: 0, expect: val('alvo.x', ALVO.x) },
          { afterStep: 2, expect: val('pontos', 1) },
        ],
      ),
      recomecar,
    ]
  if (quadro === 4)
    return [
      check(
        'acabar',
        'O relógio tira um segundo de cada vez e a partida acaba no zero.',
        [wait(ATE_O_FIM)],
        val('fim', true),
        [{ afterStep: 0, expect: val('fim', false) }],
      ),
      check(
        'sem-bolha-no-fim',
        'Depois do fim, Espaço não solta bolha.',
        [wait(ATE_O_FIM), press('Space')],
        val('lancamentos', 0),
        [{ afterStep: 1, expect: val('tempo', 0) }],
      ),
      recomecar,
    ]
  return [
    check(
      'nova-partida',
      'Depois do fim, Enter começa outra partida com o tempo cheio.',
      [wait(ATE_O_FIM), press('Enter')],
      // Um segundo do relógio pode passar logo depois do Enter.
      val('tempo', TEMPO_DA_PARTIDA - 1, 'atLeast'),
      [{ afterStep: 1, expect: val('fim', true) }],
    ),
    check(
      'pontos-zerados',
      'A nova partida começa sem pontos e já solta bolha.',
      [press('Space'), wait(ACERTO), press('Enter'), press('Space')],
      val('pontos', 0),
      [
        { afterStep: 2, expect: val('pontos', 1) },
        { afterStep: 4, expect: val('lancamentos', 1) },
      ],
    ),
    check(
      'recorde',
      'Extra: antes de zerar, o recorde guarda a melhor partida.',
      [press('Space'), wait(ACERTO), press('Enter')],
      val('recorde', 1),
      [{ afterStep: 2, expect: val('pontos', 1) }],
      true,
    ),
  ]
}

const EXTRAS: Record<QuadroInicialDoRecife, string> = {
  1: 'Complete Enter para recomeçar o jogo.',
  2: 'Complete Enter para recomeçar o jogo.',
  3: 'Complete Enter para recomeçar o jogo.',
  4: 'Complete Enter para recomeçar o jogo.',
  5: 'Antes de zerar os pontos, guarde em recorde a melhor partida: se pontos for maior que recorde, recorde recebe pontos.',
}

export function desafiosIniciaisDoRecife(publico: PublicoDoDesafio) {
  return QUADROS_INICIAIS_DO_RECIFE.map((meta, i) => {
    const quadro = (i + 1) as QuadroInicialDoRecife
    const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
    return DesafioDoManifestoSchema.parse({
      slug: `recife-${meta.slug}${publico === 'adulto' ? '-adulto' : ''}`,
      publico,
      ilha: 'recife',
      tipo: 'quadro-das-cores',
      quadro,
      ordem: quadro * 10,
      // C01b: todas as fontes na trilha; a importação continua com a equipe.
      publicar: true,
      conteudo: {
        versao: 1,
        titulo: meta.titulo,
        // A44: o pedido do morador, e as dicas na ordem da Jornada (lacunas, 01/11/2026).
        enunciado: PEDIDOS_DOS_MORADORES[meta.slug]!.pedido,
        dicas: dicasNaOrdemDaJornada(
          PEDIDOS_DOS_MORADORES[meta.slug]!.objetivo,
          [
            meta.dica,
            'A mira, a bolha e o desenho já estão prontos. Complete apenas o passo deste quadro.',
          ],
          meta.texto,
        ),
        projetoInicial: projetoDoQuadroRecife(quadro, false),
        gabarito: projetoDoQuadroRecife(quadro, true),
        objetivos: objetivosDoQuadroRecife(quadro),
        desafioExtra: { titulo: 'Mais um desafio', texto: EXTRAS[quadro] },
        recompensa: {
          cor: true,
          atracao: `recife-${meta.slug}`,
          moedas: moedas.principal,
          moedasExtra: moedas.extra,
        },
        blocosManuais: { acrescentar: [], retirar: [] },
      },
    })
  })
}
