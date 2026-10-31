import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { gravarManifesto } from '../gravar-manifesto'
import { comPedidosDosMoradores } from '../pedidos-dos-moradores'
import { objetivosDoValeTexto } from './texto-objetivos'
import { montarProjetoTexto } from './texto-projetos'

/**
 * C02 (30/10/2026): o desafio do Vale em JavaScript textual (Ponte), Kids e adulto. O sexto quadro da ilha
 * (§6.28, A2): devolve a cor e abre só com o curso-base do posto concluído (A3). Sem pedido de
 * publicação até os cursos do Arquiteto existirem; importar depois do manifesto em blocos da ilha,
 * que tira o minijogo do quadro 6.
 */
const textos: Record<PublicoDoDesafio, { titulo: string; enunciado: string; dicas: string[] }> = {
  kids: {
    titulo: 'Guardião dos ninhos: ondas e alcance',
    enunciado:
      'A cinza voltou ao Vale e segue um caminho de pontos até os ninhos. Este desafio é em JavaScript, escrito no modo Ponte. O vale, o caminho, a torre, o movimento e o placar já estão prontos. Complete três funções. criarOnda(numero) devolve uma lista com numero + 2 nuvens de cinza; cada nuvem é um objeto com x, y, ponto, vida e andou, começando antes do caminho, em y 120 e no ponto 1. dentroDoAlcance(t, cinza) diz se a distância entre a torre e a nuvem é no máximo t.alcance. escolherAlvo(t, lista) devolve, entre as nuvens dentro do alcance, a que andou mais, ou null quando nenhuma está perto. Enter chama a próxima onda. Fazer a tecla R recomeçar fica para o extra.',
    dicas: [
      'Leia o laço do jogo em atualizar: ele já move as nuvens e aplica o dano no alvo que a torre escolhe.',
      'Para criar a lista, use um laço que repete numero + 2 vezes e lista.push com um objeto novo a cada volta.',
      'Math.hypot(t.x - cinza.x, t.y - cinza.y) dá a distância. Compare com t.alcance usando <=.',
    ],
  },
  adulto: {
    titulo: 'Defesa do Vale: ondas e alcance',
    enunciado:
      'Projeto JavaScript em texto (modo Ponte). O cenário, o caminho em pontos, a torre, o movimento e o laço de atualização e desenho estão prontos. Implemente três funções puras. criarOnda(numero) devolve numero + 2 objetos { x, y, ponto, vida, andou }, posicionados antes do caminho (y 120, ponto 1). dentroDoAlcance(t, cinza) compara a distância euclidiana com t.alcance, incluindo a borda. escolherAlvo(t, lista) devolve o objeto mais avançado (maior andou) entre os que estão no alcance, ou null. Enter inicia a próxima onda quando a anterior termina. Como extra, faça a tecla R reiniciar a partida.',
    dicas: [
      'atualizar() já move os inimigos com andar() e aplica dano ao retorno de escolherAlvo().',
      'O tamanho da onda cresce um por onda: numero + 2.',
      'A seleção precisa filtrar pelo alcance antes de comparar quem avançou mais.',
    ],
  },
}

export function criarManifestoTexto(publico: PublicoDoDesafio = 'kids') {
  const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
  return comPedidosDosMoradores(
    ManifestoDeDesafiosSchema.parse({
      formato: 'arquipelago-desafios',
      versao: 1,
      escopo: 'ilha',
      desafios: [
        {
          slug: `vale-guardiao-dos-ninhos-texto${publico === 'adulto' ? '-adulto' : ''}`,
          publico,
          ilha: 'vale-dos-dinos',
          // §6.28 A2: o sexto quadro, na linguagem do posto, devolve a cor; abre só com o
          // curso-base do posto concluído (A3). Não publica ainda (A1): a Ponte deriva blocos que
          // só terão fonte com os cursos do Arquiteto, e a barreira C01a recusaria.
          tipo: 'quadro-das-cores',
          quadro: 6,
          ordem: 60,
          publicar: false,
          conteudo: {
            versao: 1,
            ...textos[publico],
            projetoInicial: montarProjetoTexto('inicial'),
            gabarito: montarProjetoTexto('gabarito'),
            objetivos: objetivosDoValeTexto(publico),
            desafioExtra: {
              titulo: publico === 'kids' ? 'Mais um desafio' : 'Extra',
              texto:
                publico === 'kids'
                  ? 'Faça a tecla R recomeçar a partida: sem ondas, sem nuvens e com as contagens zeradas.'
                  : 'Faça a tecla R reiniciar a partida: onda, inimigos, protegidos e vidas voltam ao início.',
            },
            recompensa: { cor: true, moedas: moedas.principal, moedasExtra: moedas.extra },
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
        `./vale-texto${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
        import.meta.url,
      ),
      criarManifestoTexto(publico),
    )
