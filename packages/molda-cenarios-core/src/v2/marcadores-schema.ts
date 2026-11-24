import { z } from 'zod'
import { PontoSchema, VetorSchema } from '../documento'
import { poligonoSimples } from '../validacao'
import { DirecaoDeLuzSchema, LuzLocalSchema } from './iluminacao'

const tamanho = z.number().finite().min(0.01).max(10_000)
export const FormaDeZonaSchema = z.discriminatedUnion('tipo', [
  z
    .object({
      tipo: z.literal('caixa'),
      tamanho: z.object({ x: tamanho, y: tamanho, z: tamanho }).strict(),
    })
    .strict(),
  z.object({ tipo: z.literal('esfera'), raio: tamanho }).strict(),
  z
    .object({
      tipo: z.literal('poligono'),
      pontos: z
        .array(PontoSchema)
        .min(3)
        .max(128)
        .refine(poligonoSimples, 'A zona precisa de um polígono simples.'),
      altura: tamanho,
    })
    .strict(),
])
const RotaSchema = z
  .object({
    tipo: z.literal('rota'),
    /** Controles locais em metros. A posição e o giro pertencem ao marcador. */
    pontos: z.array(VetorSchema).min(2).max(512),
    fechada: z.boolean(),
    seguirTerreno: z.boolean(),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.fechada && v.pontos.length < 3)
      ctx.addIssue({ code: 'custom', message: 'A rota fechada precisa de três controles.' })
    for (let i = 1; i < v.pontos.length + (v.fechada ? 1 : 0); i++) {
      const a = v.pontos[i - 1]!,
        b = v.pontos[i % v.pontos.length]!
      if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) <= 1e-6)
        ctx.addIssue({
          code: 'custom',
          message: 'A rota contém controles consecutivos iguais.',
          path: ['pontos', i % v.pontos.length],
        })
      if (v.seguirTerreno && Math.hypot(a.x - b.x, a.z - b.z) <= 1e-6)
        ctx.addIssue({
          code: 'custom',
          message: 'A rota no terreno precisa avançar também no chão.',
          path: ['pontos', i % v.pontos.length],
        })
    }
  })
export const ConfiguracaoDeMarcadorSchema = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('ponto') }).strict(),
  z.object({ tipo: z.literal('inicio'), principal: z.boolean() }).strict(),
  z.object({ tipo: z.literal('zona'), forma: FormaDeZonaSchema }).strict(),
  RotaSchema,
  z
    .object({
      tipo: z.literal('camera'),
      alvo: DirecaoDeLuzSchema,
      campoDeVisao: z.number().finite().min(15).max(100),
    })
    .strict(),
  z.object({ tipo: z.literal('luz'), luz: LuzLocalSchema }).strict(),
  z
    .object({
      tipo: z.literal('regua'),
      fim: VetorSchema.refine(
        (p) => Math.hypot(p.x, p.y, p.z) > 1e-6,
        'Escolha dois pontos diferentes para a régua.',
      ),
    })
    .strict(),
  z.object({ tipo: z.literal('escala'), altura: z.number().finite().min(0.1).max(10) }).strict(),
])
export type ConfiguracaoDeMarcador = z.infer<typeof ConfiguracaoDeMarcadorSchema>
export type FormaDeZona = z.infer<typeof FormaDeZonaSchema>
