import { lintLightCopy } from '@sistemazero/marketing-contracts'
export function CopyReview({ text, protectedText }: { text: string; protectedText: string[] }) {
  const issues = lintLightCopy(text)
  const quotations = [
    ...new Set(
      Array.from(text.matchAll(/[“"]([^”"\n]{4,2000})[”"]/g), (match) => match[1]).filter(
        (quote): quote is string => Boolean(quote),
      ),
    ),
  ]
  if (!issues.length && !quotations.length && !protectedText.length) return null
  return (
    <details className="mt-4 rounded-lg border p-3 text-sm">
      <summary className="cursor-pointer font-medium">
        Revisão da copy · {issues.length} sinais de estilo · {quotations.length} trechos entre aspas
      </summary>
      <p className="mt-2 text-xs text-muted-foreground">
        Sinais de estilo orientam a revisão. Citações reais devem manter a fala original, mesmo
        quando contêm pontuação marcada.
      </p>
      <ul className="mt-3 space-y-2">
        {issues.map((issue) => (
          <li key={issue.rule}>
            {issue.label}: {issue.fix}
          </li>
        ))}
      </ul>
      {quotations.length ? (
        <ul className="mt-3 space-y-2">
          {quotations.map((quote) => (
            <li key={quote}>
              <q>{quote}</q> ·{' '}
              {protectedText.includes(quote)
                ? 'Texto protegido'
                : 'Confira a atribuição à fonte antes de publicar'}
            </li>
          ))}
        </ul>
      ) : null}
      {protectedText.length ? (
        <p className="mt-3 text-xs">
          {protectedText.length} trechos protegidos contra alterações pela IA.
        </p>
      ) : null}
    </details>
  )
}
