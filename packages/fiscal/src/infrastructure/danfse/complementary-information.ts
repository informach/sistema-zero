import type { DanfseData } from '../../domain/danfse/danfse-data'
import { formatXmlDecimalBrl } from '../../domain/money'

const TOTALS_PREFIX = 'Totais Aproximados dos Tributos cfe. Lei nº 12.741/2012:'

/**
 * Monta as informações complementares na ordem da tabela 2.4.5 da NT 008/2026.
 * A linha de totais é obrigatória e sempre expõe as três esferas. `pTotTribSN`
 * é um total único do Simples Nacional e não pode ser atribuído a uma esfera;
 * por isso, sem os campos discriminados, as três posições recebem o traço da
 * nota 12 em vez de um percentual fiscalmente incorreto.
 */
export function buildComplementaryInformation(data: DanfseData): string[] {
  const lines: string[] = []
  if (data.chSubstda) lines.push(`NFS-e Subst.: ${data.chSubstda}`)

  const v = data.valores
  const hasMonetary = Boolean(v.vTotTribFed || v.vTotTribEst || v.vTotTribMun)
  const hasPercent = Boolean(v.pTotTribFed || v.pTotTribEst || v.pTotTribMun)
  const format = hasMonetary ? formatXmlDecimalBrl : hasPercent ? formatPercent : () => null
  const federal = format(hasMonetary ? v.vTotTribFed : v.pTotTribFed) ?? '-'
  const state = format(hasMonetary ? v.vTotTribEst : v.pTotTribEst) ?? '-'
  const municipal = format(hasMonetary ? v.vTotTribMun : v.pTotTribMun) ?? '-'

  lines.push(
    `${TOTALS_PREFIX} Federais: ${federal} ; Estaduais: ${state} ; Municipais: ${municipal}`,
  )
  return lines
}

function formatPercent(value: string | null): string | null {
  if (!value || !/^-?\d+(?:\.\d+)?$/.test(value)) return null
  return `${value.replace('.', ',')}%`
}
