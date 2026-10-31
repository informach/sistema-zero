import { GALERIA, IDS_DA_GALERIA, type IdDaGaleria } from '@sistemazero/arquipelago-contracts'
import { semanaDoJogo } from './semana'

export const PAINEL_DA_FEIRA = 'feira-da-vila'
export const ANCORA_DA_FEIRA = 'barraca-6'
/** Só a vitrine muda. Preço, posse e cobrança continuam no catálogo e serviço existentes. */
export function vitrineDaSemana(
  agora: Date,
): { semana: string; destaques: IdDaGaleria[]; demais: IdDaGaleria[] } | null {
  const semana = semanaDoJogo(agora)
  if (!semana) return null
  const inicio =
    (((semana.numero * 3) % IDS_DA_GALERIA.length) + IDS_DA_GALERIA.length) % IDS_DA_GALERIA.length
  const destaques = Array.from(
    { length: Math.min(3, IDS_DA_GALERIA.length) },
    (_, i) => IDS_DA_GALERIA[(inicio + i) % IDS_DA_GALERIA.length]!,
  )
  return {
    semana: semana.inicio,
    destaques,
    demais: IDS_DA_GALERIA.filter((id) => !destaques.includes(id)),
  }
}
export function podeVerAparenciaNaFeira(
  id: IdDaGaleria,
  projetos: Readonly<Record<string, unknown>>,
): boolean {
  return Object.hasOwn(projetos, GALERIA[id].objeto) && projetos[GALERIA[id].objeto] != null
}
