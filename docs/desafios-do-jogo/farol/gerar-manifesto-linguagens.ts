import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { comApresentacao } from '../apresentacao'
import { gravarManifesto } from '../gravar-manifesto'
import {
  montarProjetoPonteDoFarol,
  montarProjetoProDoFarol,
  montarProjetoPythonDoFarol,
  objetivosDoFarolPonte,
  objetivosDoFarolPro,
  objetivosDoFarolPython,
} from './linguagens'
import { MEU_JOGO } from './projetos'

/**
 * O projeto autoral do Farol nas linguagens de texto (A29, revisão de 31/10/2026): Python (quadro
 * 2), a Ponte em JavaScript (quadro 3) e o Pro (quadro 4), além dos blocos (quadro 1, no
 * `farol.manifesto.json`). Cada um abre com o curso-base de onde a linguagem começa
 * (`postoDoCursoBase`), e a pessoa escolhe entre os que já abriram. Nenhum pinta.
 */
export type LinguagemDoFarol = 'python' | 'ponte' | 'pro'
const QUADRO: Record<LinguagemDoFarol, number> = { python: 2, ponte: 3, pro: 4 }

const PEDIDO_DA_IRIS =
  'A Íris quer ver um jogo inventado por você, do jeito que você mais gosta de programar.'
const textos: Record<
  LinguagemDoFarol,
  Record<PublicoDoDesafio, { titulo: string; enunciado: string; dicas: string[]; extra: string }>
> = {
  python: {
    kids: {
      titulo: 'Meu jogo do Arquipélago em Python',
      enunciado: `${PEDIDO_DA_IRIS} Neste, em Python com Pygame Zero, o jogo começa só com a janela e o guia andando. Primeiro preencha a ficha no começo do código: o objetivo do jogo e as três coisas que ele vai ter. Depois faça o jogo da sua ideia, combinando o que você aprendeu. A tecla R leva o guia de volta ao começo. Quando o jogo passar, a equipe vai jogar e mandar um retorno.`,
      dicas: [
        'Comece pela ficha. Três coisas pequenas que cabem no jogo valem mais que dez grandes.',
        'Lembre dos jogos dos postos: um sorteio, um relógio, uma lista de coisas, uma fase.',
        'Jogue um pouco a cada mudança. Se aparecer um erro, ele mostra a linha.',
        'Em on_key_down, confira key == keys.R e volte o guia e o resto da partida ao começo.',
      ],
      extra:
        'Versão 2: depois de aprovado, peça para outra pessoa jogar, mude o jogo pelo que o teste mostrou e envie de novo.',
    },
    adulto: {
      titulo: 'Projeto autoral em Python',
      enunciado:
        'Projeto livre em Python com Pygame Zero. A cena traz só a janela e o guia andando. Preencha a ficha (objetivo e três funcionalidades) e implemente o jogo combinando mecânicas já estudadas. Critérios automáticos: ficha preenchida, jogo sem erro com setas, espaço e clique, e R devolvendo o guia ao início. Aprovado, o projeto passa por uma revisão humana com retorno.',
      dicas: [
        'Mantenha o escopo pequeno: três funcionalidades que cabem no tempo.',
        'clock.schedule_interval, random e listas cobrem relógio, sorteio e ondas.',
        'on_key_down recebe key; compare com keys.R.',
      ],
      extra:
        'Versão 2: após a aprovação, faça um teste com outra pessoa, ajuste o jogo pelo que o teste mostrou e envie de novo.',
    },
  },
  ponte: {
    kids: {
      titulo: 'Meu jogo do Arquipélago na Ponte',
      enunciado: `${PEDIDO_DA_IRIS} Neste, você escreve em JavaScript na Ponte, e os blocos acompanham. O guia está no palco, com desenhos para usar: estrela, farol, concha e Lumi. Antes de montar, escolha o objetivo do jogo e três coisas que ele vai ter. Combine os três postos de blocos: um encontro que o jogo lembra e usa numa decisão, coisas que um relógio cria num grupo e gravidade com pulo. Os critérios estão na lista.`,
      dicas: [...MEU_JOGO.dicas],
      extra: MEU_JOGO.extra,
    },
    adulto: {
      titulo: 'Projeto autoral em JavaScript',
      enunciado:
        'Projeto livre em JavaScript na Ponte, com o Jogo 2D. O guia e os desenhos estão prontos. Critérios: movimento, um encontro com efeito, um estado guardado no encontro, uma decisão que usa esse estado, uma tecla de reinício e a combinação das mecânicas dos três postos de blocos. Só conta o código que pode rodar. Aprovado, o projeto passa por uma revisão humana com retorno.',
      dicas: [
        'Os eventos de contato recebem os dois sprites; guarde o estado numa variável.',
        'Combine os três postos de blocos: decisão com estado, grupo criado por relógio e gravidade com pulo.',
        'A conferência ignora ramos que nunca rodam, como um if (false).',
      ],
      extra:
        'Versão 2: após a aprovação, faça um teste com outra pessoa, ajuste o jogo pelo que o teste mostrou e envie de novo.',
    },
  },
  pro: {
    kids: {
      titulo: 'Meu jogo do Arquipélago no Pro',
      enunciado: `${PEDIDO_DA_IRIS} Neste, no Pro, o jogo é um projeto de verdade, em arquivos. O src/main.ts começa só com a janela e o guia andando. Primeiro preencha a ficha: o objetivo do jogo e as três coisas que ele vai ter. Depois faça o jogo da sua ideia em passo, tecla, clique e desenhar. A tecla R leva o guia de volta ao começo. Quando o jogo passar, a equipe vai jogar e mandar um retorno.`,
      dicas: [
        'Comece pela ficha. Três coisas pequenas que cabem no jogo valem mais que dez grandes.',
        'Guarde no jogo tudo o que ele precisa lembrar: pontos, listas, a fase.',
        'Jogue um pouco a cada mudança. Se aparecer um erro, o console mostra a linha.',
        'tecla recebe o nome em minúsculas: confira se é r e volte a partida ao começo.',
      ],
      extra:
        'Versão 2: depois de aprovado, peça para outra pessoa jogar, mude o jogo pelo que o teste mostrou e envie de novo.',
    },
    adulto: {
      titulo: 'Projeto autoral no Pro',
      enunciado:
        'Projeto livre em TypeScript com Vite. src/main.ts exporta a ficha e o estado jogo e chama passo(teclas), tecla(nome), clique(x, y) e desenhar(ctx). Preencha a ficha (objetivo e três funcionalidades) e implemente o jogo combinando mecânicas já estudadas. Critérios automáticos: ficha preenchida, jogo sem erro com setas, espaço e clique, e R devolvendo o guia ao início. Aprovado, o projeto passa por uma revisão humana com retorno.',
      dicas: [
        'Mantenha o escopo pequeno: três funcionalidades que cabem no tempo.',
        'Deixe o estado em jogo e a ficha exportados: os critérios leem os dois.',
      ],
      extra:
        'Versão 2: após a aprovação, faça um teste com outra pessoa, ajuste o jogo pelo que o teste mostrou e envie de novo.',
    },
  },
}

