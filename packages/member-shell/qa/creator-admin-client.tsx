import type { CreatorMasteryReviewDetail } from '@sistemazero/core/journey'
import { createRoot } from 'react-dom/client'
import { MasteryReviewForm } from '../../admin/src/app/admin/professor/maestrias/review-queue'

declare global {
  interface Window {
    creatorReviewFixture: CreatorMasteryReviewDetail
  }
}

createRoot(document.getElementById('root')!).render(
  <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
    <aside className="rounded-lg border border-border bg-card p-4">
      Prévia local · identidades e desenho fictícios. Nenhuma avaliação será gravada.
    </aside>
    <header>
      <h1 className="font-display text-3xl font-bold">Revisar Maestrias</h1>
      <p className="mt-2 text-muted-foreground">
        Confira o projeto, registre o que foi demonstrado e indique o próximo passo.
      </p>
    </header>
    <MasteryReviewForm
      reviewerId="20000000-0000-4000-8000-000000000002"
      detail={window.creatorReviewFixture}
      onBack={() => {}}
      onSaved={() => {}}
    />
  </main>,
)
