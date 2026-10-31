import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { gravarManifesto } from '../gravar-manifesto'
import { comPedidosDosMoradores } from '../pedidos-dos-moradores'
import { objetivosDasNuvensPro } from './pro-objetivos'
import { montarProjetoPro } from './pro-projetos'

/**
 * C02 (30/10/2026): o Jardim das Nuvens em JavaScript Pro (arquivos), Kids e adulto. O sexto quadro da ilha
 * (§6.28, A2): devolve a cor e abre só com o curso-base do posto concluído (A3). Publica ao importar;
 * importar depois do manifesto em blocos da ilha, que tira o minijogo do quadro 6.
 */
const textos: Record<PublicoDoDesafio, { titulo: string; enunciado: string; dicas: string[] }> = {
  kids: {
    titulo: 'Jardim das Nuvens: plantas juntas e jardim maior',
    enunciado:
      'Nas Nuvens, o jardim é uma grade de células. Este desafio é em JavaScript no Pro, com arquivos separados. O src/main.ts desenha a tela e trata cliques e teclas; ele já está pronto. As regras do jardim moram em src/regras.ts: plantar, custo, ocupação e guardar já estão prontos, e você completa as regras do jardim do céu. vizinhas diz quantas plantas há nas quatro células em volta de uma célula, só dentro da grade. colher soma às moedas a produção de cada planta, e a planta que tem vizinha rende 1 a mais. expandir aumenta o jardim em uma coluna vazia por 4 moedas; sem moedas, devolve o mesmo jardim. Contar as plantas por tipo fica para o extra.',
    dicas: [
      'Leia PRODUCAO e CUSTO_DA_COLUNA no começo do src/regras.ts.',
      'Em vizinhas, confira se a célula do lado está dentro da grade antes de olhar para ela.',
      'Não mude o jardim recebido. Faça uma grade nova com map e devolva um objeto novo.',
    ],
  },
  adulto: {
    titulo: 'Jardim em grade: vizinhança, produção e expansão',
    enunciado:
      'Projeto JavaScript Pro (Vite e TypeScript) com modelo e apresentação separados. src/main.ts (pronto) desenha a grade e liga cliques e teclas ao modelo; podeConstruir, construir, salvar e carregar já estão prontos em src/regras.ts. Implemente, sem efeitos colaterais: vizinhas(jardim, linha, coluna), que conta plantas nas quatro vizinhas ortogonais dentro dos limites; colher, que soma PRODUCAO por planta mais 1 para cada planta com vizinha; expandir, que acrescenta uma coluna vazia por CUSTO_DA_COLUNA só com saldo, retornando um novo estado. A tecla E usa expandir. Como extra, plantasPorTipo retorna a contagem por tipo.',
    dicas: [
      'Valide os limites antes de indexar a grade.',
      'Reaproveite vizinhas dentro de colher.',
      'Imutabilidade: estenda uma cópia de cada fileira.',
    ],
  },
}

export function criarManifestoPro(publico: PublicoDoDesafio = 'kids') {
  const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
  return comPedidosDosMoradores(
    ManifestoDeDesafiosSchema.parse({
      formato: 'arquipelago-desafios',
      versao: 1,
      escopo: 'ilha',
      desafios: [
        {
          slug: `nuvens-jardim-em-grade-pro${publico === 'adulto' ? '-adulto' : ''}`,
          publico,
          ilha: 'nuvens',
          // §6.28 A2: o sexto quadro, na linguagem do posto, devolve a cor; abre só com o
          // curso-base do posto concluído (A3). Publica (A1): não pede bloco nenhum.
          tipo: 'quadro-das-cores',
          quadro: 6,
          ordem: 60,
          publicar: true,
          conteudo: {
            versao: 1,
            ...textos[publico],
            projetoInicial: montarProjetoPro('inicial'),
            gabarito: montarProjetoPro('gabarito'),
            objetivos: objetivosDasNuvensPro(publico),
            desafioExtra: {
              titulo: publico === 'kids' ? 'Mais um desafio' : 'Extra',
              texto:
                publico === 'kids'
                  ? 'Complete plantasPorTipo: conte quantas flores e quantas árvores o jardim tem.'
                  : 'Implemente plantasPorTipo: retorna { flor, arvore } com a contagem de cada tipo.',
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
        `./nuvens-pro${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
        import.meta.url,
      ),
      criarManifestoPro(publico),
    )
