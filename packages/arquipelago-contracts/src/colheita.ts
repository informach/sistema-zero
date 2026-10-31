import { z } from 'zod'
import { CLIMAS_DO_JOGO, type Salvamento, type Semente } from './salvamento'

export type Humor = 'otimo' | 'bem' | 'cansado'
export function humor(n: Salvamento['necessidades']): Humor {
  if (n.energia < 15 || n.fome < 15) return 'cansado'
  if (n.fome > 60 && n.energia > 60 && n.diversao > 60) return 'otimo'
  return 'bem'
}

/** Contexto do instante da colheita. No editor é uma cópia da abertura, nunca o jogo vivo. */
export const ContextoDaColheitaSchema = z.strictObject({
  clima: z.enum(CLIMAS_DO_JOGO).nullable(),
  necessidades: z.strictObject({
    fome: z.number().min(0).max(100),
    energia: z.number().min(0).max(100),
    diversao: z.number().min(0).max(100),
  }),
})
export type ContextoDaColheita = z.infer<typeof ContextoDaColheitaSchema>

export const COLHEITA_FAVORECIDA = { sol: 'tomate', nublado: 'alface', chuva: 'milho' } as const

/** Só acrescenta. O rendimento básico não depende de estar presente ou manter humor alto. */
export function bonusDaColheita(semente: Semente, contexto?: ContextoDaColheita) {
  return {
    clima: contexto?.clima && COLHEITA_FAVORECIDA[contexto.clima] === semente ? 1 : 0,
    humor: contexto && humor(contexto.necessidades) === 'otimo' ? 1 : 0,
  }
}

export function fraseDaColheitaEspecial(bonus: { clima: number; humor: number }): string {
  if (bonus.clima && bonus.humor)
    return ' Colheita especial: mais um pelo clima e mais um pelo humor ótimo.'
  if (bonus.clima) return ' Colheita especial: mais um pelo clima.'
  if (bonus.humor) return ' Colheita especial: mais um pelo humor ótimo.'
  return ''
}
