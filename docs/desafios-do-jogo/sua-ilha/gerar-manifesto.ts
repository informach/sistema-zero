import {
  DesafioDoManifestoSchema,
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { comPedidosDosMoradores } from '../pedidos-dos-moradores'
import {
  objetivosDoQuadro,
  projetoDoQuadro,
  QUADROS_DA_SUA_ILHA,
  type QuadroDaSuaIlha,
} from './projetos'

/** O que o extra pede em cada quadro (o quadro 5 ensina o Enter; o extra dele é a barra de espaço). */
const extra = (quadro: QuadroDaSuaIlha) =>
  quadro === 5
    ? 'Faça a barra de espaço também recomeçar a praia. No controle da tela, use A.'
    : 'Complete o evento Enter para recomeçar a praia do início.'

/**
 * Cada quadro devolve a cor de uma parte da sua ilha (`cor: true`, lacunas de 01/11/2026, pela
 * proposta; antes a sua ilha não pintava): a casa, a horta, o píer, a praia, o gramado e a trilha
 * das pedras, na ordem dos quadros (`PARTES_DA_SUA_ILHA` no jogo). Cada quadro também entrega o
 * próprio minijogo ao fliperama; o sexto é o Pega-conchas.
 * Pede publicação: todos os blocos vêm das fontes da trilha do Faísca (C01b; a importação é da
 * equipe e a barreira C01a confere de novo no serviço).
 */
export function criarManifesto(publico: PublicoDoDesafio = 'kids') {
  const moedas = MOEDAS_PADRAO_POR_TIPO['quadro-das-cores']
  const desafios = QUADROS_DA_SUA_ILHA.map((meta, i) => {
    const quadro = (i + 1) as QuadroDaSuaIlha
    return DesafioDoManifestoSchema.parse({
      slug: `sua-ilha-${meta.slug}${publico === 'adulto' ? '-adulto' : ''}`,
      publico,
      ilha: 'sua-ilha',
      tipo: 'quadro-das-cores',
      quadro,
      ordem: quadro * 10,
      publicar: true,
      conteudo: {
        versao: 1,
        titulo: meta.titulo,
        enunciado: meta.texto,
        dicas: [meta.dica, 'O cenário já está pronto. Complete somente as ações indicadas.'],
        projetoInicial: projetoDoQuadro(quadro, false),
        gabarito: projetoDoQuadro(quadro, true),
        objetivos: objetivosDoQuadro(quadro),
        desafioExtra: { titulo: 'Mais um desafio', texto: extra(quadro) },
        recompensa: {
          cor: true,
          atracao: quadro === 6 ? 'pega-conchas' : `sua-ilha-${meta.slug}`,
          moedas: moedas.principal,
          moedasExtra: moedas.extra,
        },
        blocosManuais: { acrescentar: [], retirar: [] },
      },
    })
  })
  return comPedidosDosMoradores(
    ManifestoDeDesafiosSchema.parse({
      formato: 'arquipelago-desafios',
      versao: 1,
      escopo: 'ilha',
      desafios,
    }),
  )
}

if (import.meta.main) {
  for (const publico of ['kids', 'adulto'] as const)
    await Bun.write(
      new URL(`./sua-ilha${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`, import.meta.url),
      `${JSON.stringify(criarManifesto(publico), null, 2)}\n`,
    )
}
