import { z } from 'zod'
import { CasaDoIrmaoSchema } from './familia'

/**
 * Visitas de outras crianças (N08a, 30/10/2026): "No Kids, só família, a menos que os pais
 * liberem" (ECA Digital, art. 21). O responsável da criança anfitriã gera um código; o responsável
 * da outra família aceita com um apelido. A criança nunca digita código e não existe diretório.
 * Nomes não atravessam: o apelido é escrito pela família que visita.
 */
export const VERSAO_DAS_VISITAS_DE_AMIGOS = 1

/** O código: 32 caracteres base64url (192 bits). O serviço guarda só o SHA-256. */
export const CodigoDeAmigoSchema = z.string().regex(/^[A-Za-z0-9_-]{32}$/)

/** O apelido que a família visitante dá à casa: curto, sem quebra de linha nem sinais de código. */
export const ApelidoDeCasaSchema = z
  .string()
  .trim()
  .min(1)
  .max(24)
  .regex(/^[\p{L}\p{N} .'-]+$/u)

/** Na área dos pais: quais crianças têm convite ativo e as casas que a família aceitou. */
export const AmigosDaFamiliaSchema = z.strictObject({
  versao: z.literal(VERSAO_DAS_VISITAS_DE_AMIGOS),
  /** Com "Visitas de outras crianças" desligado, nada vale (`desligado`). */
  situacao: z.enum(['ok', 'desligado']),
  convites: z.array(z.strictObject({ perfilId: z.uuid(), ativo: z.boolean() })).max(20),
  casas: z.array(z.strictObject({ id: z.uuid(), apelido: ApelidoDeCasaSchema })).max(20),
})
export type AmigosDaFamilia = z.infer<typeof AmigosDaFamiliaSchema>

/** O mesmo, com o nome de cada criança que o BFF põe (da grade do Auth, nunca do serviço). */
export const AmigosDaFamiliaParaOsPaisSchema = AmigosDaFamiliaSchema.extend({
  convites: z
    .array(
      z.strictObject({ perfilId: z.uuid(), ativo: z.boolean(), nome: z.string().min(1).max(80) }),
    )
    .max(20),
})
export type AmigosDaFamiliaParaOsPais = z.infer<typeof AmigosDaFamiliaParaOsPaisSchema>

export const PedidoDeConviteDeAmigoSchema = z.strictObject({ perfilId: z.uuid() })
export const ConviteDeAmigoGeradoSchema = z.strictObject({
  versao: z.literal(VERSAO_DAS_VISITAS_DE_AMIGOS),
  perfilId: z.uuid(),
  codigo: CodigoDeAmigoSchema,
})
export const PedidoDeAceiteSchema = z.strictObject({
  codigo: CodigoDeAmigoSchema,
  apelido: ApelidoDeCasaSchema,
})
export const CasaAceitaSchema = z.strictObject({
  versao: z.literal(VERSAO_DAS_VISITAS_DE_AMIGOS),
  id: z.uuid(),
  apelido: ApelidoDeCasaSchema,
})

/** Para a criança: as casas de amigos que a família dela aceitou e ainda valem. */
export const CasasDeAmigosSchema = z.strictObject({
  versao: z.literal(VERSAO_DAS_VISITAS_DE_AMIGOS),
  situacao: z.enum(['ok', 'desligado']),
  casas: z.array(z.strictObject({ id: z.uuid(), apelido: ApelidoDeCasaSchema })).max(20),
})
export type CasasDeAmigos = z.infer<typeof CasasDeAmigosSchema>

/** A casa de um amigo, só para ver: a mesma projeção da casa do irmão, sem o id de quem mora. */
export const CasaDeAmigoSchema = CasaDoIrmaoSchema.omit({ perfilId: true, versao: true }).extend({
  versao: z.literal(VERSAO_DAS_VISITAS_DE_AMIGOS),
  id: z.uuid(),
  apelido: ApelidoDeCasaSchema,
})
export type CasaDeAmigo = z.infer<typeof CasaDeAmigoSchema>

/** Quantas casas de amigos uma família guarda (e quantas crianças por pedido). */
export const CASAS_DE_AMIGOS_MAXIMO = 20
