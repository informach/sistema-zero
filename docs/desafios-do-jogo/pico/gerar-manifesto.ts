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
      'O Floco quer um jogo de neve com mais de uma fase para o pinguim treinar a subida do Pico. A gravidade e o pouso no gelo já estão prontos. Complete as regras do jogo: as setas levam o pinguim para os lados sem sair da tela, e Espaço (A no toque) faz ele subir, só quando está no gelo. Cair na água do buraco devolve o pinguim ao começo. O jogo tem duas fases, guardadas na variável fase. Ao encostar na bandeira da fase 1, passe para a fase 2: o pinguim volta ao começo e a bandeira sobe para o gelo do alto. Ao encostar na bandeira da fase 2, marque que o jogo terminou, uma vez só. Enter (+ no toque) já devolve tudo à fase 1.',
    dicas: [
      'Cenário, imagens, gravidade, pouso no gelo e Enter para recomeçar estão prontos. Complete os eventos e o laço do jogo.',
      'No laço, entre a gravidade e o aplicar velocidade, mova com as setas; depois de aplicar, mantenha o pinguim na tela. O pouso em cada gelo já vem pronto.',
      'O laço já guarda noChao: começa cada volta com falso e muda para verdadeiro ao pousar. Espaço só pula com noChao verdadeiro.',
      'Na bandeira, um Se com Senão separa a fase 1 (trocar de fase) da fase 2 (terminar o jogo).',
    ],
  },
  'pulo-alto': {
    titulo: 'Fase de plataforma: pulo alto',
    enunciado:
      'O jogo já funciona e apareceu um gelo alto com a bandeira em cima. O pulo atual é fraco demais para chegar lá. Mude apenas a força do pulo na tecla Espaço: a velocidade y passa de -9 para -13. As outras regras continuam iguais.',
    dicas: [
      'Procure a velocidade do pinguim no evento da tecla Espaço.',
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
      'O jogo já funciona e o placar agora mostra as quedas. Cair na água já devolve o pinguim ao começo, mas o placar não muda. Complete apenas essa regra: cada queda na água soma uma em quedas. Enter zera o placar.',
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
        const tipo = 'desafio-do-dia' as const
        const moedas = MOEDAS_PADRAO_POR_TIPO[tipo]
        return {
          slug: `pico-fase-de-plataforma${principal ? '' : `-${variacao}`}${publico === 'adulto' ? '-adulto' : ''}`,
          publico,
          ilha: 'pico',
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
                'Faça a seta para cima também pular, como Espaço: só quando o pinguim está no gelo.',
            },
            recompensa: {
              cor: false,
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
