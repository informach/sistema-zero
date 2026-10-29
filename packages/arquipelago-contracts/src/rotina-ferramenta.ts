import { z } from 'zod'
import { CartasDoJogadorSchema } from './api'
import { cartasNaMao, validarRotina } from './rotina-validacao'
import { contarCartoes, LIMITES_DA_ROTINA, RotinaSchema } from './rotinas'
import { CanteiroSchema, LUMIS, ProjetoAzulV15Schema } from './salvamento'

export const VERSAO_FERRAMENTA_ROTINA = 1
/** Um início vazio pode abrir no editor, mas nunca é aceito como rotina guardada. */
export const RascunhoInicialDaRotinaSchema = z.union([
  RotinaSchema,
  z.tuple([z.strictObject({ c: z.enum(['quando-amanhecer', 'quando-anoitecer']) })]),
])
export const MundoDaRotinaSchema = z
  .strictObject({
    horta: z.array(CanteiroSchema).max(24),
    inventario: z.record(z.string().min(1).max(60), z.number().int().min(0).max(999)),
    geladeira: ProjetoAzulV15Schema.nullable(),
    geladeiraPosta: z.boolean(),
  })
  .refine((m) => !m.geladeiraPosta || m.geladeira !== null, 'geladeira ausente')

/** Dados transitórios da abertura. Nada deste molde aumenta o salvamento V10. */
export const MoldeDaRotinaSchema = z.strictObject({
  versao: z.literal(VERSAO_FERRAMENTA_ROTINA),
  abertura: z.uuid(),
  lumi: z.enum(LUMIS),
  rotina: RascunhoInicialDaRotinaSchema.nullable(),
  outrosCartoes: z.number().int().min(0).max(LIMITES_DA_ROTINA.cartoesNasRotinas),
  cartas: CartasDoJogadorSchema.nullable(),
  mundo: MundoDaRotinaSchema,
  agora: z.iso.datetime({ offset: true }),
})
export type MoldeDaRotina = z.infer<typeof MoldeDaRotinaSchema>

export const ResultadoDaFerramentaRotinaSchema = z.strictObject({
  versao: z.literal(VERSAO_FERRAMENTA_ROTINA),
  abertura: z.uuid(),
  lumi: z.enum(LUMIS),
  rotina: RotinaSchema,
})
export type ResultadoDaFerramentaRotina = z.infer<typeof ResultadoDaFerramentaRotinaSchema>

/** Mesmo boundary na plataforma real, na falsa e na recepção pelo jogo. */
export function conferirResultadoDaRotina(
  molde: MoldeDaRotina,
  resultado: unknown,
): { resultado: ResultadoDaFerramentaRotina } | { motivo: string } {
  const r = ResultadoDaFerramentaRotinaSchema.safeParse(resultado)
  if (!r.success || r.data.abertura !== molde.abertura || r.data.lumi !== molde.lumi)
    return { motivo: 'A resposta não pertence a esta rotina. Abra o editor novamente.' }
  const recusa = validarRotina(r.data.rotina, cartasNaMao(molde.cartas))
  if (recusa) return recusa
  if (contarCartoes(r.data.rotina) + molde.outrosCartoes > LIMITES_DA_ROTINA.cartoesNasRotinas)
    return { motivo: 'As rotinas juntas têm até 32 blocos. Tire blocos desta ou de outra rotina.' }
  return { resultado: r.data }
}
