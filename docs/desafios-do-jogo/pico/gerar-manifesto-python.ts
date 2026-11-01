import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { comApresentacao } from '../apresentacao'
import { gravarManifesto } from '../gravar-manifesto'
import { objetivosDoPicoPython } from './python-objetivos'
import { montarProjetoPython } from './python-projetos'

/**
 * C02 (30/10/2026): a Fase de plataforma do Pico em Python (Pygame Zero), com as fases como
 * dados, Kids e adulto. Desde a revisão de 31/10/2026 (A45), no tema da ilha: a subida do Floco; desde
 * as lacunas de 01/11/2026, com critérios próprios (e não a lista da missão do posto). O sexto quadro da ilha
 * (§6.28, A2): devolve a cor e abre só com o curso-base do posto concluído (A3). Publica ao importar;
 * importar depois do manifesto em blocos da ilha, que tira o minijogo do quadro 6.
 */
const textos: Record<PublicoDoDesafio, { titulo: string; enunciado: string; dicas: string[] }> = {
  kids: {
    titulo: 'A subida do Floco: flocos no gelo',
    enunciado:
      'O Floco quer subir a montanha até o cume, um trecho da trilha de cada vez, pegando todos os flocos de neve de cada trecho. No Pico, cada trecho é uma lista de linhas de texto. Cada letra é uma célula de 40 pontos: # é plataforma, * é um floco, S é a saída e J é onde o Floco começa. Este desafio é em Python, com Pygame Zero. O jogo já lê o mapa, pula, cai e desenha; complete três funções. contar(linhas, letra) diz quantas vezes a letra aparece no trecho. escorregar(vx, no_gelo) faz o Floco deslizar no gelo: no gelo, a velocidade diminui de 1 em 1 até parar; fora do gelo, ele para na hora. trecho_completo(pegos, total) só deixa seguir pela saída com todos os flocos pegos. Setas andam e Espaço pula. A função melhor fica para o extra.',
    dicas: [
      'Para contar, use um laço pelas linhas e, dentro dele, outro pelas letras de cada linha.',
      'escorregar tem quatro casos: indo para a direita, para a esquerda, parado e fora do gelo.',
      'Teste uma função de cada vez com casos pequenos, como um trecho de duas linhas.',
    ],
  },
  adulto: {
    titulo: 'Plataforma com fases como dados',
    enunciado:
      'Projeto Python com Pygame Zero. FASES é uma lista de trechos e cada trecho é uma lista de strings: # plataforma, * floco, S saída e J início, em células de 40 px. ler_fase, pousar, o laço de jogo e o desenho estão prontos e dependem de três funções. contar(linhas, letra) retorna o número de ocorrências da letra. escorregar(vx, no_gelo) aplica o atrito do gelo: com no_gelo, aproxima vx de zero em 1; sem gelo, retorna 0. trecho_completo(pegos, total) retorna True só com todos os flocos coletados. Como extra, melhor(tempos) retorna o menor tempo da lista.',
    dicas: [
      'Dois laços aninhados percorrem linhas e células.',
      'Trate vx positivo, negativo e zero, e o caso fora do gelo.',
      'Cada objetivo de função roda casos pequenos e independentes.',
    ],
  },
}

export function criarManifestoPython(publico: PublicoDoDesafio = 'kids') {
  const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
  return comApresentacao(
    ManifestoDeDesafiosSchema.parse({
      formato: 'arquipelago-desafios',
      versao: 1,
      escopo: 'ilha',
      desafios: [
        {
          slug: `pico-fase-de-plataforma-python${publico === 'adulto' ? '-adulto' : ''}`,
          publico,
          ilha: 'pico',
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
            objetivos: objetivosDoPicoPython(publico),
            desafioExtra: {
              titulo: publico === 'kids' ? 'Mais um desafio' : 'Extra',
              texto:
                publico === 'kids'
                  ? 'Complete melhor(tempos): ela devolve o menor tempo da lista, para o fim do jogo mostrar o trecho mais rápido.'
                  : 'Implemente melhor(tempos), que retorna o menor valor da lista de tempos dos trechos.',
            },
            // O minijogo vira atração (lacunas, 01/11/2026): o player roda o Python no ambiente do
            // desafio.
            recompensa: {
              cor: true,
              atracao: 'subida-do-floco',
              moedas: moedas.principal,
              moedasExtra: moedas.extra,
            },
            blocosManuais: { acrescentar: [], retirar: [] },
          },
        },
      ],
    }),
  )
}

if (import.meta.main)
  for (const publico of ['kids', 'adulto'] as const)
    await gravarManifesto(
      new URL(
        `./pico-python${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
        import.meta.url,
      ),
      criarManifestoPython(publico),
    )
