import {
  DesafioDoManifestoSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import type { SectionJavaScriptProjectCheck } from '../../../packages/core/src/learning/section-progression'
import type { Project } from '../../../packages/studio/src/core/project'
import { dicasNaOrdemDaJornada, PEDIDOS_DOS_MORADORES } from '../pedidos-dos-moradores'
import { check, ONDA_DE_3, ONDA_DE_4, ONDA_INTEIRA, press, recomecar, val, wait } from './objetivos'
import { projetoDoGuardiaoEmPassos } from './projetos'

/**
 * Os quadros 1 a 5 do Vale dos Dinos (lacunas, 01/11/2026; refeitos no gênero do posto): a
 * proposta e a Jornada põem no Vale a defesa de torre do Arquiteto (ondas, caminho e alcance). Os
 * cinco quadros montam o Guardião dos ninhos um passo de cada vez: começar uma onda, o relógio
 * que solta a cinza pelo caminho, a cinza que atinge o ninho, o alcance da torre e as ondas que
 * crescem. Só blocos da trilha (Faísca, Construtor e Inventor): antes, os quadros 1 e 2 pediam
 * lista e laço, que nenhum posto ensina em blocos. A linguagem do posto fica no quadro 6.
 */
export const QUADROS_INICIAIS_DO_VALE = [
  {
    slug: 'onda-de-cinza',
    titulo: 'Uma onda de cada vez',
    texto:
      'O vulcão, o caminho e a torre já estão desenhados. Complete Espaço: quando emOnda for falso, marque emOnda como verdadeiro, some um em onda e zere cinzasNaOnda. Durante uma onda, outro toque espera.',
    dica: 'As três ações ficam dentro do Se que confere emOnda.',
  },
  {
    slug: 'relogio-da-onda',
    titulo: 'O relógio da onda',
    texto:
      'Começar a onda já funciona. Complete o relógio de cada segundo: se emOnda for verdadeiro, solte uma cinza no grupo cinzas, no caminho, descendo; some um em cinzasNaOnda; quando cinzasNaOnda chegar a tamanhoDaOnda, marque emOnda como falso.',
    dica: 'A cinza nasce acima do palco, em x 310, descendo 2 por atualização. O fim da onda é um Se dentro do Se de emOnda.',
  },
  {
    slug: 'ninho-atingido',
    titulo: 'A cinza no ninho',
    texto:
      'As ondas já soltam a cinza. Complete o encontro do ninho com o grupo cinzas: tire a cinza do grupo e some um em atingidos.',
    dica: 'O encontro dá um nome a cada cinza que chega. É essa cinza que sai do grupo.',
  },
  {
    slug: 'alcance-da-torre',
    titulo: 'O alcance da torre',
    texto:
      'A cinza já atinge o ninho. Complete o encontro do alcance da torre com o grupo cinzas: tire a cinza do grupo e some um em pontos. A cinza que entra no alcance não chega ao ninho.',
    dica: 'O círculo tracejado é o alcance da torre. Ele encontra o grupo do mesmo jeito que o ninho.',
  },
  {
    slug: 'ondas-que-crescem',
    titulo: 'Ondas que crescem',
    texto:
      'A defesa já funciona. Complete Espaço: depois de somar a onda, guarde em tamanhoDaOnda a onda mais 2. Assim a primeira onda tem 3 cinzas, a segunda 4 e assim por diante.',
    dica: 'A conta usa a onda que acabou de mudar, então ela vem depois do mais um.',
  },
] as const
export type QuadroInicialDoVale = 1 | 2 | 3 | 4 | 5

export function projetoDoQuadroVale(quadro: QuadroInicialDoVale, pronto: boolean): Project {
  return projetoDoGuardiaoEmPassos(quadro, pronto, QUADROS_INICIAIS_DO_VALE[quadro - 1]!.titulo)
}

export function objetivosDoQuadroVale(
  quadro: QuadroInicialDoVale,
): SectionJavaScriptProjectCheck[] {
  if (quadro === 1)
    return [
      check('comecar', 'Espaço começa a primeira onda.', [press('Space')], val('onda', 1), [
        { afterStep: 0, expect: val('onda', 0) },
      ]),
      check(
        'uma-por-vez',
        'Durante uma onda, outro toque não começa outra.',
        [press('Space'), press('Space')],
        val('onda', 1),
        [{ afterStep: 1, expect: val('emOnda', true) }],
      ),
      recomecar,
    ]
  if (quadro === 2)
    return [
      check(
        'soltar-cinza',
        'O relógio solta as três cinzas da onda, uma por segundo.',
        [press('Space'), wait(ONDA_DE_3)],
        val('cinzasNaOnda', 3),
      ),
      check(
        'onda-acaba',
        'Depois da última cinza a onda acaba, e Espaço começa a próxima.',
        [press('Space'), wait(ONDA_DE_3), press('Space')],
        val('onda', 2),
        [{ afterStep: 2, expect: val('emOnda', false) }],
      ),
      recomecar,
    ]
  if (quadro === 3)
    return [
      check(
        'ninho',
        'A cinza que chega ao ninho é contada e sai do caminho.',
        [press('Space'), wait(ONDA_INTEIRA)],
        val('atingidos', 3),
      ),
      recomecar,
    ]
  if (quadro === 4)
    return [
      check(
        'alcance',
        'A torre limpa a cinza que entra no alcance e conta o ponto.',
        [press('Space'), wait(ONDA_INTEIRA)],
        val('pontos', 3),
      ),
      check(
        'ninho-salvo',
        'Com a torre limpando, nenhuma cinza chega ao ninho.',
        [press('Space'), wait(ONDA_INTEIRA)],
        val('atingidos', 0),
      ),
      recomecar,
    ]
  return [
    check(
      'ondas-crescem',
      'A segunda onda tem uma cinza a mais que a primeira.',
      [press('Space'), wait(ONDA_DE_3), press('Space'), wait(ONDA_DE_4)],
      val('cinzasNaOnda', 4),
      [{ afterStep: 2, expect: val('cinzasNaOnda', 3) }],
    ),
    recomecar,
  ]
}

export function desafiosIniciaisDoVale(publico: PublicoDoDesafio) {
  return QUADROS_INICIAIS_DO_VALE.map((meta, i) => {
    const quadro = (i + 1) as QuadroInicialDoVale
    const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
    return DesafioDoManifestoSchema.parse({
      slug: `vale-${meta.slug}${publico === 'adulto' ? '-adulto' : ''}`,
      publico,
      ilha: 'vale-dos-dinos',
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
            'O vulcão, a torre e o desenho já estão prontos. Complete apenas o passo deste quadro.',
          ],
          meta.texto,
        ),
        projetoInicial: projetoDoQuadroVale(quadro, false),
        gabarito: projetoDoQuadroVale(quadro, true),
        objetivos: objetivosDoQuadroVale(quadro),
        desafioExtra: {
          titulo: 'Mais um desafio',
          texto: 'Complete Enter para recomeçar a defesa.',
        },
        recompensa: {
          cor: true,
          atracao: `vale-${meta.slug}`,
          moedas: moedas.principal,
          moedasExtra: moedas.extra,
        },
        blocosManuais: { acrescentar: [], retirar: [] },
      },
    })
  })
}
