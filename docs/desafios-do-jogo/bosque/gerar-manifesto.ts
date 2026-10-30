import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { objetivos } from './objetivos'
import { montarProjeto, type Variacao } from './projetos'
import { desafiosIniciaisDoBosque } from './quadros-iniciais'

const textos: Record<
  Variacao,
  { titulo: string; enunciado: string; dicas: string[]; extra: string }
> = {
  corrida: {
    titulo: 'Corrida dos bichos',
    enunciado:
      'O cachorro, o gato, o coelho e o porquinho querem correr. Faça o botão Largada colocar os quatro no começo. Dentro de um laço, sorteie passos curtos ou longos para cada bicho. O primeiro que tocar a chegada deve dizer Ganhei. Nesse momento, todos param. Depois, a Largada deve permitir outra corrida.',
    dicas: [
      'Use o evento do grupo do botão Largada.',
      'Você já sorteou posições na Nave. Compare o sorteio com a metade da pista para escolher um passo curto ou longo.',
      'Guarde se a corrida está acontecendo. Só o primeiro contato com a chegada encerra a corrida.',
    ],
    extra:
      'Antes da Largada, clique no bicho com que quer jogar. Ele só deve avançar quando você apertar a barra de espaço. Os outros continuam correndo sozinhos.',
  },
  pedras: {
    titulo: 'Corrida dos bichos: pedras',
    enunciado:
      'A corrida já funciona, mas há pedras na pista. Faça cada bicho subir antes da pedra e descer depois dela, voltando à sua faixa. A corrida continua tendo um único vencedor. Use a Largada para testar quantas vezes quiser.',
    dicas: [
      'Observe a posição do bicho antes de começar o pulo.',
      'Uma velocidade para cima faz subir. Uma velocidade para baixo faz descer.',
      'Conte os passos do pulo para subir e descer a mesma distância.',
    ],
    extra:
      'Faça a tecla Enter dar outra largada: os quatro voltam ao começo e começam a correr de novo.',
  },
  noite: {
    titulo: 'Corrida dos bichos: noite',
    enunciado:
      'Anoiteceu no Bosque. A corrida está pronta, mas a pista está escura. Programe o botão do Zappy para diminuir a opacidade da camada noite. A pista deve ficar visível sem mudar a posição dos bichos.',
    dicas: [
      'A camada noite está desenhada por cima da pista.',
      'Uma opacidade menor deixa aparecer o que está atrás.',
      'Use o evento do grupo do botão do Zappy.',
    ],
    extra: 'Faça o mesmo botão alternar: um clique acende, outro apaga, e outro acende de novo.',
  },
  placar: {
    titulo: 'Corrida dos bichos: placar',
    enunciado:
      'A corrida está pronta e o placar começa em zero. Some uma vitória ao bicho que chegar primeiro. Os outros não ganham ponto. O número não deve continuar subindo depois da chegada. Na próxima Largada, guarde as vitórias anteriores.',
    dicas: [
      'Cada bicho tem sua própria variável de vitórias.',
      'Some o ponto no mesmo momento em que o vencedor diz Ganhei.',
      'Zerar a posição para outra corrida é diferente de zerar o placar.',
    ],
    extra: 'Programe o botão Zerar placar para deixar as quatro contagens em zero.',
  },
}

export function criarManifesto(publico: PublicoDoDesafio = 'kids') {
  const corrida = (['corrida', 'pedras', 'noite', 'placar'] as const).map((variacao, index) => ({
    slug: `bosque-corrida-dos-bichos${variacao === 'corrida' ? '' : `-${variacao}`}${publico === 'adulto' ? '-adulto' : ''}`,
    publico,
    ilha: 'bosque',
    tipo: variacao === 'corrida' ? 'quadro-das-cores' : 'desafio-do-dia',
    quadro: variacao === 'corrida' ? 6 : null,
    ordem: 60 + index,
    publicar: false,
    conteudo: {
      versao: 1,
      titulo: textos[variacao].titulo,
      enunciado: textos[variacao].enunciado,
      dicas: textos[variacao].dicas,
      projetoInicial: montarProjeto(variacao, false),
      gabarito: montarProjeto(variacao, true),
      objetivos: objetivos[variacao],
      desafioExtra: { titulo: 'Mais um desafio', texto: textos[variacao].extra },
      recompensa: {
        cor: variacao === 'corrida',
        atracao: 'corrida-dos-bichos',
        moedas:
          MOEDAS_PADRAO_POR_TIPO[variacao === 'corrida' ? 'quadro-das-cores' : 'desafio-do-dia']
            .principal,
        moedasExtra:
          MOEDAS_PADRAO_POR_TIPO[variacao === 'corrida' ? 'quadro-das-cores' : 'desafio-do-dia']
            .extra,
      },
      blocosManuais: { acrescentar: [], retirar: [] },
    },
  }))
  return ManifestoDeDesafiosSchema.parse({
    formato: 'arquipelago-desafios',
    versao: 1,
    escopo: 'ilha',
    desafios: [...desafiosIniciaisDoBosque(publico), ...corrida],
  })
}
if (import.meta.main) {
  for (const publico of ['kids', 'adulto'] as const)
    await Bun.write(
      new URL(`./bosque${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`, import.meta.url),
      `${JSON.stringify(criarManifesto(publico), null, 2)}\n`,
    )
}
