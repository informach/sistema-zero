import {
  CANTEIROS_DO_CEU,
  MINUTO_ZERO_DO_CEU,
  type PlantaDoCeu,
  SEMENTES_DO_CEU,
  type SementeDoCeu,
} from './salvamento'

const MINUTO = 60 * 1000
const HORA = 60 * MINUTO

/**
 * O jardim do céu, nas Nuvens (B6, 31/10/2026; a proposta: "Jardim do céu, controlar o clima da
 * sua ilha, fazer a ilha florescer"). Seis canteiros no terraço; lá em cima a chuva das nuvens rega,
 * então plantar já começa a crescer, no tempo de verdade e no ritmo da horta. A flor colhida vai
 * para a sua ilha: cada uma soma na `florada`, e a ilha floresce aos poucos.
 */
export const CRESCIMENTO_DO_CEU_MS: Readonly<Record<SementeDoCeu, number>> = {
  'flor-de-nuvem': 4 * HORA,
  'estrela-trepadeira': 8 * HORA,
  'arco-iris-de-petala': 16 * HORA,
}

export type EstagioDoCeu = 'vazio' | 'broto' | 'crescendo' | 'flor'

/** O minuto do salvamento (contado de `MINUTO_ZERO_DO_CEU`) para um instante. */
export function minutoDoCeu(agoraMs: number): number {
  return Math.max(0, Math.floor((agoraMs - MINUTO_ZERO_DO_CEU) / MINUTO))
}

/** A planta de um canteiro (1 a 6), ou `null` se ele está vazio. */
export function plantaNoCanteiro(
  ceu: readonly PlantaDoCeu[],
  canteiro: number,
): { semente: SementeDoCeu; plantadaMs: number } | null {
  const p = ceu.find((x) => x[0] === canteiro)
  const semente = p && SEMENTES_DO_CEU[p[1]]
  return p && semente ? { semente, plantadaMs: MINUTO_ZERO_DO_CEU + p[2] * MINUTO } : null
}

/** De 0 (acabou de plantar) a 1 (flor aberta). */
export function progressoNoCeu(ceu: readonly PlantaDoCeu[], canteiro: number, agoraMs: number) {
  const p = plantaNoCanteiro(ceu, canteiro)
  if (!p) return 0
  return Math.max(0, Math.min(1, (agoraMs - p.plantadaMs) / CRESCIMENTO_DO_CEU_MS[p.semente]))
}

export function estagioNoCeu(
  ceu: readonly PlantaDoCeu[],
  canteiro: number,
  agoraMs: number,
): EstagioDoCeu {
  if (!plantaNoCanteiro(ceu, canteiro)) return 'vazio'
  const p = progressoNoCeu(ceu, canteiro, agoraMs)
  if (p >= 1) return 'flor'
  return p < 0.4 ? 'broto' : 'crescendo'
}

/** Plantar num canteiro vazio. Devolve a lista nova, ou `null` se não dá. */
export function plantarNoCeu(
  ceu: readonly PlantaDoCeu[],
  canteiro: number,
  semente: SementeDoCeu,
  agoraMs: number,
): PlantaDoCeu[] | null {
  if (canteiro < 1 || canteiro > CANTEIROS_DO_CEU || plantaNoCanteiro(ceu, canteiro)) return null
  return [...ceu, [canteiro, SEMENTES_DO_CEU.indexOf(semente), minutoDoCeu(agoraMs)]]
}

/** Colher a flor aberta: o canteiro esvazia e a flor vai para a florada. */
export function colherNoCeu(
  ceu: readonly PlantaDoCeu[],
  canteiro: number,
  agoraMs: number,
): { ceu: PlantaDoCeu[]; semente: SementeDoCeu } | null {
  const p = plantaNoCanteiro(ceu, canteiro)
  if (!p || estagioNoCeu(ceu, canteiro, agoraMs) !== 'flor') return null
  return { ceu: ceu.filter((x) => x[0] !== canteiro), semente: p.semente }
}

/** Os níveis da florada da sua ilha (`florada.glb`, `florada-1` a `-3`) pelas flores mandadas. */
export const FLORES_DA_FLORADA = [1, 6, 15] as const

/** O nível da florada (0 a 3) com tantas flores do céu mandadas para a sua ilha. */
export function nivelDaFlorada(flores: number): number {
  return FLORES_DA_FLORADA.filter((n) => flores >= n).length
}
