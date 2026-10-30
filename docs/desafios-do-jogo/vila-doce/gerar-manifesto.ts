import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { objetivos } from './objetivos'
import { montarProjeto, VARIACOES, type Variacao } from './projetos'
import { desafiosIniciaisDaVila } from './quadros-iniciais'

const textos: Record<Variacao, { titulo: string; enunciado: string; dicas: string[] }> = {
  corrida: {
    titulo: 'A corrida do entregador',
    enunciado:
      'Os doces da padaria do Bento precisam chegar pela Vila Doce. Programe a Largada para colocar o entregador no começo e iniciar o prazo de doze segundos. Faça as setas moverem o entregador. Encostar na caixa encerra a corrida, sem contar entrega. Chegar ao doce antes do tempo conta uma entrega e encerra a corrida. Quando o tempo acaba, a corrida também para. O botão Largada permite tentar de novo.',
    dicas: [
      'O cenário, as imagens, os textos e o botão já estão prontos. Complete as regras nos eventos e nos laços.',
      'Use mover em quatro direções dentro do laço, somente enquanto a corrida estiver acontecendo.',
      'A cada segundo, diminua o tempo. Ao encostar na caixa ou concluir a entrega, pare a corrida.',
    ],
  },
  entregas: {
    titulo: 'O entregador: duas entregas',
    enunciado:
      'A corrida já funciona. Agora há uma entrega 1 antes da chegada. Conte essa primeira entrega uma vez só, mesmo ficando perto dela. A chegada deve esperar essa parada. Depois das duas entregas, encerre a corrida com duas entregas no placar. Cada Largada começa uma nova rodada, com a contagem em zero.',
    dicas: [
      'Uma variável pode guardar se a primeira entrega já foi feita.',
      'Só conte a primeira entrega enquanto ela ainda estiver por fazer.',
      'Na chegada, confira a primeira entrega antes de somar a segunda e terminar.',
    ],
  },
  tempo: {
    titulo: 'O entregador: oito segundos',
    enunciado:
      'A corrida já funciona com doze segundos. Mude a Largada para começar com oito segundos. Mantenha as outras regras: as caixas interrompem a corrida, a chegada conta a entrega e o tempo zero encerra a tentativa. Contorne a caixa para conseguir entregar antes do prazo.',
    dicas: [
      'Procure o valor que a Largada guarda na variável tempo.',
      'O laço que diminui o tempo já funciona. Você só precisa mudar o prazo inicial.',
      'Teste uma rota curta que passe longe da caixa.',
    ],
  },
  caixa: {
    titulo: 'O entregador: uma caixa nova',
    enunciado:
      'A corrida já funciona e uma caixa nova apareceu na rua de cima. Ela está desenhada, mas ainda não interrompe a corrida. Programe o contato do entregador com a caixa nova para encerrar a tentativa sem contar entrega. Deixe os outros caminhos livres para conseguir chegar aos doces.',
    dicas: [
      'Há um evento de contato entre entregador e caixaNova esperando sua regra.',
      'A caixa antiga já faz a corrida parar. Observe a condição e a mensagem desse evento.',
      'Depois de testar o contato, tente outra rota usando a Largada.',
    ],
  },
}
export function criarManifesto(publico: PublicoDoDesafio = 'kids') {
  return ManifestoDeDesafiosSchema.parse({
    formato: 'arquipelago-desafios',
    versao: 1,
    escopo: 'ilha',
    desafios: [
      ...desafiosIniciaisDaVila(publico),
      ...VARIACOES.map((variacao, index) => {
        const tipo = variacao === 'corrida' ? 'quadro-das-cores' : 'desafio-do-dia'
        const moedas = MOEDAS_PADRAO_POR_TIPO[tipo]
        return {
          slug: `vila-doce-corrida-do-entregador${variacao === 'corrida' ? '' : `-${variacao}`}${publico === 'adulto' ? '-adulto' : ''}`,
          publico,
          ilha: 'vila-doce',
          tipo,
          quadro: variacao === 'corrida' ? 6 : null,
          ordem: 60 + index,
          publicar: false,
          conteudo: {
            versao: 1,
            ...textos[variacao],
            projetoInicial: montarProjeto(variacao, false),
            gabarito: montarProjeto(variacao, true),
            objetivos: objetivos[variacao],
            desafioExtra: {
              titulo: 'Mais um desafio',
              texto:
                'Faça Enter iniciar outra corrida, como o botão Largada: volte ao começo, limpe o recado, zere as entregas e recomece o prazo.',
            },
            recompensa: {
              cor: variacao === 'corrida',
              atracao: 'corrida-do-entregador',
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
if (import.meta.main) {
  for (const publico of ['kids', 'adulto'] as const)
    await Bun.write(
      new URL(
        `./vila-doce${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
        import.meta.url,
      ),
      `${JSON.stringify(criarManifesto(publico), null, 2)}\n`,
    )
}
