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
 * 31/10/2026 (A45), com o tema da ilha: as mudas de coral da lagoa, pedido da Maré; desde as lacunas de
 * 01/11/2026, com critérios próprios (e não a lista da missão do posto). O sexto quadro da ilha
 * (§6.28, A2): devolve a cor e abre só com o curso-base do posto concluído (A3). Publica ao importar;
 * importar depois do manifesto em blocos da ilha, que tira o minijogo do quadro 6.
 */
const textos: Record<PublicoDoDesafio, { titulo: string; enunciado: string; dicas: string[] }> = {
  kids: {
    titulo: 'Mira de bolhas: mudas da lagoa',
    enunciado:
      'A Maré está replantando os corais da lagoa e solta bolhas com mudas. Ela quer que a muda de cada bolha clicada vá para o coral de onde a bolha subiu, que a bolha esquecida estoure e que a maré vire depois de três bolhas perdidas. Este desafio é em Python, com Pygame Zero. O mar, os corais, a bolha e o sorteio do coral (sortear_coral) já estão prontos no main.py. Complete duas funções. on_mouse_down(pos): um clique dentro da bolha soma 1 nas mudas do coral dela (mudas1, mudas2 ou mudas3, conforme coral) e chama sortear_coral. update(dt): enquanto a rodada vale e a bolha está num coral, tire dt de vida; quando vida acabar, some 1 em perdidas e, na terceira, termine a rodada; antes disso, sorteie outra bolha. Fazer a tecla R recomeçar fica para o extra.',
    dicas: [
      'O coral 0 é a areia: o primeiro clique só faz a bolha subir.',
      'Para mudar uma variável do jogo dentro de uma função, escreva global e o nome dela no começo da função.',
      'A rodada vale enquanto jogando é True. Confira jogando antes de contar um clique.',
    ],
  },
  adulto: {
    titulo: 'Mira de bolhas em Python',
    enunciado:
      'Projeto Python com Pygame Zero. O cenário, o desenho, o estado inicial e sortear_coral() estão prontos em main.py. Implemente on_mouse_down(pos): um clique dentro de bolha (um Rect) incrementa o contador do coral atual (mudas1, mudas2 ou mudas3, pelo estado coral) e chama sortear_coral(). Implemente update(dt): enquanto jogando e com coral > 0, desconte dt de vida; ao zerar, incremente perdidas e, na terceira, encerre a rodada (jogando = False); senão, sorteie a próxima bolha. Como extra, R reinicia a rodada.',
    dicas: [
      'As variáveis do módulo alteradas dentro das funções precisam de global.',
      'Rect.collidepoint(pos) devolve True quando o ponto está dentro do retângulo.',
      'O sorteio usa random.seed fixo: a lagoa começa sempre igual.',
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
                ? 'Faça a tecla R recomeçar a rodada: as mudas e as perdidas voltam a zero, coral volta a 0 e a bolha volta para a areia.'
                : 'R reinicia a rodada: contadores e perdidas zerados, coral 0, jogando ativo e a bolha em (280, 360).',
          },
          // O minijogo vira atração (lacunas, 01/11/2026): o player roda o Python no ambiente do
          // desafio.
          recompensa: {
            cor: true,
            atracao: 'bolhas-da-lagoa',
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
  for (const publico of ['kids', 'adulto'] as const)
    await gravarManifesto(
      new URL(
        `./recife-python${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
        import.meta.url,
      ),
      criarManifestoPython(publico),
    )