export function criarManifestoDaLinguagem(
  linguagem: LinguagemDoFarol,
  publico: PublicoDoDesafio = 'kids',
) {
  const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
  const t = textos[linguagem][publico]
  const [projetoInicial, gabarito, objetivos] =
    linguagem === 'python'
      ? [
          montarProjetoPythonDoFarol('inicial'),
          montarProjetoPythonDoFarol('gabarito'),
          objetivosDoFarolPython(publico),
        ]
      : linguagem === 'pro'
        ? [
            montarProjetoProDoFarol('inicial'),
            montarProjetoProDoFarol('gabarito'),
            objetivosDoFarolPro(publico),
          ]
        : [
            montarProjetoPonteDoFarol(false),
            montarProjetoPonteDoFarol(true),
            objetivosDoFarolPonte(),
          ]
  return comApresentacao(
    ManifestoDeDesafiosSchema.parse({
      formato: 'arquipelago-desafios',
      versao: 1,
      escopo: 'ilha',
      desafios: [
        {
          slug: `farol-${MEU_JOGO.slug}-${linguagem}${publico === 'adulto' ? '-adulto' : ''}`,
          publico,
          ilha: 'farol',
          tipo: 'quadro-das-cores',
          quadro: QUADRO[linguagem],
          ordem: QUADRO[linguagem] * 10,
          publicar: true,
          conteudo: {
            versao: 1,
            titulo: t.titulo,
            enunciado: t.enunciado,
            dicas: t.dicas,
            projetoInicial,
            gabarito,
            objetivos,
            desafioExtra: { titulo: 'Versão 2', texto: t.extra },
            // Lenda (lacunas, 01/11/2026): o extra é a versão 2, e o aprovado vai à revisão humana.
            recompensa: {
              cor: false,
              atracao: 'meu-jogo-do-arquipelago',
              moedas: moedas.principal,
              moedasExtra: moedas.extra,
              extraNaVersao2: true,
              revisaoHumana: true,
            },
            blocosManuais: { acrescentar: [], retirar: [] },
          },
        },
      ],
    }),
  )
}

if (import.meta.main)
  for (const linguagem of ['python', 'ponte', 'pro'] as const)
    for (const publico of ['kids', 'adulto'] as const)
      await gravarManifesto(
        new URL(
          `./farol-${linguagem}${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
          import.meta.url,
        ),
        criarManifestoDaLinguagem(linguagem, publico),
      )
