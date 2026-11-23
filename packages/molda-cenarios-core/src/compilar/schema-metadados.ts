import { z } from 'zod'
import { VistaDeCameraSchema } from '../v2/camera'
import { IdentificadorDeCenarioSchema, PropriedadesSchema } from '../v2/entidades-schema'
import { ConfiguracaoDeMarcadorSchema } from '../v2/marcadores-schema'
import { BaseDeTerrenoSchema } from '../v2/terreno'
import {
  CaminhoCompiladoSchema,
  MatrizCompiladaSchema,
  PontoCompiladoSchema,
  VolumeCompiladoSchema,
} from './schema-arquivos'

export const EntidadeCompiladaSchema = z
  .object({
    id: IdentificadorDeCenarioSchema,
    nome: z.string().min(1).max(120),
    tipo: z.enum(['objeto', 'grupo', 'montagem', 'agua', 'caminho', 'marcador']),
    grupo: IdentificadorDeCenarioSchema.nullable(),
    propriedades: PropriedadesSchema.optional(),
    /** Âncora preservada mesmo quando a representação estática é agrupada no destino. */
    matriz: MatrizCompiladaSchema.optional(),
    volume: VolumeCompiladoSchema.optional(),
    oculto: z.boolean().default(false),
  })
  .strict()
export type EntidadeCompilada = z.infer<typeof EntidadeCompiladaSchema>
export const RotaCompiladaSchema = z
  .object({
    pontos: z.array(PontoCompiladoSchema).min(2).max(16_384),
    distancias: z.array(z.number().finite().nonnegative().max(1e9)).min(2).max(16_384),
    comprimento: z.number().finite().positive().max(1e9),
    fechada: z.boolean(),
  })
  .strict()
  .superRefine((r, ctx) => {
    const inicio = r.pontos[0],
      fim = r.pontos.at(-1)
    if (
      r.fechada &&
      inicio &&
      fim &&
      Math.hypot(fim.x - inicio.x, fim.y - inicio.y, fim.z - inicio.z) > 1e-6
    )
      ctx.addIssue({ code: 'custom', message: 'A rota fechada precisa terminar no ponto inicial.' })
    if (
      r.distancias.length !== r.pontos.length ||
      r.distancias[0] !== 0 ||
      Math.abs(r.distancias.at(-1)! - r.comprimento) > 1e-6 ||
      r.distancias.some((d, i) => i > 0 && d < r.distancias[i - 1]!)
    )
      ctx.addIssue({
        code: 'custom',
        message: 'As distâncias da rota compilada são inconsistentes.',
      })
    for (let i = 1; i < r.pontos.length; i++) {
      const a = r.pontos[i - 1]!,
        b = r.pontos[i]!,
        comprimento = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)
      if (
        Math.abs(r.distancias[i]! - r.distancias[i - 1]! - comprimento) >
        1e-6 * Math.max(1, comprimento)
      ) {
        ctx.addIssue({
          code: 'custom',
          message: 'As distâncias da rota não correspondem aos pontos compilados.',
        })
        break
      }
    }
  })
export const MarcadorCompiladoSchema = z
  .object({
    id: IdentificadorDeCenarioSchema,
    nome: z.string().min(1).max(120),
    posicao: PontoCompiladoSchema,
    giro: z.number().finite(),
    objeto: IdentificadorDeCenarioSchema.nullable(),
    propriedades: PropriedadesSchema.optional(),
    configuracao: ConfiguracaoDeMarcadorSchema.optional(),
    rota: RotaCompiladaSchema.optional(),
    camera: VistaDeCameraSchema.optional(),
  })
  .strict()
  .superRefine((m, ctx) => {
    if ((m.configuracao?.tipo === 'rota') !== Boolean(m.rota))
      ctx.addIssue({
        code: 'custom',
        message: 'O marcador precisa do trajeto compilado correspondente à sua configuração.',
      })
    if ((m.configuracao?.tipo === 'camera') !== Boolean(m.camera))
      ctx.addIssue({
        code: 'custom',
        message: 'O marcador precisa da vista de câmera compilada correspondente.',
      })
    if (m.configuracao?.tipo === 'rota' && m.rota && m.configuracao.fechada !== m.rota.fechada)
      ctx.addIssue({ code: 'custom', message: 'O fechamento da rota compilada é inconsistente.' })
    if (
      m.configuracao?.tipo === 'camera' &&
      m.camera &&
      (m.configuracao.campoDeVisao !== m.camera.campoDeVisao ||
        (['x', 'y', 'z'] as const).some(
          (e) => Math.abs(m.posicao[e] - m.camera!.posicao[e]) > 1e-6,
        ))
    )
      ctx.addIssue({
        code: 'custom',
        message: 'A posição ou o campo de visão da câmera compilada é inconsistente.',
      })
  })
