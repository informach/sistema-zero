import { createRoot } from 'react-dom/client'
import { CourseBenefitsPanel } from '../../src/app/admin/membros/cursos/[courseId]/course-benefits-panel'

createRoot(document.getElementById('root')!).render(
  <main className="mx-auto max-w-6xl p-4 sm:p-8">
    <CourseBenefitsPanel courseSlug="transformando-o-vilao-em-aliado" audience="kids" />
  </main>,
)
