// Mini-engine de template da tela de resultado (puro/testável). Resolve os
// marcadores do briefing: {{projeto}}, {{custo_mensal}} e o bloco condicional
// [[CUSTO]]…[[/CUSTO]]. Nunca deixa marcador cru no texto final.

import { formatReaisNumber } from './money'

/** {{projeto}} a partir da P2 (`tipo_criar`). E/ausente → "uma ideia". */
export function projetoLabel(tipoCriar: string | null | undefined): string {
  switch (tipoCriar) {
    case 'A':
      return 'um sistema pra organizar'
    case 'B':
      return 'uma ferramenta de vendas'
    case 'C':
      return 'uma automação'
    case 'D':
      return 'um app'
    default:
      return 'uma ideia'
  }
}

export interface TemplateVars {
  projeto: string
  /** Custo mensal em CENTAVOS. ≤ 0 / nulo → o bloco [[CUSTO]] é omitido. */
  custoMensalCents?: number | null
}

/**
 * Renderiza o `corpo` do perfil: mantém o bloco [[CUSTO]]…[[/CUSTO]] só quando há
 * custo (> 0), troca {{projeto}} e {{custo_mensal}} (número sem "R$", que já está
 * no texto) e normaliza espaços deixados pela remoção do bloco.
 */
export function renderTemplate(text: string, vars: TemplateVars): string {
  const hasCusto = (vars.custoMensalCents ?? 0) > 0
  const out = text
    .replace(/\[\[CUSTO\]\]([\s\S]*?)\[\[\/CUSTO\]\]/g, (_m, inner: string) =>
      hasCusto ? inner : '',
    )
    .replaceAll('{{projeto}}', vars.projeto)
    .replaceAll(
      '{{custo_mensal}}',
      hasCusto ? formatReaisNumber(vars.custoMensalCents as number) : '',
    )
  // Colapsa espaços duplos (a remoção do bloco deixa "frase.  próxima") e apara.
  return out.replace(/[ \t]{2,}/g, ' ').trim()
}
