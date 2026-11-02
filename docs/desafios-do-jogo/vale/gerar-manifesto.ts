import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { comApresentacao } from '../apresentacao'
import { comPedidosDosMoradores } from '../pedidos-dos-moradores'
import { objetivos } from './objetivos'
import { montarProjeto, TITULO_DAS_VARIACOES, VARIACOES, type Variacao } from './projetos'
import { desafiosIniciaisDoVale } from './quadros-iniciais'

/**
 * Os desafios do dia do Vale (lacunas, 01/11/2026): o Guardião dos ninhos pronto, com uma regra a
 * mudar em cada um. Substituem o "Proteja os ninhos", que pedia blocos que nenhum posto ensina.
 */
const textos: Record<Variacao, { enunciado: string; dicas: string[] }> = {
  'mais-cinzas': {
    enunciado:
      'A defesa já funciona. Mude a conta das ondas: cada onda passa a ter a onda mais 3 cinzas, e a primeira fica com 4.',
    dicas: ['Procure tamanhoDaOnda no evento de Espaço.', 'Troque só o número somado à onda.'],
  },
  'dois-pontos': {
    enunciado:
      'A defesa já funciona. Mude o encontro do alcance com a cinza: cada cinza limpa pela torre passa a valer 2 pontos.',
    dicas: [
      'Procure a soma de pontos no encontro do alcance.',
      'O número de cinzas no ninho não muda.',
    ],
  },
  'ondas-contadas': {
    enunciado:
      'A defesa já funciona. A Jade quer só três ondas: em Espaço, só comece uma onda nova quando onda for menor que 3.',
    dicas: [
      'Ponha um Se a mais por dentro do Se de emOnda.',
      'Compare onda com 3 usando menor que.',
    ],
  },
  'onda-limpa': {
    enunciado:
      'A defesa já funciona. No relógio, quando a onda acaba, se atingidos ainda for 0, some 5 em pontos de bônus.',
    dicas: [
      'O bônus fica dentro do Se que termina a onda.',
      'Confira atingidos igual a 0 antes de somar.',
    ],
  },
}

export function criarManifesto(publico: PublicoDoDesafio = 'kids') {
  return comApresentacao(
    comPedidosDosMoradores(
      ManifestoDeDesafiosSchema.parse({
        formato: 'arquipelago-desafios',
        versao: 1,
        escopo: 'ilha',
        desafios: [
          ...desafiosIniciaisDoVale(publico),
          ...VARIACOES.map((variacao, i) => {
            const tipo = 'desafio-do-dia' as const
            const moedas = MOEDAS_PADRAO_POR_TIPO[tipo]
            return {
              slug: `vale-guardiao-${variacao}${publico === 'adulto' ? '-adulto' : ''}`,
              publico,
              ilha: 'vale-dos-dinos',
              tipo,
              quadro: null,
              ordem: 60 + i,
              // Só blocos da trilha (lacunas, 01/11/2026): pede publicação como os outros.
              publicar: true,
              conteudo: {
                versao: 1,
                titulo: TITULO_DAS_VARIACOES[variacao],
                ...textos[variacao],
                projetoInicial: montarProjeto(variacao, false),
                gabarito: montarProjeto(variacao, true),
                objetivos: objetivos[variacao],
                desafioExtra: {
                  titulo: 'Mais um desafio',
                  texto: 'Complete Enter para recomeçar a defesa.',
                },
                recompensa: {
                  cor: false,
                  atracao: 'guardiao-dos-ninhos',
                  moedas: moedas.principal,
                  moedasExtra: moedas.extra,
                },
                blocosManuais: { acrescentar: [], retirar: [] },
              },
            }
          }),
        ],
      }),
    ),
  )
}
if (import.meta.main) {
  for (const publico of ['kids', 'adulto'] as const)
    await Bun.write(
      new URL(
        publico === 'kids' ? './vale.manifesto.json' : './vale-adulto.manifesto.json',
        import.meta.url,
      ),
      `${JSON.stringify(criarManifesto(publico), null, 2)}\n`,
    )
}
