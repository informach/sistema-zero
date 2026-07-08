/**
 * Linter PURO do Light Copy (regras mecânicas) para feedback AO VIVO no
 * composer e na aba Roteiro. Espelha `marketing/src/domain/copy/light-copy.ts`
 * do backend — mudou uma regra, mude nos dois. As proibições subjetivas
 * (lero-lero, tese, decorado) ficam com a IA, não aqui.
 */
export interface LightCopyIssue {
  rule: number
  label: string
  fix: string
}

interface RuleMeta {
  label: string
  fix: string
}

const RULES: Record<number, RuleMeta> = {
  1: { label: 'Travessão', fix: 'Troque o travessão por vírgula, ponto ou dois-pontos.' },
  2: { label: 'Exclamação', fix: 'Tire o ponto de exclamação. Afirme com ponto final.' },
  3: {
    label: 'Pergunta no gancho',
    fix: 'A primeira frase não pode ser pergunta. Vire uma afirmação direta.',
  },
  4: { label: '"Não é X. É Y."', fix: 'Afirme direto o que é, sem a negação "não é... é...".' },
  6: {
    label: '"mesmo que" / "sem precisar"',
    fix: 'Troque "mesmo que" e "sem precisar" por um argumento real e direto.',
  },
}

/** O gancho (1ª frase) é uma pergunta? O 1º terminador de frase (.!?) é `?`. */
function isQuestionHook(text: string): boolean {
  return text.trim().match(/[.!?]/)?.[0] === '?'
}

/**
 * Infrações mecânicas do Light Copy no texto. Ordem estável por número da
 * regra; cada regra no máximo uma vez. ⚠️ `\b` do regex é ASCII e não cola em
 * letra acentuada (o "é" do verbo) — as regras com acento usam espaço/pontuação.
 */
export function lintLightCopy(text: string): LightCopyIssue[] {
  const issues: LightCopyIssue[] = []
  const push = (n: number) => {
    const meta = RULES[n]
    if (meta) issues.push({ rule: n, ...meta })
  }

  if (/[—–]/.test(text)) push(1)
  if (text.includes('!')) push(2)
  if (isQuestionHook(text)) push(3)
  if (/n[ãa]o\s+é\s+[^.!?]+[.!?]\s+é[\s.]/iu.test(text)) push(4)
  if (/\bmesmo que\b/iu.test(text) || /\bsem precisar\b/iu.test(text)) push(6)

  return issues
}
