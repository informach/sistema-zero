import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
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
      enunciado: `${PEDIDO_DA_IRIS} Neste, em Python com Pygame Zero, o guia está à esquerda e uma estrela está no caminho dele. Invente a aventura: o guia já anda com as setas; passar pela estrela soma um ponto uma vez só, porque o jogo lembra que ela foi pega, e a tecla R recomeça do zero. O resto é escolha sua.`,
      dicas: [
        'O update já faz o guia andar. Confira ali se ele encostou na estrela.',
        'Uma variável verdadeira ou falsa pode lembrar se a estrela já foi pega.',
        'Em on_key_down, confira key == keys.R e volte tudo ao começo.',
      ],
      extra: 'Faça a estrela sair da tela quando for pega.',
    },
    adulto: {
      titulo: 'Projeto autoral em Python',
      enunciado:
        'Projeto livre em Python com Pygame Zero. A cena traz guia, estrela e pontos. Critérios: a colisão com a estrela pontua uma única vez (mantenha uma flag); R reinicia a partida, inclusive o guia e a flag. O movimento já vem pronto. O restante do jogo é seu.',
      dicas: [
        'keyboard.right indica a seta pressionada no quadro.',
        'Rect.colliderect detecta a colisão.',
        'on_key_down recebe key; compare com keys.R.',
      ],
      extra: 'Ao coletar, mova a estrela para fora da tela.',
    },
  },
  ponte: {
    kids: {
      titulo: 'Meu jogo do Arquipélago na Ponte',
      enunciado: `${PEDIDO_DA_IRIS} Neste, você escreve em JavaScript na Ponte, e os blocos acompanham. O guia está no palco, com desenhos para usar: estrela, farol, concha e Lumi. Os critérios estão na lista: o guia anda, algo acontece num encontro, o jogo lembra o que aconteceu, uma decisão usa essa lembrança e uma tecla recomeça.`,
      dicas: [...MEU_JOGO.dicas],
      extra: MEU_JOGO.extra,
    },
    adulto: {
      titulo: 'Projeto autoral em JavaScript',
      enunciado:
        'Projeto livre em JavaScript na Ponte, com o Jogo 2D. O guia e os desenhos estão prontos. Critérios: movimento, um encontro com efeito, um estado guardado no encontro, uma decisão que usa esse estado e uma tecla de reinício. Só conta o código que pode rodar.',
      dicas: [
        'Os eventos de contato recebem os dois sprites; guarde o estado numa variável.',
        'A conferência ignora ramos que nunca rodam, como um if (false).',
      ],
      extra: 'Remova um sprite da tela quando ele for coletado.',
    },
  },
  pro: {
    kids: {
      titulo: 'Meu jogo do Arquipélago no Pro',
      enunciado: `${PEDIDO_DA_IRIS} Neste, no Pro, o jogo é um projeto de verdade, em arquivos. O src/main.ts já desenha a tela e guarda o jogo: o guia, a estrela e os pontos. Escreva as regras em passo e em tecla: o guia já anda com as setas; passar pela estrela soma um ponto uma vez só e a tecla R recomeça do zero.`,
      dicas: [
        'passo roda a cada quadro e já faz o guia andar; confira ali o encontro com a estrela.',
        'Uma variável fora das funções pode lembrar se a estrela já foi pega.',
        'tecla recebe o nome em minúsculas: confira se é r.',
      ],
      extra: 'Faça a estrela sair da tela quando for pega.',
    },
    adulto: {
      titulo: 'Projeto autoral no Pro',
      enunciado:
        'Projeto livre em TypeScript com Vite. src/main.ts exporta o estado jogo (guia, estrela, pontos) e chama passo(teclas) a cada quadro e tecla(nome) a cada tecla. Critérios: pontuação única na colisão com a estrela e reinício completo com R. O movimento já vem pronto.',
      dicas: [
        'Mantenha o estado em jogo para os critérios lerem.',
        'Use uma flag de coleta fora das funções.',
      ],
      extra: 'Ao coletar, mova a estrela para fora da tela.',
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
  return ManifestoDeDesafiosSchema.parse({
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
          desafioExtra: { titulo: 'Mais um desafio', texto: t.extra },
          recompensa: {
            cor: false,
            atracao: 'meu-jogo-do-arquipelago',
            moedas: moedas.principal,
            moedasExtra: moedas.extra,
          },
          blocosManuais: { acrescentar: [], retirar: [] },
        },
      },
    ],
  })
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
