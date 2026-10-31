import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { gravarManifesto } from '../gravar-manifesto'
import { objetivosDoRecifePython } from './python-objetivos'
import { montarProjetoPython } from './python-projetos'

/**
 * C02 (30/10/2026): a Mira de bolhas em Python (Pygame Zero), Kids e adulto. Desde a revisão de
 * 31/10/2026 (A45), com o tema da ilha: as mudas de coral da lagoa, pedido da Maré. O sexto quadro da ilha
 * (§6.28, A2): devolve a cor e abre só com o curso-base do posto concluído (A3). Publica ao importar;
 * importar depois do manifesto em blocos da ilha, que tira o minijogo do quadro 6.
 */
const textos: Record<PublicoDoDesafio, { titulo: string; enunciado: string; dicas: string[] }> = {
  kids: {
    titulo: 'Mira de bolhas: mudas da lagoa',
    enunciado:
      'A Maré está replantando os corais da lagoa e solta bolhas com mudas. Ela quer que cada clique na bolha plante a muda e que a bolha seguinte suba de um dos três corais, até a maré virar. Este desafio é em Python, com Pygame Zero. O mar, os corais, a bolha e o placar já estão prontos no main.py. Complete três funções. on_mouse_down(pos): um clique dentro da bolha planta a muda, soma 1 em plantadas e chama sortear_coral; um clique na água não soma nada. sortear_coral(): sorteie um número de 1 a 3 e leve a bolha para o coral desse número. update(dt): conte o tempo da rodada e, quando ele acabar, termine a rodada para que os cliques não contem mais. Fazer a tecla R recomeçar fica para o extra.',
    dicas: [
      'Os corais ficam nestas posições de bolha.topleft: coral 1 em (80, 120), coral 2 em (280, 80) e coral 3 em (480, 120).',
      'Para mudar uma variável do jogo dentro de uma função, escreva global e o nome dela no começo da função.',
      'A rodada vale enquanto jogando é True. Confira jogando antes de contar um clique.',
    ],
  },
  adulto: {
    titulo: 'Mira de bolhas em Python',
    enunciado:
      'Projeto Python com Pygame Zero. O cenário, o desenho e o estado inicial estão prontos em main.py. Implemente os eventos: on_mouse_down(pos) conta um acerto só quando o clique cai dentro de bolha (um Rect) e então chama sortear_coral(); sortear_coral() usa random.randint(1, 3) para posicionar a bolha num dos três corais, (80, 120), (280, 80) ou (480, 120); update(dt) desconta o tempo e encerra a rodada (jogando = False) ao chegar a zero, sem aceitar novos acertos. Como extra, R reinicia a rodada e devolve a bolha a (280, 360).',
    dicas: [
      'As variáveis do módulo alteradas dentro das funções precisam de global.',
      'Rect.collidepoint(pos) devolve True quando o ponto está dentro do retângulo.',
      'Proteja o clique com a condição jogando para que ele não conte depois do fim.',
    ],
  },
}

export function criarManifestoPython(publico: PublicoDoDesafio = 'kids') {
  const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
  return ManifestoDeDesafiosSchema.parse({
    formato: 'arquipelago-desafios',
    versao: 1,
    escopo: 'ilha',
    desafios: [
      {
        slug: `recife-mira-de-bolhas-python${publico === 'adulto' ? '-adulto' : ''}`,
        publico,
        ilha: 'recife',
        // §6.28 A2: o sexto quadro, na linguagem do posto, devolve a cor; abre só com o
        // curso-base do posto concluído (A3). Publica (A1): não pede bloco nenhum.
        tipo: 'quadro-das-cores',
        quadro: 6,
        ordem: 60,
        publicar: true,
        conteudo: {
          versao: 1,
          ...textos[publico],
          projetoInicial: montarProjetoPython('inicial'),
          gabarito: montarProjetoPython('gabarito'),
          objetivos: objetivosDoRecifePython(publico),
          desafioExtra: {
            titulo: publico === 'kids' ? 'Mais um desafio' : 'Extra',
            texto:
              publico === 'kids'
                ? 'Faça a tecla R recomeçar a rodada: plantadas volta a zero, o tempo volta ao começo e a bolha volta para a areia.'
                : 'R reinicia a rodada: contagem zerada, tempo cheio, jogando ativo e a bolha em (280, 360).',
          },
          recompensa: { cor: true, moedas: moedas.principal, moedasExtra: moedas.extra },
          blocosManuais: { acrescentar: [], retirar: [] },
        },
      },
    ],
  })
}

if (import.meta.main)
  for (const publico of ['kids', 'adulto'] as const)
    await gravarManifesto(
      new URL(
        `./recife-python${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
        import.meta.url,
      ),
      criarManifestoPython(publico),
    )
