'use client'
import type { ResearchEvidence } from '@sistemazero/marketing-contracts'
export function ResearchReadout({ evidence }: { evidence: ResearchEvidence }) {
  const { result } = evidence
  return (
    <div className="mt-4 space-y-4 text-sm leading-relaxed">
      <h4 className="font-semibold">{result.title}</h4>
      <p className="whitespace-pre-wrap">{result.summary}</p>
      {result.findings.map((finding) => (
        <article key={`${finding.classification}:${finding.claim}`} className="border-l-2 pl-3">
          <p className="text-xs font-semibold text-muted-foreground">
            {
              {
                fact: 'Fato relatado pela fonte',
                interpretation: 'Interpretação',
                hypothesis: 'Hipótese a testar',
              }[finding.classification]
            }
          </p>
          <p>{finding.claim}</p>
          {finding.quote ? <blockquote className="mt-2 italic">{finding.quote}</blockquote> : null}
          <div className="mt-2 flex flex-wrap gap-3">
            {finding.sourceUrls.map((url) => (
              <a
                key={url}
                className="text-xs text-primary underline"
                href={url}
                target="_blank"
                rel="noreferrer"
              >
                {result.sources.find((source) => source.url === url)?.title ??
                  new URL(url).hostname}
              </a>
            ))}
          </div>
        </article>
      ))}
      {result.hypothesis ? (
        <p>
          <strong>Próxima hipótese:</strong> {result.hypothesis}
        </p>
      ) : null}
      {result.proposedDirection ? (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer font-medium">Proposta para a direção</summary>
          <p className="mt-2 whitespace-pre-wrap">{result.proposedDirection}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Será guardada como proposta em revisão. A direção vigente permanece até a decisão da
            equipe.
          </p>
        </details>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {evidence.toolCalls} consultas · {new Date(evidence.searchedAt).toLocaleString('pt-BR')} ·
        Confira as fontes antes de usar afirmações em uma peça.
      </p>
    </div>
  )
}
