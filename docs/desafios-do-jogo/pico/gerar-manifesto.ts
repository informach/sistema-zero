import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { objetivos } from './objetivos'
import { montarProjeto, VARIACOES, type Variacao } from './projetos'
import { desafiosIniciaisDoPico } from './quadros-iniciais'

const textos: Record<Variacao, { titulo: string; enunciado: string; dicas: string[] }> = {
  plataforma: {
    titulo: 'Fase de plataforma',
    enunciado:
      'O Pico Gelado tem uma fase de neve esperando o pinguim. Complete as regras do jogo: a gravidade puxa o pinguim para baixo, e ele fica de pé quando encosta num gelo vindo de cima. As setas levam o pinguim para os lados e o botão Pular faz ele subir, só quando está no gelo. Cair na água do buraco devolve o pinguim ao começo. Ao encostar na bandeira, marque que a fase terminou uma vez só. Recomeçar já devolve tudo ao começo.',
    dicas: [
      'Cenário, imagens, botões e Recomeçar estão prontos. Complete os eventos e o laço do jogo.',
      'No laço, aplique a gravidade, mova com as setas, aplique a velocidade e mantenha o pinguim na tela. Depois, para cada gelo que ele encostar, confira se ele vem de cima e coloque-o de pé no topo do gelo.',
      'Guarde noChao: cada volta do laço começa com falso e muda para verdadeiro ao pousar. O botão Pular só funciona com noChao verdadeiro.',
    ],
  },
  'pulo-alto': {
    titulo: 'Fase de plataforma: pulo alto',
    enunciado:
      'O jogo já funciona e apareceu um gelo alto com a bandeira em cima. O pulo atual é fraco demais para chegar lá. Mude apenas a força do pulo no botão Pular: a velocidade y passa de -9 para -13. As outras regras continuam iguais.',
    dicas: [
      'Procure a velocidade do pinguim no evento do botão Pular.',
      'O valor negativo em y faz o pinguim subir. Um número maior faz subir mais alto.',
      'Teste andando até embaixo do gelo alto e pulando de lá.',
    ],
  },
  floco: {
    titulo: 'Fase de plataforma: floco de neve',
    enunciado:
      'O jogo já funciona e um floco de neve apareceu acima do começo. Ele já está desenhado, mas ainda não pode ser pego. Complete apenas o contato do pinguim com o floco: marque pegouFloco, esconda o floco e some um em flocos, uma vez só. As outras regras continuam iguais.',
    dicas: [
      'Observe o evento de contato do pinguim com a bandeira.',
      'Use pegouFloco para não contar o mesmo floco duas vezes.',
      'Pule no começo para encostar no floco e pule de novo para conferir que o placar não muda.',
    ],
  },
  quedas: {
    titulo: 'Fase de plataforma: quedas',
    enunciado:
      'O jogo já funciona e o placar agora mostra as quedas. Cair na água já devolve o pinguim ao começo, mas o placar não muda. Complete apenas essa regra: cada queda na água soma uma em quedas. Recomeçar zera o placar.',
    dicas: [
      'A volta ao começo está no contato do pinguim com o mar.',
      'Some 1 em quedas dentro desse mesmo contato.',
      'Caia no buraco duas vezes e confira o placar.',
    ],
  },
}
export function criarManifesto(publico: PublicoDoDesafio = 'kids') {
  return ManifestoDeDesafiosSchema.parse({
    formato: 'arquipelago-desafios',
    versao: 1,
    escopo: 'ilha',
    desafios: [
      ...desafiosIniciaisDoPico(publico),
      ...VARIACOES.map((variacao, index) => {
        const principal = variacao === 'plataforma'
        const tipo = principal ? 'quadro-das-cores' : 'desafio-do-dia'
        const moedas = MOEDAS_PADRAO_POR_TIPO[tipo]
        return {
          slug: `pico-fase-de-plataforma${principal ? '' : `-${variacao}`}${publico === 'adulto' ? '-adulto' : ''}`,
          publico,
          ilha: 'pico',
          tipo,
          quadro: principal ? 6 : null,
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
                'Faça a seta para cima também pular, como o botão Pular: só quando o pinguim está no gelo.',
            },
            recompensa: {
              cor: principal,
              atracao: 'fase-de-plataforma',
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
        publico === 'kids' ? './pico.manifesto.json' : './pico-adulto.manifesto.json',
        import.meta.url,
      ),
      `${JSON.stringify(criarManifesto(publico), null, 2)}\n`,
    )
}
