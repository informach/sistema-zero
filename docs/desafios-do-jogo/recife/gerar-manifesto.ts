import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { objetivos } from './objetivos'
import { montarProjeto, VARIACOES, type Variacao } from './projetos'
import { desafiosIniciaisDoRecife } from './quadros-iniciais'

const textos: Record<Variacao, { titulo: string; enunciado: string; dicas: string[] }> = {
  mira: {
    titulo: 'Mira de bolhas',
    enunciado:
      'O Recife tem alvos esperando dentro da água. Complete a mira horizontal com as setas. Faça Espaço (A no toque) lançar uma bolha da posição da mira para cima, uma de cada vez. Ao tocar um alvo ainda livre, pare a bolha, marque o alvo como preso e some um ponto. Errar ou acertar o mesmo alvo de novo não dá pontos. Depois de uma bolha sair pelo alto, permita outra tentativa. Recomeçar com Enter fica para o extra.',
    dicas: [
      'Cenário, imagens e placar estão prontos. Complete os eventos de teclado e o laço do jogo.',
      'Use mover com setas na horizontal para a mira. Reposicione a bolha perto da mira antes de dar velocidade negativa em y.',
      'Guarde emVoo e preso. O contato só conta quando a bolha está em voo e o alvo ainda não está preso.',
    ],
  },
  rapida: {
    titulo: 'Mira de bolhas: bolha rápida',
    enunciado:
      'O jogo já funciona. Mude apenas a velocidade da bolha: ela sobe com velocidade y de -8, em vez de -5. A mira e as regras de captura continuam iguais. Solte uma bolha e observe como chega mais cedo ao alvo.',
    dicas: [
      'Procure a velocidade da bolha no evento da tecla Espaço.',
      'O valor negativo em y faz a bolha subir. Um módulo maior faz subir mais rápido.',
      'Mantenha a velocidade horizontal da bolha em zero.',
    ],
  },
  pontos: {
    titulo: 'Mira de bolhas: dois pontos',
    enunciado:
      'O jogo já funciona. Mude apenas a pontuação: cada alvo preso passa a valer dois pontos. Continue contando só uma vez por alvo. Uma bolha que erra não conta pontos, e Enter limpa o placar.',
    dicas: [
      'A soma está dentro do contato da bolha com o alvo.',
      'Troque o valor somado, mantendo a condição que impede contar o mesmo alvo outra vez.',
      'Deixe a bolha junto do alvo e confira que os pontos não continuam aumentando.',
    ],
  },
  'alvo-novo': {
    titulo: 'Mira de bolhas: outro alvo',
    enunciado:
      'O jogo já funciona e um alvo novo apareceu à esquerda. Ele já está desenhado, mas ainda não pode ser preso. Complete apenas o contato da bolha com alvoNovo: pare a bolha, marque novoPreso e some um ponto uma única vez. O outro alvo continua com a regra que já tinha.',
    dicas: [
      'Observe o evento de contato com o alvo antigo.',
      'Use novoPreso para guardar a captura do alvo novo, sem alterar a marca preso do alvo antigo.',
      'Teste uma bolha em cada alvo e tente acertar novamente o mesmo alvo.',
    ],
  },
}
export function criarManifesto(publico: PublicoDoDesafio = 'kids') {
  return ManifestoDeDesafiosSchema.parse({
    formato: 'arquipelago-desafios',
    versao: 1,
    escopo: 'ilha',
    desafios: [
      ...desafiosIniciaisDoRecife(publico),
      ...VARIACOES.map((variacao, index) => {
        const tipo = 'desafio-do-dia' as const
        const moedas = MOEDAS_PADRAO_POR_TIPO[tipo]
        return {
          slug: `recife-mira-de-bolhas${variacao === 'mira' ? '' : `-${variacao}`}${publico === 'adulto' ? '-adulto' : ''}`,
          publico,
          ilha: 'recife',
          tipo,
          quadro: null,
          ordem: 60 + index,
          // §6.28 A2: o sexto quadro é o desafio na linguagem do posto; o minijogo em blocos
          // continua como desafio do dia (nunca pinta). A1: publica, todas as fontes na trilha.
          publicar: true,
          conteudo: {
            versao: 1,
            ...textos[variacao],
            projetoInicial: montarProjeto(variacao, false),
            gabarito: montarProjeto(variacao, true),
            objetivos: objetivos[variacao],
            desafioExtra: {
              titulo: 'Mais um desafio',
              texto:
                'Faça Enter (+ no toque) recomeçar a rodada: devolva a mira ao início, solte os alvos, esconda a bolha e zere os pontos.',
            },
            recompensa: {
              cor: false,
              atracao: 'mira-de-bolhas',
              moedas: moedas.principal,
              moedasExtra: moedas.extra,
            },
            blocosManuais: { acrescentar: [], retirar: [] },
          },
        }
      }),
    ],
  })
}
if (import.meta.main)
  for (const publico of ['kids', 'adulto'] as const)
    await Bun.write(
      new URL(`./recife${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`, import.meta.url),
      `${JSON.stringify(criarManifesto(publico), null, 2)}\n`,
    )
