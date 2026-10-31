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
import { GRADE, projetoDoJardimEmPassos } from './jardim-em-grade'

/**
 * Os quadros 1 a 5 da Ilha das Nuvens (lacunas, 01/11/2026; refeitos no gênero do posto): a
 * proposta e a Jornada põem nas Nuvens a construção e gestão de um mundo do Gênio (grade,
 * ocupação, custo e produção). Os cinco quadros montam o Jardim em grade um passo de cada vez:
 * plantar com moedas, o canteiro ocupado que recusa, a produção pelo relógio, colher os canteiros e
 * a meta do jardim. Só blocos da trilha (Faísca, Construtor e Inventor): antes, o quadro 5 pedia
 * lista e laço em grupo, que nenhum posto ensina em blocos. O Pro fica no quadro 6.
 */
export const QUADROS_INICIAIS_DAS_NUVENS = [
  {
    slug: 'plantar-com-moedas',
    titulo: 'Plantar com moedas',
    texto:
      'As teclas 1, 2 e 3 já escolhem o canteiro. Complete Espaço: se moedas for pelo menos 2, plante no canteiro escolhido (marque plantado1, plantado2 ou plantado3 como verdadeiro) e tire 2 de moedas. Sem moedas bastantes, nada acontece.',
    dica: 'Um Se para as moedas por fora, e dentro dele um Se para cada canteiro, conferindo escolhido.',
  },
  {
    slug: 'canteiro-ocupado',
    titulo: 'Canteiro ocupado',
    texto:
      'Plantar já funciona. Complete cada canteiro: só plante e pague quando o canteiro escolhido ainda estiver vazio (plantado for falso). Um canteiro ocupado não recebe outra planta nem cobra de novo.',
    dica: 'Dentro do Se de cada canteiro, mais um Se que confere se ele está vazio.',
  },
  {
    slug: 'producao',
    titulo: 'A produção do jardim',
    texto:
      'Plantar e a ocupação já funcionam. Complete o relógio de cada segundo: cada canteiro plantado rende 1 moeda.',
    dica: 'Três Se no relógio, um para cada canteiro, cada um somando 1 em moedas.',
  },
  {
    slug: 'colher-os-canteiros',
    titulo: 'Colher os canteiros',
    texto:
      'O jardim já planta e produz. Complete a tecla C: cada canteiro plantado é colhido, fica vazio de novo e some um em colhidas.',
    dica: 'Sem lista: um Se para cada canteiro, do mesmo jeito do relógio.',
  },
  {
    slug: 'meta-do-jardim',
    titulo: 'A meta do jardim',
    texto:
      'O jardim já funciona inteiro. Complete o relógio: depois da produção, quando moedas chegar a 20, marque meta como verdadeiro, uma vez só.',
    dica: 'Um Se que confere moedas, e dentro dele outro que confere se a meta ainda não foi marcada.',
  },
] as const
export type QuadroInicialDasNuvens = 1 | 2 | 3 | 4 | 5

export function projetoDoQuadroNuvens(quadro: QuadroInicialDasNuvens, pronto: boolean): Project {
  return projetoDoJardimEmPassos(quadro, pronto, QUADROS_INICIAIS_DAS_NUVENS[quadro - 1]!.titulo)
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
const recomecar = check(
  'recomecar',
  'Extra: Enter recomeça o jardim.',
  [press('Space'), press('Enter')],
  val('moedas', GRADE.moedas),
  [{ afterStep: 1, expect: val('plantado1', true) }],
  true,
)
/** Os três canteiros plantados: 6 moedas viram 0. */
const PLANTAR_OS_TRES = [press('Space'), press('2'), press('Space'), press('3'), press('Space')]

export function objetivosDoQuadroNuvens(
  quadro: QuadroInicialDasNuvens,
): SectionJavaScriptProjectCheck[] {
  if (quadro === 1)
    return [
      check(
        'plantar',
        'Espaço planta no canteiro escolhido e paga 2 moedas.',
        [press('2'), press('Space')],
        val('moedas', GRADE.moedas - GRADE.custo),
        [{ afterStep: 2, expect: val('plantado2', true) }],
      ),
      check(
        'sem-moedas',
        'Sem moedas bastantes, não planta e as moedas não ficam negativas.',
        [press('Space'), press('Space'), press('Space'), press('Space')],
        val('moedas', 0),
        [{ afterStep: 3, expect: val('moedas', 0) }],
      ),
      recomecar,
    ]
  if (quadro === 2)
    return [
      check(
        'ocupado',
        'Um canteiro ocupado não recebe outra planta nem cobra de novo.',
        [press('Space'), press('Space')],
        val('moedas', GRADE.moedas - GRADE.custo),
        [{ afterStep: 1, expect: val('plantado1', true) }],
      ),
      recomecar,
    ]
  if (quadro === 3)
    return [
      check(
        'producao',
        'Cada canteiro plantado rende moedas a cada segundo.',
        [press('Space'), wait(2600)],
        val('moedas', GRADE.moedas, 'atLeast'),
        [{ afterStep: 1, expect: val('moedas', GRADE.moedas - GRADE.custo) }],
      ),
      recomecar,
    ]
  if (quadro === 4)
    return [
      check(
        'colher',
        'C colhe os canteiros plantados e conta cada um.',
        [press('Space'), press('2'), press('Space'), press('c')],
        val('colhidas', 2),
        [{ afterStep: 3, expect: val('plantado2', true) }],
      ),
      check(
        'canteiro-livre',
        'Colhido, o canteiro fica vazio e pode ser plantado de novo.',
        [press('Space'), press('c'), press('Space')],
        val('plantado1', true),
        [{ afterStep: 2, expect: val('plantado1', false) }],
      ),
      recomecar,
    ]
  return [
    check(
      'meta',
      'Com 20 moedas, o jardim chega à meta.',
      [...PLANTAR_OS_TRES, wait(7800)],
      val('meta', true),
      [{ afterStep: 5, expect: val('meta', false) }],
    ),
    recomecar,
  ]
}

export function desafiosIniciaisDasNuvens(publico: PublicoDoDesafio) {
  return QUADROS_INICIAIS_DAS_NUVENS.map((meta, i) => {
    const quadro = (i + 1) as QuadroInicialDasNuvens
    const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
    return DesafioDoManifestoSchema.parse({
      slug: `nuvens-${meta.slug}${publico === 'adulto' ? '-adulto' : ''}`,
      publico,
      ilha: 'nuvens',
      tipo: 'quadro-das-cores',
      quadro,
      ordem: quadro * 10,
      // Todas as fontes na trilha (lacunas, 01/11/2026); a importação continua com a equipe.
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
            'Os canteiros, a escolha e o desenho já estão prontos. Complete apenas o passo deste quadro.',
          ],
          meta.texto,
        ),
        projetoInicial: projetoDoQuadroNuvens(quadro, false),
        gabarito: projetoDoQuadroNuvens(quadro, true),
        objetivos: objetivosDoQuadroNuvens(quadro),
        desafioExtra: {
          titulo: 'Mais um desafio',
          texto: 'Complete Enter para recomeçar o jardim.',
        },
        recompensa: {
          cor: true,
          atracao: `nuvens-${meta.slug}`,
          moedas: moedas.principal,
          moedasExtra: moedas.extra,
        },
        blocosManuais: { acrescentar: [], retirar: [] },
      },
    })
  })
}
