import { diaDeSaoPaulo } from '@sistemazero/arquipelago-contracts'

export interface ParcelaDeTempo {
  dia: string
  segundos: number
}

/**
 * Divide o tempo confirmado pelo servidor entre dias civis, limitado pela concessão.
 * O cursor conserva frações de segundo entre pulsos; uma sessão encerrada pode descartar
 * menos de um segundo. O limite da concessão impede cobrar tempo após a perda da conexão.
 */
export function dividirIntervaloDeTempo(
  cursor: Date,
  agora: Date,
  vencimento: Date,
): { parcelas: ParcelaDeTempo[]; cursor: Date } {
  const inicio = cursor.getTime()
  const fim = Math.max(inicio, Math.min(agora.getTime(), vencimento.getTime()))
  if (![inicio, fim, vencimento.getTime()].every(Number.isFinite))
    throw new Error('Intervalo de tempo inválido')
  const segundos = Math.floor((fim - inicio) / 1000)
  const parcelas: ParcelaDeTempo[] = []
  let primeiro = 0
  while (primeiro < segundos) {
    const dia = diaDeSaoPaulo(new Date(inicio + primeiro * 1000))
    let baixo = primeiro + 1
    let alto = segundos
    while (baixo < alto) {
      const meio = Math.floor((baixo + alto) / 2)
      if (diaDeSaoPaulo(new Date(inicio + meio * 1000)) === dia) baixo = meio + 1
      else alto = meio
    }
    parcelas.push({ dia, segundos: baixo - primeiro })
    primeiro = baixo
  }
  return { parcelas, cursor: new Date(inicio + segundos * 1000) }
}
