export interface SplitReply {
  visible: string
  quoted: string | null
}

const ATTRIBUTION_PT = /^\s*Em .+escreveu:\s*$/i
const ATTRIBUTION_EN = /^\s*On .+wrote:\s*$/i
const ORIGINAL_MESSAGE = /^\s*-{2,}\s*(Original Message|Mensagem original)\s*-{2,}\s*$/i
const QUOTED_LINE = /^\s*>/

/** Separa a resposta nova do histórico anexado por Gmail/Outlook. */
export function splitQuotedReply(bodyText: string): SplitReply {
  if (!bodyText) return { visible: bodyText, quoted: null }

  const lines = bodyText.split(/\r?\n/)
  let cut = -1
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? ''
    if (ATTRIBUTION_PT.test(line) || ATTRIBUTION_EN.test(line) || ORIGINAL_MESSAGE.test(line)) {
      cut = index
      break
    }
    if (QUOTED_LINE.test(line)) {
      const previous = index > 0 ? (lines[index - 1] ?? '') : ''
      if (index === 0 || previous.trim() === '') {
        cut = index
        break
      }
    }
  }

  if (cut === -1) return { visible: bodyText, quoted: null }
  const visible = lines.slice(0, cut).join('\n').trim()
  const quoted = lines.slice(cut).join('\n').trim()
  return { visible, quoted: quoted || null }
}

/** Forma estreita usada nos prompts, sem carregar o trecho citado. */
export function stripQuotedHistory(bodyText: string): string {
  return splitQuotedReply(bodyText).visible.trim()
}
