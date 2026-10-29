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
  'planta-interior',
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

/** Uma face na planificação, em pontos da tela (inteiros, com a origem no canto de cima). */
export interface FaceNaPlanificacao {
  face: FaceDoMolde
  x: number
  y: number
  largura: number
  altura: number
  /** A face marcada como frente (onde o avatar usa o objeto). */
  frente: boolean
}

/** A planificação das faces do molde numa tela só: o que o Pinta abre e o jogo lê de volta. */
export interface Planificacao {
  largura: number
  altura: number
  faces: FaceNaPlanificacao[]
}

/** O lado maior da tela da planificação, em pontos (cabe folgado no Pinta e no envio). */
export const LADO_DA_PLANIFICACAO = 192

/**
 * A planificação da caixa (28/10/2026, Pinta no molde): os lados ao lado da frente, o topo em cima
 * dela, cada face na proporção certa, e a tela inteira com o lado maior em `lado` pontos. Sem
 * frente (o fliperama só tem a tela), as faces vão em fila. Molde sem faces: `null`.
 */
export function planificacaoDoMolde(
  molde: MoldeDeObjeto,
  lado = LADO_DA_PLANIFICACAO,
): Planificacao | null {
  if (molde.faces.length === 0) return null
  const da = (face: FaceDoMolde) => molde.faces.find((f) => f.face === face)
  const frente = molde.frente ? da(molde.frente) : undefined
  // Em unidades do jogo: [face, x, y, largura, altura].
  const caixas: [FaceDoMolde, number, number, number, number][] = []
  if (frente) {
    const esq = frente.face === 'frente' ? da('lado-esq') : undefined
    const dir = frente.face === 'frente' ? da('lado-dir') : undefined
    const topo = frente.face === 'frente' ? da('topo') : undefined
    const y = topo?.altura ?? 0
    const xFrente = esq?.largura ?? 0
    if (topo)
      caixas.push([
        'topo',
        xFrente + (frente.largura - topo.largura) / 2,
        0,
        topo.largura,
        topo.altura,
      ])
    if (esq) caixas.push(['lado-esq', 0, y, esq.largura, esq.altura])
    caixas.push([frente.face, xFrente, y, frente.largura, frente.altura])
    if (dir) caixas.push(['lado-dir', xFrente + frente.largura, y, dir.largura, dir.altura])
    for (const f of molde.faces)
      if (!caixas.some(([face]) => face === f.face)) {
        const fim = Math.max(...caixas.map(([, x, , l]) => x + l))
        caixas.push([f.face, fim, y, f.largura, f.altura])
      }
  } else {
    let x = 0
    for (const f of molde.faces) {
      caixas.push([f.face, x, 0, f.largura, f.altura])
      x += f.largura
    }
  }
  const esquerda = Math.min(...caixas.map(([, x]) => x))
  const largura = Math.max(...caixas.map(([, x, , l]) => x + l)) - esquerda
  const altura = Math.max(...caixas.map(([, , y, , a]) => y + a))
  const escala = lado / Math.max(largura, altura)
  // As bordas arredondadas uma vez só: duas faces vizinhas dividem a mesma linha, sem fresta.
  const ponto = (v: number) => Math.round(v * escala)
  return {
    largura: Math.max(1, ponto(largura)),
    altura: Math.max(1, ponto(altura)),
    faces: caixas.map(([face, x, y, l, a]) => {
      const x0 = ponto(x - esquerda)
      const y0 = ponto(y)
      return {
        face,
        x: x0,
        y: y0,
        largura: Math.max(1, ponto(x - esquerda + l) - x0),
        altura: Math.max(1, ponto(y + a) - y0),
        frente: face === molde.frente,
      }
    }),
  }
}

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
 * O catálogo. Áreas, caixas e faces do README de `arte/objetos`. As faces do Pinta
 * (`pintaFrente`, `pintaLadoEsq`, `pintaLadoDir`, `pintaTopo`) estão na geladeira, no forno, no
 * aquário, no museu, na casinha e na planta (o rótulo que dá a volta no vaso, fase3-11); o
 * fliperama tem a `tela`. A lareira e a banda ficam sem faces de propósito (README de lá).
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
      [
        { face: 'frente', largura: 0.66, altura: 0.43 },
        { face: 'lado-esq', largura: 0.53, altura: 0.72 },
        { face: 'lado-dir', largura: 0.53, altura: 0.72 },
      ],
      'Assa o bolo de fubá e o pão de queijo.',
    ),
    origem: 'Vem com a primeira receita que o Bento lembra, na Vila Doce.',
  },
  aquario: {
    molde: molde(
      'aquario',
      'Aquário',
      [2, 1],
      [1.53, 1.39, 0.68],
      [
        { face: 'frente', largura: 1.41, altura: 0.34 },
        { face: 'lado-esq', largura: 0.55, altura: 0.42 },
        { face: 'lado-dir', largura: 0.55, altura: 0.42 },
      ],
      'Ganha um peixe para cada coral replantado na lagoa do Recife.',
    ),
    origem: 'Vem do primeiro coral replantado no Recife Coral.',
  },
  lareira: {
    molde: molde('lareira', 'Lareira', [2, 1], [1.85, 1.47, 0.88], [], null),
    origem: 'Vem do primeiro chocolate quente feito no iglu do Pico Gelado.',
  },
  banda: {
    molde: molde('banda', 'Instrumentos da banda', [3, 2], [2.85, 1.28, 1.56], [], null),
    origem: 'Vem do festival de inverno do Pico Gelado, com a banda completa.',
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
    molde: molde(
      'museu',
      'Museu dos fósseis',
      [3, 2],
      [2.63, 1.27, 1.49],
      [
        { face: 'frente', largura: 0.82, altura: 0.12 },
        { face: 'lado-esq', largura: 0.44, altura: 0.12 },
        { face: 'lado-dir', largura: 0.44, altura: 0.12 },
      ],
      null,
    ),
    origem: 'Pedido do Vale dos Dinos.',
  },
  casinha: {
    molde: molde(
      'casinha',
      'Casinha de bicho',
      [2, 2],
      [1.79, 1.2, 1.7],
      [
        { face: 'frente', largura: 0.98, altura: 0.58 },
        { face: 'lado-esq', largura: 1.08, altura: 0.58 },
        { face: 'lado-dir', largura: 1.08, altura: 0.58 },
      ],
      null,
    ),
    origem: 'Vem do Bosque dos Bichos, quando você adota um bicho.',
  },
  'planta-interior': {
    molde: molde(
      'planta-interior',
      'Planta de interior',
      [1, 1],
      [0.78, 1.28, 0.88],
      [{ face: 'frente', largura: 1.13, altura: 0.37 }],
      'Deixa o cômodo mais aconchegante.',
    ),
    origem: 'Vem com a primeira obra da casa ou da cabana.',
  },
}
