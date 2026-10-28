import type {
  CreatorJourneyCurriculum,
  CreatorMasteryReviewDetail,
} from '@sistemazero/core/journey'
import { createRoot } from 'react-dom/client'
import { MasteryReviewForm } from '../../admin/src/app/admin/professor/maestrias/review-queue'
import { CreatorCurriculumEditor } from '../../admin/src/components/admin/creator-curriculum-editor'
import { CreatorJourneyGrid } from '../../admin/src/components/admin/creator-journey-grid'
import type { CourseView } from '../../admin/src/lib/types'

declare global {
  interface Window {
    creatorReviewFixture?: CreatorMasteryReviewDetail
    creatorGridFixture?: {
      curriculum: CreatorJourneyCurriculum
      courses: CourseView[]
      audience: string
    }
  }
}

const grid = window.creatorGridFixture
createRoot(document.getElementById('root')!).render(
  grid ? (
    <main className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      <aside className="rounded-lg border border-border bg-card p-4">
        Prévia local · cursos fictícios. Nada é gravado.
      </aside>
      {new URLSearchParams(location.search).get('screen') === 'editor' ? (
        <CreatorCurriculumEditor
          value={grid.curriculum}
          courses={grid.courses}
          disabled={false}
          onChange={() => {}}
        />
      ) : (
        <CreatorJourneyGrid
          curriculum={grid.curriculum}
          courses={grid.courses}
          loading={false}
          audience={grid.audience}
          canWrite
          onEditCourse={() => {}}
        />
      )}
    </main>
  ) : (
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
        detail={window.creatorReviewFixture!}
        onBack={() => {}}
        onSaved={() => {}}
      />
    </main>
  ),
)
