import { z } from 'zod'

/**
 * Os objetos com função da casa (modo construção, 28/10/2026). Cada um chega como PROJETO AZUL:
 * a função já vem pronta e funciona em holograma; a aparência vem depois (galeria, Pinta, Molda ou
 * uma criação guardada que cabe no molde). As medidas são as dos modelos de
 * `arquipelago/arte/objetos` (README de lá): 1 célula da grade = 1 unidade do jogo.
 */
export const OBJETOS_DA_CASA = [
  'geladeira',
  'forno',
  'aquario',
  'lareira',
  'banda',
  'fliperama',
  'museu',
  'casinha',
] as const
export type ObjetoDaCasa = (typeof OBJETOS_DA_CASA)[number]

/** Quantos alimentos a geladeira guarda: em holograma e com aparência (proposta). */
export const GELADEIRA_GUARDA = { holograma: 4, completa: 12 } as const

/** Teto de triângulos de um objeto criado no Molda (proposta: "objeto criado até 5 mil"). */
export const TRIANGULOS_DO_OBJETO_CRIADO = 5000

export const FACES_DO_MOLDE = ['frente', 'lado-esq', 'lado-dir', 'topo', 'tela'] as const
export type FaceDoMolde = (typeof FACES_DO_MOLDE)[number]

const medida = z.number().positive().max(10)

/**
 * O molde que o Pinta e o Molda recebem (`abrirFerramenta`, `proposito: 'objeto'`): o tamanho e a
 * proporção do objeto, a área que ele ocupa na grade, as faces planas que recebem imagem (com o
 * tamanho de cada uma), qual delas é a frente e a função explicada.
 */
export const MoldeDeObjetoSchema = z.strictObject({
  tipo: z.literal('objeto'),
  objeto: z.enum(OBJETOS_DA_CASA),
  nome: z.string().min(1).max(40),
  /** Células da grade (largura × fundo). */
  area: z.strictObject({
    largura: z.number().int().min(1).max(4),
    fundo: z.number().int().min(1).max(4),
  }),
  /** A caixa do objeto (largura × altura × fundo, em unidades do jogo). */
  caixa: z.strictObject({ largura: medida, altura: medida, fundo: medida }),
  /** As faces planas do modelo que recebem imagem; vazia quando o modelo ainda não tem. */
  faces: z
    .array(z.strictObject({ face: z.enum(FACES_DO_MOLDE), largura: medida, altura: medida }))
    .max(FACES_DO_MOLDE.length),
  /** A face marcada: a frente é onde o avatar usa o objeto. */
  frente: z.enum(FACES_DO_MOLDE).nullable(),
  /** O que o objeto faz, para a criança; `null` enquanto a função não foi definida. */
  funcao: z.string().min(1).max(200).nullable(),
  triangulosMaximos: z.number().int().positive(),
})
export type MoldeDeObjeto = z.infer<typeof MoldeDeObjetoSchema>

/** O objeto no catálogo: o molde e de onde ele vem. */
export interface ObjetoDoCatalogo {
  molde: MoldeDeObjeto
  /** De onde a função vem, para a criança (os pedidos e os desafios); `null` = a proposta não diz. */
  origem: string | null
}

function molde(
  objeto: ObjetoDaCasa,
  nome: string,
  area: [number, number],
  caixa: [number, number, number],
  faces: MoldeDeObjeto['faces'],
  funcao: string | null,
): MoldeDeObjeto {
  return {
    tipo: 'objeto',
    objeto,
    nome,
    area: { largura: area[0], fundo: area[1] },
    caixa: { largura: caixa[0], altura: caixa[1], fundo: caixa[2] },
    faces,
    frente: faces.some((f) => f.face === 'frente') ? 'frente' : null,
    funcao,
    triangulosMaximos: TRIANGULOS_DO_OBJETO_CRIADO,
  }
}

/**
 * O catálogo. Áreas e caixas do README de `arte/objetos`. Só a geladeira tem as faces do Pinta no
 * modelo (`pintaFrente`, `pintaLadoEsq`, `pintaLadoDir`, `pintaTopo`) e o fliperama a `tela`; os
 * outros ganham as faces quando o modelo tiver (anotado no README de lá).
 */
export const CATALOGO_DE_OBJETOS: Readonly<Record<ObjetoDaCasa, ObjetoDoCatalogo>> = {
  geladeira: {
    molde: molde(
      'geladeira',
      'Geladeira',
      [1, 1],
      [0.82, 1.75, 0.83],
      [
        { face: 'frente', largura: 0.74, altura: 1.51 },
        { face: 'lado-esq', largura: 0.54, altura: 1.58 },
        { face: 'lado-dir', largura: 0.54, altura: 1.58 },
        { face: 'topo', largura: 0.7, altura: 0.54 },
      ],
      `Guarda ${GELADEIRA_GUARDA.holograma} alimentos. Com aparência, guarda ${GELADEIRA_GUARDA.completa} e conserva.`,
    ),
    origem: 'Vem do primeiro pedido entregue.',
  },
  forno: {
    molde: molde(
      'forno',
      'Forno',
      [1, 1],
      [0.76, 1.06, 0.74],
      [],
      'Assa o bolo de fubá e o pão de queijo.',
    ),
    origem: null,
  },
  aquario: {
    molde: molde('aquario', 'Aquário', [2, 1], [1.53, 1.39, 0.68], [], null),
    origem: 'Pedido do Recife Coral.',
  },
  lareira: {
    molde: molde('lareira', 'Lareira', [2, 1], [1.85, 1.47, 0.88], [], null),
    origem: 'Pedido do Pico Gelado.',
  },
  banda: {
    molde: molde('banda', 'Instrumentos da banda', [3, 2], [2.85, 1.28, 1.56], [], null),
    origem: 'Pedido do Pico Gelado.',
  },
  fliperama: {
    molde: molde(
      'fliperama',
      'Fliperama',
      [1, 1],
      [0.84, 1.8, 0.81],
      [{ face: 'tela', largura: 0.5, altura: 0.375 }],
      null,
    ),
    origem: 'Vem dos minijogos aprovados.',
  },
  museu: {
    molde: molde('museu', 'Museu dos fósseis', [3, 2], [2.63, 1.27, 1.49], [], null),
    origem: 'Pedido do Vale dos Dinos.',
  },
  casinha: {
    molde: molde('casinha', 'Casinha de bicho', [2, 2], [1.79, 1.2, 1.7], [], null),
    origem: 'Vem do Bosque dos Bichos, quando você adota um bicho.',
  },
}
