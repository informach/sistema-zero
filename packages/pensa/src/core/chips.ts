/**
 * Convenção de CHIPS do chat (contrato): toda resposta do agente termina com
 * UMA linha `SUGESTÕES: opção um | opção dois | opção três`. Este módulo é
 * PURO: separa o texto exibível das sugestões e esconde a linha (inclusive
 * parcial) durante o streaming. Nada de rede/estado aqui.
 */

const CHIP_MARKER = 'SUGESTÕES:'

export interface SplitChipsResult {
  /** Conteúdo da bolha SEM a(s) linha(s) de sugestões. */
  display: string
  /** Sugestões da ÚLTIMA linha marcada (2 a 4 no contrato; vazio se ausente). */
  chips: string[]
}

function parseChipLine(line: string): string[] {
  const raw = line.trimStart().slice(CHIP_MARKER.length)
  const chips: string[] = []
  for (const part of raw.split('|')) {
    const chip = part.trim()
    if (chip) chips.push(chip)
  }
  return chips
}

/** Separa o texto exibível das sugestões (a linha `SUGESTÕES:` NUNCA aparece na bolha). */
export function splitChips(content: string): SplitChipsResult {
  const lines = content.split('\n')
  const kept: string[] = []
  let chips: string[] = []
  for (const line of lines) {
    if (line.trimStart().startsWith(CHIP_MARKER)) {
      chips = parseChipLine(line)
    } else {
      kept.push(line)
    }
  }
  return { display: kept.join('\n').trimEnd(), chips }
}

/**
 * Versão para o STREAMING: oculta qualquer linha que comece com `SUGESTÕES:`
 * e também uma última linha que seja um prefixo do marcador (a linha pode
 * chegar cortada no meio, ex.: "SUGEST"). O parse final fica no `done`.
 */
export function hideChipLines(text: string): string {
  const lines = text.split('\n')
  const kept = lines.filter((line, index) => {
    const trimmed = line.trimStart()
    if (trimmed.startsWith(CHIP_MARKER)) return false
    const isLast = index === lines.length - 1
    if (isLast && trimmed.length > 0 && CHIP_MARKER.startsWith(trimmed)) return false
    return true
  })
  return kept.join('\n').trimEnd()
}
