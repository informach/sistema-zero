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
import type { Project } from '../../../packages/studio/src/core/project'
import { dicasNaOrdemDaJornada, PEDIDOS_DOS_MORADORES } from '../pedidos-dos-moradores'
import { ateABandeira, cairNoBuraco, pousarNoComeco, pular } from './objetivos'
import { projetoDaFaseEmPassos } from './projetos'

/**
 * Os quadros 1 a 5 do Pico Gelado (lacunas, 01/11/2026; refeitos no gênero do posto): a proposta
 * põe no Pico a plataforma com fases do Mestre. Os cinco quadros montam a "Fase do Pico" um passo
 * de cada vez (`projetoDaFaseEmPassos`): o pulo com apoio, a água que devolve ao começo e conta a
 * queda, a bandeira que leva à fase 2 com os dados dela, o fim do jogo na fase 2 e a volta à fase 1.
 * Só blocos da trilha (Faísca, Construtor e Inventor); a linguagem do posto fica no quadro 6.
 */
export const QUADROS_INICIAIS_DO_PICO = [
  {
    slug: 'pulo-com-apoio',
    titulo: 'Pulo com apoio',
    texto:
      'A gravidade, o gelo e as setas já funcionam. Complete Espaço: se noChao for verdadeiro, dê ao pinguim velocidade 12 para cima e marque noChao como falso. No ar, outro toque espera o próximo pouso.',
    dica: 'A velocidade e a marca de apoio ficam dentro do mesmo Se.',
  },
  {
    slug: 'agua-volta-ao-comeco',
    titulo: 'A água volta ao começo',
    texto:
      'O pinguim já anda e pula. Complete o encontro dele com a água: leve o pinguim de volta ao começo, marque noChao como falso e some um em quedas.',
    dica: 'Use os mesmos passos de colocar que o jogo usa para mudar um desenho de lugar.',
  },
  {
    slug: 'proxima-fase',
    titulo: 'A próxima fase',
    texto:
      'Pular e cair na água já funcionam. Complete o encontro com a bandeira: se fase for 1, mude fase para 2, leve o pinguim ao começo da fase 2 e leve a bandeira para o gelo do alto.',
    dica: 'Cada fase tem os seus dados: onde o pinguim começa e onde fica a bandeira. Na fase 2, a bandeira sobe para o gelo do alto.',
  },
  {
    slug: 'fim-do-jogo',
    titulo: 'Fim do jogo',
    texto:
      'A fase 2 já aparece. Complete o senão do mesmo encontro com a bandeira: se chegou for falso, marque chegou como verdadeiro e mude para a cena fim. Chegar de novo não termina outra vez.',
    dica: 'O fim do jogo fica no senão do Se da fase: só a bandeira da fase 2 termina o jogo.',
  },
  {
    slug: 'de-volta-a-fase-1',
    titulo: 'De volta à fase 1',
    texto:
      'O jogo já tem duas fases e um fim. Complete Enter para começar de novo da fase 1 sem recarregar: o pinguim volta ao começo, fase volta a 1, a bandeira volta ao gelo de baixo, chegou volta a falso, quedas a 0 e a cena volta a jogo.',
    dica: 'Guarde de novo, no Enter, os dados do começo da fase 1.',
  },
] as const
export type QuadroInicialDoPico = 1 | 2 | 3 | 4 | 5

export function projetoDoQuadroPico(quadro: QuadroInicialDoPico, pronto: boolean): Project {
  return projetoDaFaseEmPassos(quadro, pronto, QUADROS_INICIAIS_DO_PICO[quadro - 1]!.titulo)
}

const press = (k: string, holdMs = 30): ExecutionStep => ({ action: 'press', key: k, holdMs })
const wait = (ms: number): ExecutionStep => ({ action: 'wait', ms })
const val = (
  path: string,
  compare: ExecutionExpectation['compare'],
  value: number | boolean | string,
): ExecutionExpectation => ({ target: { kind: 'value', path }, compare, value })
const point = (
  afterStep: number,
  path: string,
  compare: ExecutionExpectation['compare'],
  value: number | boolean | string,
) => ({ afterStep, expect: val(path, compare, value) })
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

/** Do começo até a bandeira da fase 1 e a troca de fase (medido no minijogo da plataforma). */
const ATE_A_FASE_2 = [pousarNoComeco, ...ateABandeira, wait(600)]

