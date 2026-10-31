import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { gravarManifesto } from '../gravar-manifesto'
import { objetivosDoRecifePython } from './python-objetivos'
import { montarProjetoPython } from './python-projetos'

/**
 * C02 (30/10/2026): a Mira de bolhas em Python (Pygame Zero), no tema do Resgate dos Vagalumes,
 * Kids e adulto. Desafio do dia (os seis quadros do Recife já estão ocupados), `publicar: false`.
 */
const textos: Record<PublicoDoDesafio, { titulo: string; enunciado: string; dicas: string[] }> = {
  kids: {
    titulo: 'Mira de bolhas: resgate dos vagalumes',
    enunciado:
      'Os vagalumes do Recife ficaram presos em bolhas. Este desafio é em Python, com Pygame Zero. O mar, as tocas de coral, a bolha e o placar já estão prontos no main.py. Complete três funções. on_mouse_down(pos): um clique dentro da bolha solta o vagalume, soma 1 em resgatados e chama sortear_toca; um clique na água não soma nada. sortear_toca(): sorteie um número de 1 a 3 e leve a bolha para a toca desse número. update(dt): conte o tempo da rodada e, quando ele acabar, termine a rodada para que os cliques não contem mais. Fazer a tecla R recomeçar fica para o extra.',
    dicas: [
      'As tocas ficam nestas posições de bolha.topleft: toca 1 em (80, 120), toca 2 em (280, 80) e toca 3 em (480, 120).',
      'Para mudar uma variável do jogo dentro de uma função, escreva global e o nome dela no começo da função.',
      'A rodada vale enquanto jogando é True. Confira jogando antes de contar um clique.',
    ],
  },
  adulto: {
    titulo: 'Mira de bolhas em Python',
    enunciado:
      'Projeto Python com Pygame Zero. O cenário, o desenho e o estado inicial estão prontos em main.py. Implemente os eventos: on_mouse_down(pos) conta um acerto só quando o clique cai dentro de bolha (um Rect) e então chama sortear_toca(); sortear_toca() usa random.randint(1, 3) para posicionar a bolha numa das três tocas, (80, 120), (280, 80) ou (480, 120); update(dt) desconta o tempo e encerra a rodada (jogando = False) ao chegar a zero, sem aceitar novos acertos. Como extra, R reinicia a rodada e devolve a bolha a (280, 360).',
    dicas: [
      'As variáveis do módulo alteradas dentro das funções precisam de global.',
      'Rect.collidepoint(pos) devolve True quando o ponto está dentro do retângulo.',
      'Proteja o clique com a condição jogando para que ele não conte depois do fim.',
    ],
  },
}

export function criarManifestoPython(publico: PublicoDoDesafio = 'kids') {
  const moedas = MOEDAS_PADRAO_POR_TIPO['desafio-do-dia']
  return ManifestoDeDesafiosSchema.parse({
    formato: 'arquipelago-desafios',
    versao: 1,
    escopo: 'ilha',
    desafios: [
      {
        slug: `recife-mira-de-bolhas-python${publico === 'adulto' ? '-adulto' : ''}`,
        publico,
        ilha: 'recife',
        tipo: 'desafio-do-dia',
        quadro: null,
        ordem: 70,
        publicar: false,
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
                ? 'Faça a tecla R recomeçar a rodada: resgatados volta a zero, o tempo volta ao começo e a bolha volta para a areia.'
                : 'R reinicia a rodada: contagem zerada, tempo cheio, jogando ativo e a bolha em (280, 360).',
          },
          recompensa: { cor: false, moedas: moedas.principal, moedasExtra: moedas.extra },
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
