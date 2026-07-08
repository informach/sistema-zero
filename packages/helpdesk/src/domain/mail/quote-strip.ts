/**
 * Remove o histórico citado do corpo de um e-mail, deixando só a mensagem nova.
 * PURO. Usado p/ montar o prompt da IA (o corpo INTEIRO segue persistido; isto
 * é só p/ dar à IA o texto relevante). Espelha o lib/quote.ts do helpdesk-app.
 */
const ATTRIBUTION_PT = /^\s*Em .+escreveu:\s*$/i
const ATTRIBUTION_EN = /^\s*On .+wrote:\s*$/i
const ORIGINAL_MESSAGE = /^\s*-{2,}\s*(Original Message|Mensagem original)\s*-{2,}\s*$/i

export function stripQuotedHistory(bodyText: string): string {
  const lines = bodyText.split(/\r?\n/)
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''
    if (ATTRIBUTION_PT.test(line) || ATTRIBUTION_EN.test(line) || ORIGINAL_MESSAGE.test(line)) {
      return lines.slice(0, i).join('\n').trim()
    }
    // Bloco citado (`>`) iniciando a cauda: linha 0 ou precedida de linha em branco.
    if (line.startsWith('>') && (i === 0 || (lines[i - 1] ?? '').trim() === '')) {
      return lines.slice(0, i).join('\n').trim()
    }
  }
  return bodyText.trim()
}
