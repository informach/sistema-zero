import {
  ManifestoDeDesafiosSchema,
  MOEDAS_PADRAO_POR_TIPO,
  type PublicoDoDesafio,
} from '../../../packages/arquipelago-contracts/src/desafios'
import { gravarManifesto } from '../gravar-manifesto'
import { DESAFIOS_3D, type DesafioTresD, objetivosTresD, projetoTresD } from './projetos'

/**
 * Os desafios 3D das ilhas (lacunas, 01/11/2026): um desafio do dia 3D por ilha e público, com a
 * aventura de chave e porta da Ilha do Farol no tema da ilha. Ordem 75, depois dos desafios do
 * dia de cada ilha. Não pinta (o desafio do dia nunca pinta).
 */
function textos(d: DesafioTresD, publico: PublicoDoDesafio) {
  const { nome, artigo } = d.morador
  const em = artigo === 'a' ? 'na' : 'no'
  const item = d.item.nome
  const noItem = d.item.artigo === 'a' ? 'na' : 'no'
  if (publico === 'kids')
    return {
      enunciado: `${d.textos.pedido} A ilha, o personagem, ${artigo} ${nome} e ${d.item.artigo} ${item} já estão no jogo. Programe os dois encontros: quando o personagem encostar ${noItem} ${item}, esconda ${d.item.artigo} ${item} e guarde verdadeiro em temItem; quando encostar ${em} ${nome}, use um Se para entregar só com o item.`,
      dicas: [
        `Os dois blocos de encontro já estão no espaço de blocos, vazios. O primeiro é com o item; o segundo, com ${artigo} ${nome}.`,
        'A informação temItem começa falsa. Ela guarda que o personagem pegou o item, mesmo depois que ele some.',
        `No encontro com ${artigo} ${nome}, um Se olha temItem. Com o item, guarde verdadeiro em entregue; sem ele, guarde verdadeiro em pediu.`,
        'Para entregar uma vez só, coloque tudo dentro de um Se que confere que ainda não entregou.',
      ],
      extra: 'Faça a tecla R recomeçar a aventura.',
    }
  return {
    enunciado: `${d.textos.pedido} O cenário e os modelos estão prontos. Programe os encontros: ao encostar no item, esconda o item e atribua verdadeiro a temItem; ao encostar ${em} ${nome}, entregue só com o item (entregue verdadeiro) e, sem ele, registre o pedido (pediu verdadeiro).`,
    dicas: [
      'Os dois eventos de encontro existem e estão vazios.',
      'temItem começa falsa e continua verdadeira depois que o item some.',
      'No encontro com o morador, uma decisão lê temItem e escolhe entre entregar e pedir.',
      'Uma decisão externa com a negação de entregue impede a segunda entrega.',
    ],
    extra: 'A tecla R recomeça a aventura.',
  }
}

export function criarManifesto(d: DesafioTresD, publico: PublicoDoDesafio = 'kids') {
  const moedas = MOEDAS_PADRAO_POR_TIPO['desafio-do-dia']
  const t = textos(d, publico)
  return ManifestoDeDesafiosSchema.parse({
    formato: 'arquipelago-desafios',
    versao: 1,
    escopo: 'ilha',
    desafios: [
      {
        slug: `${d.ilha}-3d-${d.slug}${publico === 'adulto' ? '-adulto' : ''}`,
        publico,
        ilha: d.ilha,
        tipo: 'desafio-do-dia',
        quadro: null,
        ordem: 75,
        publicar: true,
        conteudo: {
          versao: 1,
          titulo: d.titulo,
          enunciado: t.enunciado,
          dicas: t.dicas,
          projetoInicial: projetoTresD(d, false),
          gabarito: projetoTresD(d, true),
          objetivos: objetivosTresD(d),
          desafioExtra: {
            titulo: publico === 'kids' ? 'Mais um desafio' : 'Extra',
            texto: t.extra,
          },
          recompensa: { cor: false, moedas: moedas.principal, moedasExtra: moedas.extra },
          blocosManuais: { acrescentar: [], retirar: [] },
        },
      },
    ],
  })
}

if (import.meta.main)
  for (const d of DESAFIOS_3D)
    for (const publico of ['kids', 'adulto'] as const)
      await gravarManifesto(
        new URL(
          `./${d.ilha}-3d${publico === 'adulto' ? '-adulto' : ''}.manifesto.json`,
          import.meta.url,
        ),
        criarManifesto(d, publico),
      )