export function objetivosDoQuadroPico(
  quadro: QuadroInicialDoPico,
): SectionJavaScriptProjectCheck[] {
  const recomecar = check(
    'recomecar',
    'Extra: Enter recomeça o jogo.',
    [pousarNoComeco, press('ArrowRight', 500), press('Enter'), wait(900)],
    val('pinguim.x', 'lessThan', 100),
    [point(2, 'pinguim.x', 'greaterThan', 100)],
    true,
  )
  if (quadro === 1)
    return [
      check(
        'pular',
        'Espaço faz o pinguim subir e voltar ao gelo, sem pular de novo no ar.',
        [pousarNoComeco, pular, wait(250), pular, wait(300), wait(1200)],
        val('noChao', 'equals', true),
        [
          point(1, 'noChao', 'equals', true),
          point(3, 'pinguim.y', 'lessThan', 300),
          point(5, 'pinguim.y', 'greaterThan', 200),
          point(6, 'pinguim.y', 'lessThan', 372),
        ],
      ),
      recomecar,
    ]
  if (quadro === 2)
    return [
      check(
        'agua',
        'Cair na água devolve o pinguim ao começo e conta uma queda.',
        [pousarNoComeco, ...cairNoBuraco],
        val('quedas', 'equals', 1),
        [
          point(1, 'noChao', 'equals', true),
          point(3, 'pinguim.x', 'lessThan', 100),
          point(3, 'noChao', 'equals', true),
        ],
      ),
      recomecar,
    ]
  if (quadro === 3)
    return [
      check(
        'proxima-fase',
        'Chegar à bandeira da fase 1 leva à fase 2, com o pinguim de volta ao começo.',
        ATE_A_FASE_2,
        val('fase', 'equals', 2),
        [
          point(2, 'fase', 'equals', 1),
          point(4, 'pinguim.x', 'greaterThan', 300),
          point(5, 'pinguim.x', 'lessThan', 300),
        ],
      ),
      recomecar,
    ]
  if (quadro === 4)
    return [
      check(
        'fim',
        'Na fase 2, subir no gelo do alto e chegar à bandeira termina o jogo.',
        [...ATE_A_FASE_2, wait(900), pular, wait(900), press('ArrowRight', 250), wait(300)],
        val('chegou', 'equals', true),
        [point(5, 'fase', 'equals', 2), point(5, 'chegou', 'equals', false)],
      ),
      recomecar,
    ]
  return [
    check(
      'volta-a-fase-1',
      'Na fase 2, Enter volta à fase 1 com o pinguim no começo.',
      [...ATE_A_FASE_2, press('Enter'), wait(900)],
      val('fase', 'equals', 1),
      [point(5, 'fase', 'equals', 2)],
    ),
    check(
      'quedas-zeradas',
      'A volta à fase 1 também zera as quedas.',
      [pousarNoComeco, ...cairNoBuraco, press('Enter')],
      val('quedas', 'equals', 0),
      [point(3, 'quedas', 'equals', 1)],
    ),
    check(
      'pular-com-seta',
      'Extra: a seta para cima também faz o pinguim pular, só quando ele está no gelo.',
      [pousarNoComeco, press('ArrowUp'), wait(250), press('ArrowUp'), wait(300), wait(1200)],
      val('noChao', 'equals', true),
      [
        point(1, 'noChao', 'equals', true),
        point(3, 'pinguim.y', 'lessThan', 300),
        point(5, 'pinguim.y', 'greaterThan', 200),
      ],
      true,
    ),
  ]
}

const EXTRAS: Record<QuadroInicialDoPico, string> = {
  1: 'Complete Enter para recomeçar o jogo.',
  2: 'Complete Enter para recomeçar o jogo.',
  3: 'Complete Enter para recomeçar o jogo.',
  4: 'Complete Enter para recomeçar o jogo.',
  5: 'Faça a seta para cima também pular, só quando o pinguim está no gelo.',
}

export function desafiosIniciaisDoPico(publico: PublicoDoDesafio) {
  return QUADROS_INICIAIS_DO_PICO.map((meta, i) => {
    const quadro = (i + 1) as QuadroInicialDoPico
    const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
    return DesafioDoManifestoSchema.parse({
      slug: `pico-${meta.slug}${publico === 'adulto' ? '-adulto' : ''}`,
      publico,
      ilha: 'pico',
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
            'O gelo, a gravidade e o desenho já estão prontos. Complete apenas o passo deste quadro.',
          ],
          meta.texto,
        ),
        projetoInicial: projetoDoQuadroPico(quadro, false),
        gabarito: projetoDoQuadroPico(quadro, true),
        objetivos: objetivosDoQuadroPico(quadro),
        desafioExtra: { titulo: 'Mais um desafio', texto: EXTRAS[quadro] },
        recompensa: {
          cor: true,
          atracao: `pico-${meta.slug}`,
          moedas: moedas.principal,
          moedasExtra: moedas.extra,
        },
        blocosManuais: { acrescentar: [], retirar: [] },
      },
    })
  })
}
