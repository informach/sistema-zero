import { z } from 'zod'
import { IdentificadorDeCenarioSchema } from '../v2/entidades-schema'
import { conferirCaminhoCompilado } from './caminhos'
import { LIMITES_DA_EXPORTACAO } from './limites'

export const CaminhoCompiladoSchema = z
  .string()
  .min(1)
  .max(1024)
  .superRefine((v, ctx) => {
    try {
      conferirCaminhoCompilado(v)
    } catch {
      ctx.addIssue({
        code: 'custom',
        message: 'O caminho do arquivo compilado é inválido ou não é portátil.',
      })
    }
  })
export const DigestCompiladoSchema = z.string().regex(/^[a-f0-9]{64}$/)
const medida = z.number().finite().min(-1e9).max(1e9)
export const PontoCompiladoSchema = z.object({ x: medida, y: medida, z: medida }).strict()
export const VolumeCompiladoSchema = z
  .object({ min: PontoCompiladoSchema, max: PontoCompiladoSchema })
  .strict()
  .refine(
    (v) => (['x', 'y', 'z'] as const).every((e) => v.min[e] <= v.max[e]),
    'O volume compilado tem limites invertidos.',
  )
export const MatrizCompiladaSchema = z
  .array(medida)
  .length(16)
  .superRefine((m, ctx) => {
    if (m.length !== 16) return
    const determinante =
      m[0]! * (m[5]! * m[10]! - m[9]! * m[6]!) -
      m[4]! * (m[1]! * m[10]! - m[9]! * m[2]!) +
      m[8]! * (m[1]! * m[6]! - m[5]! * m[2]!)
    if (
      m[3] !== 0 ||
      m[7] !== 0 ||
      m[11] !== 0 ||
      m[15] !== 1 ||
      !Number.isFinite(determinante) ||
      determinante === 0
    )
      ctx.addIssue({ code: 'custom', message: 'A matriz compilada precisa ser afim e invertível.' })
  })
export const ArquivoCompiladoSchema = z
  .object({
    caminho: CaminhoCompiladoSchema,
    digest: DigestCompiladoSchema,
    bytes: z.number().int().positive().max(LIMITES_DA_EXPORTACAO.bytesDoPacote),
    mime: z.enum(['model/gltf-binary', 'image/png', 'image/webp', 'application/octet-stream']),
    papel: z.enum([
      'modelo',
      'terreno',
      'agua',
      'caminho',
      'colisao',
      'alturas',
      'buracos',
      'pintura',
      'ceu',
      'textura',
    ]),
    malhas: z.number().int().positive().max(8192).optional(),
    triangulos: z.number().int().nonnegative().max(16_000_000).optional(),
    verticesMaximos: z
      .number()
      .int()
      .positive()
      .max(LIMITES_DA_EXPORTACAO.malha.verticesPorParte)
      .optional(),
    largura: z.number().int().positive().max(4097).optional(),
    altura: z.number().int().positive().max(4097).optional(),
  })
  .strict()
  .superRefine((a, ctx) => {
    const falhar = (message: string) => ctx.addIssue({ code: 'custom', message })
    if (a.mime === 'model/gltf-binary') {
      if (
        !a.caminho.endsWith('.glb') ||
        a.malhas === undefined ||
        a.triangulos === undefined ||
        a.verticesMaximos === undefined
      )
        falhar('O arquivo GLB precisa de extensão e medidas reais de malha.')
      if (!['modelo', 'terreno', 'agua', 'caminho', 'colisao'].includes(a.papel))
        falhar('O papel do arquivo GLB é incompatível.')
      if (a.largura !== undefined || a.altura !== undefined)
        falhar('Dimensões de imagem não pertencem ao arquivo GLB.')
    } else if (a.mime === 'image/png' || a.mime === 'image/webp') {
      if (a.largura === undefined || a.altura === undefined)
        falhar('A imagem compilada precisa de dimensões.')
      if (!a.caminho.endsWith(a.mime === 'image/png' ? '.png' : '.webp'))
        falhar('A extensão da imagem compilada é incompatível.')
      if (!['alturas', 'pintura', 'ceu', 'textura'].includes(a.papel))
        falhar('O papel da imagem compilada é incompatível.')
      if (
        a.papel !== 'alturas' &&
        a.largura !== undefined &&
        a.altura !== undefined &&
        (a.largura > 4096 || a.altura > 4096 || a.largura * a.altura > 8388608)
      )
        falhar('A imagem compilada excede o limite de pixels.')
    } else {
      if (!['alturas', 'buracos'].includes(a.papel) || !a.caminho.endsWith('.bin'))
        falhar('O arquivo binário compilado tem papel ou extensão incompatível.')
      if (a.largura !== undefined || a.altura !== undefined)
        falhar('Dimensões de imagem não pertencem ao campo binário.')
    }
    if (
      a.mime !== 'model/gltf-binary' &&
      (a.malhas !== undefined || a.triangulos !== undefined || a.verticesMaximos !== undefined)
    )
      falhar('Medidas de malha não pertencem à imagem ou ao campo binário.')
  })
export const NoCompiladoSchema = z
  .object({
    id: IdentificadorDeCenarioSchema,
    entidade: IdentificadorDeCenarioSchema.nullable(),
    arquivo: CaminhoCompiladoSchema,
    matriz: MatrizCompiladaSchema,
    volume: VolumeCompiladoSchema,
  })
  .strict()
export const ColisaoCompiladaSchema = z
  .object({
    id: IdentificadorDeCenarioSchema,
    entidade: IdentificadorDeCenarioSchema.nullable(),
    arquivo: CaminhoCompiladoSchema,
    matriz: MatrizCompiladaSchema,
    volume: VolumeCompiladoSchema,
    tipo: z.enum(['caixa', 'capsula', 'malha', 'terreno', 'agua', 'caminho']),
  })
  .strict()
export type ArquivoCompilado = z.infer<typeof ArquivoCompiladoSchema>
