import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { gravarManifesto } from '../gravar-manifesto'
import { objetivosDoPicoPython } from './python-objetivos'
import { montarProjetoPython } from './python-projetos'

/**
 * C02 (30/10/2026): a Fase de plataforma do Pico em Python (Pygame Zero), com as fases como
 * dados, Kids e adulto. Desde a revisão de 31/10/2026 (A45), no tema da ilha: a subida do Floco. O sexto quadro da ilha
 * (§6.28, A2): devolve a cor e abre só com o curso-base do posto concluído (A3). Publica ao importar;
 * importar depois do manifesto em blocos da ilha, que tira o minijogo do quadro 6.
 */
const textos: Record<PublicoDoDesafio, { titulo: string; enunciado: string; dicas: string[] }> = {
  kids: {
    titulo: 'A subida do Floco: o mapa é dado',
    enunciado:
      'O Floco quer subir a montanha até o cume, um trecho da trilha de cada vez, e em cada trecho precisa achar um cristal antes de seguir. Ele pediu um jogo em que cada trecho seja uma fase. No Pico, cada fase é uma lista de linhas de texto. Cada letra é uma célula de 40 pontos: # é plataforma, C é o cristal, S é a saída e J é onde o Floco começa. Este desafio é em Python, com Pygame Zero. O jogo já anda, pula e desenha usando quatro funções; complete três delas. ler_fase(linhas, letra) devolve uma lista com [coluna, linha] de cada lugar onde a letra aparece. pousar(pe_antes, pe_depois, vy, topo) faz o Floco parar em cima da plataforma quando ele está caindo e cruza o topo; nos outros casos, nada muda. proxima_fase(numero, tem_cristal, na_saida) avança para a fase seguinte só com o cristal e na saída. Setas andam e Espaço pula. Criar uma terceira fase fica para o extra.',
    dicas: [
      'enumerate(lista) dá a posição e o valor de cada item. Use um enumerate para as linhas e outro para as letras de cada linha.',
      'pousar devolve uma lista com dois valores: o pé novo e a velocidade nova. Pousar é devolver [topo, 0].',
      'Teste uma função de cada vez com casos pequenos, como uma fase de duas linhas.',
    ],
  },
  adulto: {
    titulo: 'Plataforma com fases como dados',
    enunciado:
      'Projeto Python com Pygame Zero. FASES é uma lista de fases e cada fase é uma lista de strings: # plataforma, C cristal, S saída e J início, em células de 40 px. O laço de jogo, a física e o desenho estão prontos e dependem de três funções. ler_fase(linhas, letra) retorna [coluna, linha] de cada ocorrência, em ordem de leitura. pousar(pe_antes, pe_depois, vy, topo) resolve a colisão vertical: retorna [topo, 0] apenas quando o Floco está caindo (vy > 0) e cruza o topo; senão, [pe_depois, vy]. proxima_fase(numero, tem_cristal, na_saida) retorna numero + 1 apenas com o cristal coletado e na saída. Como extra, acrescente uma terceira fase.',
    dicas: [
      'Dois enumerate aninhados percorrem linhas e colunas.',
      'A colisão por eixo depende do movimento: compare pe_antes e pe_depois com o topo.',
      'Cada objetivo de função roda casos pequenos e independentes.',
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
                ? 'Acrescente uma terceira fase à lista FASES, com J, C, S e plataformas que levem até a saída.'
                : 'Acrescente uma terceira fase jogável a FASES (início, cristal, saída e plataformas alcançáveis).',
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
        `./pico-python${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
        import.meta.url,
      ),
      criarManifestoPython(publico),
    )
