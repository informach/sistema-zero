/**
 * Separa a resposta NOVA do histórico citado que os clientes de e-mail anexam
 * embaixo (Gmail: "Em <data> <fulano> escreveu:" + linhas com ">"). PURO
 * (unit-testado) — nunca lança; se nada casar, devolve o corpo inteiro visível.
 */

export interface SplitReply {
  /** Texto NOVO, acima do histórico (trimado). */
  visible: string
  /** Histórico citado, da linha de corte ao fim (trimado), ou `null` se não houver. */
  quoted: string | null
}

/** Atribuição do Gmail/Outlook: "Em <...> escreveu:" / "On <...> wrote:". */
const ATTRIBUTION_PT = /^\s*Em .+escreveu:\s*$/i
const ATTRIBUTION_EN = /^\s*On .+wrote:\s*$/i
/** Separador do Outlook: "-----Mensagem original-----" / "-----Original Message-----". */
const SEPARATOR = /^\s*-{2,}\s*(Original Message|Mensagem original)\s*-{2,}\s*$/i
/** Linha citada (começa com ">", tolera espaço à esquerda). */
const QUOTED_LINE = /^\s*>/

/**
 * Acha o PRIMEIRO índice onde o histórico citado começa e corta ali:
 * - linha de atribuição ("Em ... escreveu:" / "On ... wrote:"), OU
 * - separador "-----Mensagem original-----", OU
 * - início de um bloco contíguo de linhas ">" precedido por linha em branco.
 */
export function splitQuotedReply(bodyText: string): SplitReply {
  if (!bodyText) return { visible: bodyText, quoted: null }

  const lines = bodyText.split('\n')
  let cut = -1

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (ATTRIBUTION_PT.test(line) || ATTRIBUTION_EN.test(line) || SEPARATOR.test(line)) {
      cut = i
      break
    }
    // Bloco de citação: primeira linha ">" que começa o rabo citado. Aceita quando
    // é a 1ª linha do corpo (tudo citado) ou vem depois de uma linha em branco.
    if (QUOTED_LINE.test(line)) {
      const prev = i > 0 ? (lines[i - 1] ?? '') : ''
      if (i === 0 || prev.trim() === '') {
        cut = i
        break
      }
    }
  }

  if (cut === -1) return { visible: bodyText, quoted: null }

  const visible = lines.slice(0, cut).join('\n').trim()
  const quoted = lines.slice(cut).join('\n').trim()
  return { visible, quoted: quoted.length > 0 ? quoted : null }
}
