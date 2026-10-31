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
    titulo: 'Jardim das Nuvens: grade, custo e guardar',
    enunciado:
      'Nas Nuvens, o jardim é uma grade de células. Este desafio é em JavaScript no Pro, com arquivos separados. O src/main.ts desenha a tela e trata cliques e teclas; ele já está pronto. As regras do jardim moram em src/regras.ts, e é lá que você trabalha. podeConstruir diz se dá para plantar numa célula: ela precisa estar dentro da grade, vazia e com moedas suficientes. construir planta e desconta o custo, ou devolve o mesmo jardim quando não pode. colher soma às moedas a produção de cada planta. salvar transforma o jardim em texto e carregar reconstrói o jardim a partir desse texto, com a grade e as moedas. Tirar uma planta e devolver metade do custo fica para o extra.',
    dicas: [
      'Leia CUSTO e PRODUCAO no começo do src/regras.ts: flor custa 3 e produz 1; árvore custa 5 e produz 2.',
      'Não mude o jardim recebido. Faça uma cópia da grade com map e devolva um objeto novo.',
      'JSON.stringify transforma um objeto em texto e JSON.parse faz o caminho de volta.',
    ],
  },
  adulto: {
    titulo: 'Jardim em grade: modelo, custo e persistência',
    enunciado:
      'Projeto JavaScript Pro (Vite e TypeScript) com modelo e apresentação separados. src/main.ts (pronto) desenha a grade e liga cliques e teclas ao modelo. Implemente o modelo em src/regras.ts, sem efeitos colaterais: podeConstruir valida limites, ocupação e saldo; construir aplica a regra e desconta o custo, retornando um novo estado (ou o mesmo, quando a ação é inválida); colher soma a produção de todas as plantas; salvar e carregar serializam e reconstroem o estado completo (grade e saldo). O main.ts usa salvar e carregar com localStorage nas teclas S e R. Como extra, remover libera a célula e devolve metade do custo.',
    dicas: [
      'CUSTO e PRODUCAO são tabelas por tipo de planta.',
      'Imutabilidade: copie a grade antes de alterar uma célula.',
      'Inclua no texto salvo tudo o que é necessário para reconstruir o estado.',
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
                  ? 'Complete remover: tire a planta da célula e devolva metade do custo dela, arredondado para baixo. Shift e clique usa essa regra na tela.'
                  : 'Implemente remover: libera a célula e devolve Math.floor(CUSTO / 2); célula vazia não muda. Shift e clique usa a regra.',
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
