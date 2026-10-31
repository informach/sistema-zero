import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { objetivos } from './objetivos'
import { EXTRA, montarProjeto, VARIACOES, type Variacao } from './projetos'

/** O pedido de cada desafio é do Bento: o que ele precisa, não o bloco a usar (A44). */
const textos: Record<Variacao, { titulo: string; enunciado: string; dicas: string[] }> = {
  pulo: {
    titulo: 'O entregador pula',
    enunciado:
      'O Bento separou os doces da padaria, mas o entregador está flutuando no meio da rua. Ele precisa cair até o chão e pular quando alguém aperta Espaço, a seta para cima ou toca na tela, sempre a partir do chão.',
    dicas: [
      'Pense no que puxa o entregador para baixo a cada quadro da corrida.',
      'Primeiro a gravidade age; depois o controle decide se é hora de pular.',
      'O controle do dinossauro só deixa pular quando os pés estão no chão.',
    ],
  },
  pedras: {
    titulo: 'Pedras na rua',
    enunciado:
      'A rua da Vila tem pedras soltas, mas nenhuma aparece na corrida. O Bento quer que, de tempos em tempos, uma pedra entre pela direita da tela e venha na direção do entregador.',
    dicas: [
      'O relógio da corrida já marca o tempo certo para uma pedra nova.',
      'A pedra nasce fora da tela, à direita, e anda para a esquerda.',
      'A velocidade das pedras já está guardada numa variável do jogo.',
    ],
  },
  partida: {
    titulo: 'Começar e recomeçar',
    enunciado:
      'A tela de abertura da corrida está pronta, mas nada acontece quando alguém aperta uma tecla. O Bento quer que uma tecla ou um toque comece a corrida e que, depois de um tombo, a mesma ação traga a corrida de volta ao começo.',
    dicas: [
      'O jogo sabe em que tela está: abertura, corrida ou fim.',
      'Na abertura, a tecla muda a tela para a corrida.',
      'No fim, a tecla recomeça o jogo inteiro, com os metros em zero.',
    ],
  },
  batida: {
    titulo: 'A batida',
    enunciado:
      'O entregador atravessa as pedras como se elas não existissem. O Bento quer que encostar numa pedra encerre a corrida, sem injustiça: só conta a batida quando a pedra encosta de verdade no corpo do entregador, não no espaço em volta do desenho.',
    dicas: [
      'Há um encontro entre o entregador e o grupo das pedras esperando a sua regra.',
      'Quando a corrida acaba, o jogo vai para a tela de fim.',
      'A área da batida pode ser um pouco menor que o desenho.',
    ],
  },
  sorteio: {
    titulo: 'Cada pedra num lugar',
    enunciado:
      'As pedras chegam sempre do mesmo ponto e com o mesmo tamanho, então a corrida fica fácil de decorar. O Bento quer que cada pedra apareça num lugar sorteado, à direita da tela, e com um tamanho diferente, sem ficar alta demais para o pulo.',
    dicas: [
      'Um sorteio entre dois números dá um valor diferente a cada pedra.',
      'O lugar sorteado precisa começar fora da tela, à direita.',
      'Pedras maiores que 50 ficam altas demais para o pulo do entregador.',
    ],
  },
  corrida: {
    titulo: 'A corrida do entregador',
    enunciado:
      'Os clientes estão com pressa. O Bento quer que cada pedra nova venha um pouco mais rápida que a anterior, mas só até um limite, para a corrida continuar possível de jogar.',
    dicas: [
      'A velocidade das pedras é um número negativo: quanto menor, mais rápido.',
      'Antes de acelerar, confira se a velocidade ainda não chegou ao limite.',
      'A mudança acontece no mesmo relógio que cria cada pedra.',
    ],
  },
  'pulo-alto': {
    titulo: 'Pedras maiores',
    enunciado:
      'Hoje a rua tem pedras maiores, e o pulo do entregador ficou baixo demais para passar por cima delas. O Bento quer um pulo mais forte, sem exagero, para o entregador voltar a passar.',
    dicas: [
      'A força do pulo está no controle do dinossauro.',
      'Teste a corrida depois de cada mudança na força.',
    ],
  },
  pombos: {
    titulo: 'Pombos na praça',
    enunciado:
      'Hoje há pombos voando baixo pela praça, além das pedras e dos vasos da floricultura. O Bento quer que a corrida sorteie o que aparece na rua. Para passar pelos pombos, o entregador abaixa com a seta para baixo.',
    dicas: [
      'O tipo do obstáculo tem uma opção que sorteia a cada vez.',
      'Os pombos voam na altura da cabeça: abaixar faz o entregador passar.',
    ],
  },
  descricao: {
    titulo: 'Quem não vê a tela',
    enunciado:
      'Uma cliente do Bento usa um leitor de tela. Antes de começar, ela quer ouvir o objetivo da corrida e os três jeitos de pular: com Espaço, com a seta para cima e com um toque.',
    dicas: [
      'A descrição do palco é o texto que o leitor de tela fala.',
      'Fale das pedras e dos três controles do pulo.',
    ],
  },
}

const EXTRAS = {
  somDoPulo: 'Faça um som tocar a cada pulo do entregador.',
  efeitos:
    'Quando o entregador bater, faça a pedra explodir e a tela tremer antes de mostrar o fim.',
  telaComMetros: 'Mostre na tela de fim quantos metros o entregador correu.',
  boloDourado:
    'Um bolo dourado passa pela rua. Faça o entregador pegar o bolo: ele vale o dobro, 2 metros de uma vez, e volta para o começo da rua.',
} as const

export function criarManifesto(publico: PublicoDoDesafio = 'kids') {
  return ManifestoDeDesafiosSchema.parse({
    formato: 'arquipelago-desafios',
    versao: 1,
    escopo: 'ilha',
    desafios: VARIACOES.map((variacao, index) => {
      const quadro = index < 6 ? index + 1 : null
      const tipo = quadro ? 'quadro-das-cores' : 'desafio-do-dia'
      const moedas = MOEDAS_PADRAO_POR_TIPO[tipo]
      const slug =
        variacao === 'corrida' ? 'corrida-do-entregador' : `corrida-do-entregador-${variacao}`
      return {
        slug: `vila-doce-${slug}${publico === 'adulto' ? '-adulto' : ''}`,
        publico,
        ilha: 'vila-doce',
        tipo,
        quadro,
        ordem: (index + 1) * 10,
        // A15 feito: a corrida tem pulo, gravidade, pedras sorteadas e dificuldade com teto, e todo
        // bloco tem fonte nos cursos até o Inventor (§6.28, item 1). A barreira C01a continua no
        // serviço, na importação.
        publicar: true,
        conteudo: {
          versao: 1,
          ...textos[variacao],
          projetoInicial: montarProjeto(variacao, false),
          gabarito: montarProjeto(variacao, true),
          objetivos: objetivos[variacao],
          desafioExtra: { titulo: 'Mais um desafio', texto: EXTRAS[EXTRA[variacao]] },
          recompensa: {
            cor: quadro !== null,
            atracao: 'corrida-do-entregador',
            moedas: moedas.principal,
            moedasExtra: moedas.extra,
            // O prêmio-objeto do extra, como na proposta: "★ extra: receita de brigadeiro" (A25).
            ...(variacao === 'corrida' ? { receitaDoExtra: 'brigadeiro' } : {}),
          },
          blocosManuais: { acrescentar: [], retirar: [] },
        },
      }
    }),
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
