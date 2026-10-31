import { diaDeSaoPaulo } from '@sistemazero/arquipelago-contracts'

const DIA_MS = 86_400_000
/** Segunda-feira de referência dos catálogos editoriais V1, sem reinício em janeiro. */
const REFERENCIA = Date.UTC(2026, 9, 26)

export function semanaDoJogo(agora: Date): { inicio: string; numero: number } | null {
  if (!Number.isFinite(agora.getTime())) return null
  const data = new Date(`${diaDeSaoPaulo(agora)}T12:00:00Z`)
  const civil = Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate())
  const segunda = civil - ((data.getUTCDay() + 6) % 7) * DIA_MS
  return {
    inicio: new Date(segunda).toISOString().slice(0, 10),
    numero: Math.round((segunda - REFERENCIA) / (7 * DIA_MS)),
  }
}
