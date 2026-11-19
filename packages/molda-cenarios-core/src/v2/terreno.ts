import { z } from 'zod'
import { poligonoSimples } from '../validacao'
import { interpolarAlturasDaCelula } from './interpolacao-de-alturas'

export const CELULAS_DA_PECA = 64
export const LADO_DAS_AMOSTRAS = CELULAS_DA_PECA + 1
export const AMOSTRAS_DA_PECA = LADO_DAS_AMOSTRAS ** 2
export const BYTES_DA_PECA = 24 + AMOSTRAS_DA_PECA * 2
const MAGIC = 0x54485a53 // SZHT, little endian
const altura = z.number().finite().min(-10_000).max(10_000)
const dimensao = z.number().int().min(CELULAS_DA_PECA).max(4096).multipleOf(CELULAS_DA_PECA)
export const ReferenciaDePecaSchema = z
  .object({
    coluna: z.number().int().nonnegative(),
    linha: z.number().int().nonnegative(),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict()
export const CamadaDeSoloSchema = z
  .object({
    id: z.string().min(1).max(240),
    nome: z.string().trim().min(1).max(120),
    cor: z.string().regex(/^#[a-fA-F0-9]{6}$/),
    textura: z
      .object({
        id: z.string().min(1).max(240),
        repeticaoMetros: z.number().finite().min(0.1).max(100),
      })
      .strict()
      .optional(),
  })
  .strict()
export type CamadaDeSolo = z.infer<typeof CamadaDeSoloSchema>

export const BaseDeTerrenoSchema = z
  .object({
    tipo: z.literal('terreno'),
    origem: z
      .object({
        x: z.number().finite().min(-100_000).max(100_000),
        z: z.number().finite().min(-100_000).max(100_000),
      })
      .strict(),
    passo: z.number().finite().min(0.25).max(32),
    colunas: dimensao,
    linhas: dimensao,
    min: altura,
    max: altura,
    fundo: altura,
    /** Terreno nativo editável ocupa toda a grade; importados mantêm o domínio por peças. */
    cobertura: z.literal('grade').optional(),
    solo: z
      .object({
        camadas: z.array(CamadaDeSoloSchema).min(1).max(8),
        pecas: z.array(ReferenciaDePecaSchema).max(4096),
      })
      .strict()
      .optional(),
    buracos: z.array(ReferenciaDePecaSchema).max(4096).optional(),
    /** Furos importados, em coordenadas de mundo; não alteram as alturas de apoio. */
    recortes: z
      .array(
        z
          .array(
            z
              .object({
                x: z.number().finite().min(-100000).max(100000),
                z: z.number().finite().min(-100000).max(100000),
              })
              .strict(),
          )
          .min(3)
          .max(4096),
      )
      .max(128)
      .optional(),
    pecas: z.array(ReferenciaDePecaSchema).max(4096),
  })
  .strict()
  .superRefine((b, ctx) => {
    if (b.recortes) {
      if (b.recortes.reduce((n, p) => n + p.length, 0) > 16384)
        ctx.addIssue({
          code: 'custom',
          message: 'Os recortes excedem o orçamento de pontos',
          path: ['recortes'],
        })
      else
        b.recortes.forEach((p, i) => {
          if (!poligonoSimples(p))
            ctx.addIssue({
              code: 'custom',
              message: 'O recorte do terreno é inválido',
              path: ['recortes', i],
            })
        })
    }
    if (b.max <= b.min || b.fundo < b.min || b.fundo > b.max)
      ctx.addIssue({
        code: 'custom',
        message: 'O intervalo de alturas do terreno é inválido',
        path: ['min'],
      })
    if (b.colunas * b.passo > 8192 || b.linhas * b.passo > 8192)
      ctx.addIssue({ code: 'custom', message: 'O terreno passa de 8192 metros', path: ['passo'] })
    const camadas = new Set<string>()
    b.solo?.camadas.forEach((c, i) => {
      if (camadas.has(c.id))
        ctx.addIssue({
          code: 'custom',
          message: 'Camada de solo repetida',
          path: ['solo', 'camadas', i],
        })
      camadas.add(c.id)
    })
    for (const [lista, caminho] of [
      [b.pecas, ['pecas']],
      [b.solo?.pecas ?? [], ['solo', 'pecas']],
      [b.buracos ?? [], ['buracos']],
    ] as const) {
      const ocupados = new Set<string>()
      lista.forEach((p, i) => {
        const chave = `${p.coluna}:${p.linha}`
        if (
          p.coluna >= b.colunas / CELULAS_DA_PECA ||
          p.linha >= b.linhas / CELULAS_DA_PECA ||
          ocupados.has(chave)
        )
          ctx.addIssue({
            code: 'custom',
            message: 'A peça se repete ou está fora do terreno',
            path: [...caminho, i],
          })
        ocupados.add(chave)
      })
    }
  })

export type BaseDeTerreno = z.infer<typeof BaseDeTerrenoSchema>
export interface PecaDeAlturas {
  min: number
  max: number
  amostras: Uint16Array
}
export type FonteDeAlturas = ((x: number, z: number) => number) & {
  /** Presença de superfície carregada, distinta da altura matemática sob buracos. */
  temChao?: (p: { x: number; z: number }) => boolean
  /** Consulta opcional à mesma parte estrutural usada pelo desenho e pelo picking. */
  parteDoCaminho?: (id: string, parte: string) => SuperficieDeCaminho | null
}
/** Consulta em memória; não integra o documento nem é serializada. */
export interface SuperficieDeCaminho
  extends Pick<
    import('./estrutura-de-caminho').PecaEstruturalDoCaminho,
    'transformacao' | 'noTerreno'
  > {
  /** Tampas realmente usadas para conformar o prisma, nas coordenadas do mundo. */
  perfilVertical?: (x: number, z: number) => { inferior: number; superior: number }
}
export class TerrenoInvalido extends Error {}
export class PecaDeTerrenoAusente extends TerrenoInvalido {}
const invalidar = (frase: string): never => {
  throw new TerrenoInvalido(frase)
}

function conferirIntervalo(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < -10_000 || max > 10_000 || max <= min)
    invalidar('O intervalo de alturas da peça é inválido')
}

/** Binário canônico e limitado: sem imagem, ZIP, JSON ou dependência do sistema hospedeiro. */
export function codificarPecaDeAlturas(
  amostras: ArrayLike<number>,
  min: number,
  max: number,
): Uint8Array<ArrayBuffer> {
  conferirIntervalo(min, max)
  if (amostras.length !== AMOSTRAS_DA_PECA) invalidar('A peça precisa ter 65 × 65 amostras')
  const bytes = new Uint8Array(BYTES_DA_PECA),
    v = new DataView(bytes.buffer)
  v.setUint32(0, MAGIC, true)
  v.setUint16(4, 1, true)
  v.setUint16(6, LADO_DAS_AMOSTRAS, true)
  v.setFloat64(8, min, true)
  v.setFloat64(16, max, true)
  for (let i = 0; i < AMOSTRAS_DA_PECA; i++) {
    const h = amostras[i]!
    if (!Number.isFinite(h) || h < min || h > max)
      invalidar('A amostra está fora do intervalo de alturas')
    v.setUint16(24 + i * 2, Math.round(((h - min) / (max - min)) * 65535), true)
  }
  return bytes
}

export function lerPecaDeAlturas(bytes: Uint8Array): PecaDeAlturas {
  if (bytes.byteLength !== BYTES_DA_PECA) invalidar('O tamanho da peça de terreno é inválido')
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (
    v.getUint32(0, true) !== MAGIC ||
    v.getUint16(4, true) !== 1 ||
    v.getUint16(6, true) !== LADO_DAS_AMOSTRAS
  )
    invalidar('O formato da peça de terreno é inválido')
  const min = v.getFloat64(8, true),
    max = v.getFloat64(16, true)
  conferirIntervalo(min, max)
  const amostras = new Uint16Array(AMOSTRAS_DA_PECA)
  for (let i = 0; i < amostras.length; i++) amostras[i] = v.getUint16(24 + i * 2, true)
  return { min, max, amostras }
}

/** Índice e recursos pertencem à base aberta; não há registro global nem resolução por rede. */
export function criarFonteDeAlturas(
  entrada: BaseDeTerreno,
  recursos: ReadonlyMap<string, PecaDeAlturas>,
): FonteDeAlturas {
  const base = BaseDeTerrenoSchema.parse(entrada)
  const larguraEmPecas = base.colunas / CELULAS_DA_PECA
  const pecas = new Map<number, PecaDeAlturas>()
  for (const p of base.pecas) {
    const dados = recursos.get(p.digest)
    if (!dados) throw new PecaDeTerrenoAusente(`Falta a peça de terreno ${p.digest}`)
    if (
      dados.min !== base.min ||
      dados.max !== base.max ||
      dados.amostras.length !== AMOSTRAS_DA_PECA
    )
      invalidar('A peça não corresponde ao intervalo e à resolução do terreno')
    pecas.set(p.linha * larguraEmPecas + p.coluna, dados)
  }
  // Bordas duplicadas só são aceitas quando representam exatamente as mesmas alturas.
  for (const [chave, p] of pecas) {
    const coluna = chave % larguraEmPecas
    const direita = coluna + 1 < larguraEmPecas ? pecas.get(chave + 1) : null
    const abaixo = pecas.get(chave + larguraEmPecas)
    for (let i = 0; i < LADO_DAS_AMOSTRAS; i++) {
      if (
        direita &&
        p.amostras[i * LADO_DAS_AMOSTRAS + CELULAS_DA_PECA] !==
          direita.amostras[i * LADO_DAS_AMOSTRAS]
      )
        invalidar('As bordas das peças de terreno não coincidem')
      if (abaixo && p.amostras[CELULAS_DA_PECA * LADO_DAS_AMOSTRAS + i] !== abaixo.amostras[i])
        invalidar('As bordas das peças de terreno não coincidem')
    }
  }
  const ler = (p: PecaDeAlturas, x: number, z: number) =>
    p.min + (p.amostras[z * LADO_DAS_AMOSTRAS + x]! / 65535) * (p.max - p.min)
  return (x, z) => {
    const gx = (x - base.origem.x) / base.passo,
      gz = (z - base.origem.z) / base.passo
    if (!Number.isFinite(gx) || !Number.isFinite(gz))
      return invalidar('O ponto de consulta do terreno é inválido')
    if (gx < 0 || gz < 0 || gx > base.colunas || gz > base.linhas) return base.fundo
    const coluna = Math.min(larguraEmPecas - 1, Math.floor(gx / CELULAS_DA_PECA))
    const linha = Math.min(base.linhas / CELULAS_DA_PECA - 1, Math.floor(gz / CELULAS_DA_PECA))
    const peca = pecas.get(linha * larguraEmPecas + coluna)
    if (!peca) return base.fundo
    const lx = gx - coluna * CELULAS_DA_PECA,
      lz = gz - linha * CELULAS_DA_PECA
    const ix = Math.min(CELULAS_DA_PECA - 1, Math.floor(lx)),
      iz = Math.min(CELULAS_DA_PECA - 1, Math.floor(lz))
    const u = lx - ix,
      v = lz - iz
    const a = ler(peca, ix, iz),
      b = ler(peca, ix + 1, iz),
      c = ler(peca, ix, iz + 1),
      d = ler(peca, ix + 1, iz + 1)
    return interpolarAlturasDaCelula(a, b, c, d, u, v)
  }
}

/** Vértices locais à peça; o renderer aplica a origem em sua matriz para manter precisão. */
export function malhaDaPecaDeTerreno(
  base: BaseDeTerreno,
  referencia: BaseDeTerreno['pecas'][number],
  peca: PecaDeAlturas,
) {
  if (
    !base.pecas.some(
      (p) =>
        p.coluna === referencia.coluna &&
        p.linha === referencia.linha &&
        p.digest === referencia.digest,
    )
  )
    invalidar('A peça não pertence a este terreno')
  if (peca.min !== base.min || peca.max !== base.max || peca.amostras.length !== AMOSTRAS_DA_PECA)
    invalidar('A peça não corresponde ao terreno')
  return malhaDeGradeNaPeca(
    base,
    referencia,
    (x, z) =>
      peca.min + (peca.amostras[z * LADO_DAS_AMOSTRAS + x]! / 65535) * (peca.max - peca.min),
  )
}

/** Mesma triangulação para bytes publicados e campos transitórios. Altura recebe índices locais. */
export function malhaDeGradeNaPeca(
  base: Pick<BaseDeTerreno, 'origem' | 'colunas' | 'linhas' | 'passo'>,
  referencia: { coluna: number; linha: number },
  altura: (x: number, z: number) => number,
  celulaAberta?: (x: number, z: number) => boolean,
) {
  if (
    !Number.isInteger(referencia.coluna) ||
    !Number.isInteger(referencia.linha) ||
    referencia.coluna < 0 ||
    referencia.linha < 0 ||
    referencia.coluna >= base.colunas / CELULAS_DA_PECA ||
    referencia.linha >= base.linhas / CELULAS_DA_PECA
  )
    invalidar('A peça está fora do terreno')
  const vertices = new Float32Array(AMOSTRAS_DA_PECA * 3)
  const uvs = new Float32Array(AMOSTRAS_DA_PECA * 2)
  const indices = new Uint16Array(CELULAS_DA_PECA ** 2 * 6)
  let n = 0
  for (let z = 0; z <= CELULAS_DA_PECA; z++)
    for (let x = 0; x <= CELULAS_DA_PECA; x++) {
      const i = z * LADO_DAS_AMOSTRAS + x
      vertices[i * 3] = x * base.passo
      const y = altura(x, z)
      if (!Number.isFinite(y)) invalidar('A altura da malha é inválida')
      vertices[i * 3 + 1] = y
      vertices[i * 3 + 2] = z * base.passo
      uvs[i * 2] = (referencia.coluna * CELULAS_DA_PECA + x) / base.colunas
      uvs[i * 2 + 1] = (referencia.linha * CELULAS_DA_PECA + z) / base.linhas
      if (x === CELULAS_DA_PECA || z === CELULAS_DA_PECA) continue
      if (
        celulaAberta?.(
          referencia.coluna * CELULAS_DA_PECA + x,
          referencia.linha * CELULAS_DA_PECA + z,
        )
      )
        continue
      const a = i,
        b = i + 1,
        c = i + LADO_DAS_AMOSTRAS,
        d = c + 1
      indices.set([a, c, b, b, c, d], n)
      n += 6
    }
  return {
    origem: {
      x: base.origem.x + referencia.coluna * CELULAS_DA_PECA * base.passo,
      z: base.origem.z + referencia.linha * CELULAS_DA_PECA * base.passo,
    },
    vertices,
    uvs,
    indices: n === indices.length ? indices : indices.slice(0, n),
  }
}
