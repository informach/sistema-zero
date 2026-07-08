import { LIGHT_COPY_RULES } from './light-copy-rules'

/**
 * Linter PURO do Light Copy: só as proibições MECÂNICAS (checáveis por regex).
 * As subjetivas (lero-lero, tese, decorado, promessa vaga) ficam com a IA. Este
 * módulo é espelhado no front (`marketing-app/src/lib/lightcopy.ts`) p/ o
 * feedback ao vivo — mudou uma regra, mude nos dois.
 */
export interface LightCopyIssue {
  /** Número da proibição (1..12). */
  rule: number
  label: string
  fix: string
}

function ruleMeta(n: number): { label: string; fix: string } {
  const rule = LIGHT_COPY_RULES.find((r) => r.n === n)
  return { label: rule?.label ?? '', fix: rule?.fix ?? '' }
}

/**
 * O gancho é uma pergunta? Heurística: o PRIMEIRO terminador de frase (.!?) do
 * texto é `?`. "Você quer isso? Existe um padrão." → sim; "Existe um padrão.
 * Você reparou?" → não (o 1º terminador é `.`).
 */
function isQuestionHook(text: string): boolean {
  return text.trim().match(/[.!?]/)?.[0] === '?'
}

/**
 * Roda as regras mecânicas sobre o texto e devolve as infrações. Ordem estável
 * pelo número da regra; cada regra aparece no máximo uma vez. ⚠️ `\b` do regex
 * é ASCII — não funciona colado em letra acentuada (o "é" do verbo); por isso
 * as regras com acento usam espaço/pontuação em volta, não word boundary.
 */
export function lintLightCopy(text: string): LightCopyIssue[] {
  const issues: LightCopyIssue[] = []
  const push = (n: number) => issues.push({ rule: n, ...ruleMeta(n) })

  // 1 — travessão (— em-dash ou – en-dash). O hífen de palavra composta
  // ("caixa-preta") NÃO conta.
  if (/[—–]/.test(text)) push(1)
  // 2 — ponto de exclamação.
  if (text.includes('!')) push(2)
  // 3 — o gancho (1ª frase) é uma pergunta.
  if (isQuestionHook(text)) push(3)
  // 4 — estrutura "Não é X. É Y." (afirmar direto). Sem `\b` no "é".
  if (/n[ãa]o\s+é\s+[^.!?]+[.!?]\s+é[\s.]/iu.test(text)) push(4)
  // 6 — muletas "mesmo que" / "sem precisar" (ASCII, `\b` ok).
  if (/\bmesmo que\b/iu.test(text) || /\bsem precisar\b/iu.test(text)) push(6)

  return issues
}