export type MarcadorCompilado = z.infer<typeof MarcadorCompiladoSchema>
const ponto2 = z
  .object({ x: z.number().finite().min(-1e9).max(1e9), z: z.number().finite().min(-1e9).max(1e9) })
  .strict()
const corHex = z.string().regex(/^#[a-fA-F0-9]{6}$/)
/**
 * Uma camada do chão do relevo "campo" (plano "Mundos de 2 km", lote 2, 23/11/2026): a cor, a
 * textura repetida em metros e a cor MÉDIA da textura (quem não mistura texturas, o Python, pinta
 * cada vértice com peso × cor × cor média).
 */
export const CamadaDoRelevoSchema = z
  .object({
    id: z.string().min(1).max(240),
    cor: corHex,
    textura: z
      .object({
        id: IdentificadorDeCenarioSchema,
        repeticaoMetros: z.number().finite().min(0.1).max(100),
      })
      .strict()
      .optional(),
    corMedia: corHex,
  })
  .strict()
export type CamadaDoRelevo = z.infer<typeof CamadaDoRelevoSchema>
/**
 * O relevo como CAMPO (plano "Mundos de 2 km"): o pacote leva só as alturas e os pesos das camadas
 * (um PNG RGBA por quatro camadas, um pixel por vértice da grade); o jogo desenha o relevo em
 * pedaços, com menos detalhe longe, e a colisão lê as alturas. Sem lotes de terreno nem colisão do
 * chão no pacote. Sem este campo, o terreno é o de sempre (lotes e colisão compilados).
 */
export const RelevoCompiladoSchema = z
  .object({
    tipo: z.literal('campo'),
    pesos: z.array(CaminhoCompiladoSchema).min(1).max(2),
    camadas: z.array(CamadaDoRelevoSchema).min(1).max(8),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.pesos.length !== Math.ceil(r.camadas.length / 4))
      ctx.addIssue({
        code: 'custom',
        message: 'O relevo precisa de um arquivo de pesos para cada quatro camadas.',
      })
    if (new Set(r.camadas.map((c) => c.id)).size !== r.camadas.length)
      ctx.addIssue({ code: 'custom', message: 'Há uma camada repetida no relevo.' })
  })
export type RelevoCompilado = z.infer<typeof RelevoCompiladoSchema>
export const TerrenoCompiladoSchema = z
  .object({
    origem: ponto2,
    passo: z.number().finite().min(0.25).max(32),
    colunas: z.number().int().min(64).max(4096).multipleOf(64),
    linhas: z.number().int().min(64).max(4096).multipleOf(64),
    min: z.number().finite().min(-10_000).max(10_000),
    max: z.number().finite().min(-10_000).max(10_000),
    fundo: z.number().finite().min(-10_000).max(10_000),
    cobertura: z.enum(['grade', 'pecas']),
    pecas: z
      .array(
        z
          .object({ coluna: z.number().int().nonnegative(), linha: z.number().int().nonnegative() })
          .strict(),
      )
      .max(4096),
    recortes: z.array(z.array(ponto2).min(3).max(4096)).max(128),
    alturas: CaminhoCompiladoSchema,
    pngAlturas: CaminhoCompiladoSchema,
    buracos: CaminhoCompiladoSchema.optional(),
    relevo: RelevoCompiladoSchema.optional(),
  })
  .strict()
  .superRefine((t, ctx) => {
    if (t.relevo && (t.cobertura !== 'grade' || t.recortes.length > 0))
      ctx.addIssue({
        code: 'custom',
        message:
          'O relevo em campo só vale para o terreno que ocupa a grade inteira, sem recortes.',
        path: ['relevo'],
      })
    // Os mesmos limites/domínio da autoria, sem uma segunda definição de terreno.
    const base = BaseDeTerrenoSchema.safeParse({
      tipo: 'terreno',
      origem: t.origem,
      passo: t.passo,
      colunas: t.colunas,
      linhas: t.linhas,
      min: t.min,
      max: t.max,
      fundo: t.fundo,
      ...(t.cobertura === 'grade' ? { cobertura: 'grade' } : {}),
      pecas: t.pecas.map((p) => ({ ...p, digest: '0'.repeat(64) })),
      recortes: t.recortes,
    })
    if (!base.success)
      for (const i of base.error.issues)
        ctx.addIssue({ code: 'custom', message: i.message, path: i.path })
  })
export type TerrenoCompilado = z.infer<typeof TerrenoCompiladoSchema>
