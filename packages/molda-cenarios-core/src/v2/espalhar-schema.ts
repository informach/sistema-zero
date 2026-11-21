import { z } from 'zod'
import { PontoSchema, VetorSchema } from '../documento'
import { EscalaSchema, InstanciaSchema } from './documento'

export const LIMITES_ESPALHAMENTO = {
  prototipos: 8,
  pontos: 512,
  objetos: 2000,
  tentativas: 100000,
  consultas: 2000000,
} as const

/** Preserva a identidade de cada variante, inclusive escala não uniforme e espelho. */
export const PrototipoDeEspalhamentoSchema = InstanciaSchema.pick({
  nome: true,
  modelo: true,
  colisao: true,
  espelho: true,
  aparencia: true,
  propriedades: true,
})
  .extend({ rotacao: VetorSchema, escala: EscalaSchema })
  .strict()

const id = z.string().min(1).max(240)
const DadosDaReceita = z
  .object({
    prototipos: z.array(PrototipoDeEspalhamentoSchema).min(1).max(LIMITES_ESPALHAMENTO.prototipos),
    traco: z.array(PontoSchema).min(1).max(LIMITES_ESPALHAMENTO.pontos),
    raio: z.number().finite().min(0.2).max(100),
    densidade: z.number().finite().min(0.1).max(1000),
    afastamento: z.number().finite().min(0.1).max(100),
    giro: z.number().finite().min(0).max(Math.PI),
    tamanhoMin: z.number().finite().min(0.01).max(10),
    tamanhoMax: z.number().finite().min(0.01).max(10),
    semente: z.number().int().min(0).max(0xffffffff),
    limite: z.number().int().min(1).max(LIMITES_ESPALHAMENTO.objetos),
    evitarObjetos: z.boolean(),
    /** As peças tomam a inclinação do relevo onde pousam (opcional: o formato só cresce). */
    inclinar: z.boolean().optional(),
    grupo: id.nullable(),
    camada: id.nullable(),
  })
  .strict()
const tamanhoValido = (r: {
  tamanhoMin: number
  tamanhoMax: number
  prototipos: Array<z.infer<typeof PrototipoDeEspalhamentoSchema>>
}) =>
  r.tamanhoMin <= r.tamanhoMax &&
  r.prototipos.every((p) => Object.values(p.escala).every((v) => v * r.tamanhoMax <= 100))
const mensagemDeTamanho = 'Confira os limites de tamanho e a escala dos modelos'
export const ReceitaDeEspalhamentoSchema = DadosDaReceita.refine(tamanhoValido, mensagemDeTamanho)
export const OpcoesDeEspalhamentoSchema = DadosDaReceita.omit({ traco: true }).refine(
  tamanhoValido,
  mensagemDeTamanho,
)
export type OpcoesDeEspalhamento = z.infer<typeof OpcoesDeEspalhamentoSchema>

export const AmostraDeEspalhamentoSchema = PontoSchema.extend({
  id,
  prototipo: z
    .number()
    .int()
    .min(0)
    .max(LIMITES_ESPALHAMENTO.prototipos - 1),
  giro: z.number().finite().min(-Math.PI).max(Math.PI),
  fator: z.number().finite().positive().max(10),
}).strict()
export const PinceladaDeObjetosSchema = z
  .object({
    receita: ReceitaDeEspalhamentoSchema,
    amostras: z.array(AmostraDeEspalhamentoSchema).min(1).max(LIMITES_ESPALHAMENTO.objetos),
  })
  .strict()
export type ReceitaDeEspalhamento = z.infer<typeof ReceitaDeEspalhamentoSchema>
export type PrototipoDeEspalhamento = z.infer<typeof PrototipoDeEspalhamentoSchema>
export type AmostraDeEspalhamento = z.infer<typeof AmostraDeEspalhamentoSchema>
export type AmostraSemId = Omit<AmostraDeEspalhamento, 'id'>
export type PinceladaDeObjetos = z.infer<typeof PinceladaDeObjetosSchema>
