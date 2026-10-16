'use client'
import type { ProductionReview } from '@sistemazero/marketing-contracts'
import type { ReactNode } from 'react'
export const productionReviewLabels = {
  incomplete: 'Conferência incompleta',
  divergent: 'Versões diferentes',
  'ready-for-review': 'Correspondência textual conferida',
}

export function ProductionReviewDetails({
  review,
  fileAction,
}: {
  review: ProductionReview
  fileAction?(file: ProductionReview['files'][number]): ReactNode
}) {
  return (
    <div className="space-y-2 text-sm">
      <p className="font-medium">
        {review.folder.key} · {productionReviewLabels[review.state]}
      </p>
      {review.copySourcePath ? (
        <p className="break-all text-xs">Copy comparada: {review.copySourcePath}</p>
      ) : null}
      {review.issues.length ? (
        <ul className="space-y-1" aria-label="Pendências da produção">
          {review.issues.map((issue) => (
            <li key={`${issue.path}:${issue.message}`}>
              <p>{issue.message}</p>
              <p className="break-all text-xs text-muted-foreground">{issue.path}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {[
        { label: 'Fontes com o mesmo texto', paths: review.matchingCopies },
        { label: 'Outras versões preservadas', paths: review.otherCopies },
      ].map(({ label, paths }) =>
        paths.length ? (
          <details key={label}>
            <summary>
              {label} ({paths.length})
            </summary>
            <ul>
              {paths.map((path) => (
                <li className="break-all text-xs" key={path}>
                  {path}
                </li>
              ))}
            </ul>
          </details>
        ) : null,
      )}
      <ol
        className="max-h-64 space-y-2 overflow-auto"
        aria-label="Ordem das artes e texto alternativo"
      >
        {review.files.map((file) => (
          <li key={file.path} className="rounded border p-2">
            <p>
              {file.position}. {file.path.split('/').at(-1)}
            </p>
            <p>{file.alt?.short ?? 'Texto alternativo pendente'}</p>
            {file.alt ? (
              <details>
                <summary>Descrição completa</summary>
                <p className="whitespace-pre-wrap">{file.alt.long}</p>
              </details>
            ) : null}
            {fileAction?.(file)}
          </li>
        ))}
      </ol>
    </div>
  )
}
