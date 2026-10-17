import type { PensaPlanDraft } from '@sistemazero/core/pensa'

export function PlanChangeReview({
  draft,
  busy,
  onAccept,
  onDiscard,
}: {
  draft: PensaPlanDraft
  busy: boolean
  onAccept(): void
  onDiscard(): void
}) {
  const impact = draft.impact
  return (
    <section className="pensa-journey-card" aria-labelledby="pensa-change-title">
      <h2 id="pensa-change-title" className="pensa-journey-card__title">
        Confira este caminho
      </h2>
      <p>
        {draft.baseRevisionId
          ? 'Seu caminho atual continua guardado até você escolher esta mudança.'
          : 'Este caminho inclui todas as partes do jogo que você escolheu.'}
      </p>
      {impact ? (
        <ul>
          {impact.addedMissionIds.length ? (
            <li>{impact.addedMissionIds.length} missões novas.</li>
          ) : null}
          {impact.changedMissionIds.length ? (
            <li>{impact.changedMissionIds.length} missões com mudanças no resultado.</li>
          ) : null}
          {impact.reviewMissionIds.length ? (
            <li>{impact.reviewMissionIds.length} missões para conferir de novo.</li>
          ) : null}
          {impact.removedMissionIds.length ? (
            <li>{impact.removedMissionIds.length} missões saem deste caminho.</li>
          ) : null}
        </ul>
      ) : null}
      <p>As criações e as partes que continuam valendo ficam guardadas.</p>
      <div className="pensa-journey-actions">
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--primary"
          disabled={busy || draft.status !== 'ready'}
          onClick={onAccept}
        >
          Este é o meu jogo
        </button>
        <button
          type="button"
          className="sz-tool-pill sz-tool-pill--outline"
          disabled={busy}
          onClick={onDiscard}
        >
          Deixar como está
        </button>
      </div>
    </section>
  )
}
