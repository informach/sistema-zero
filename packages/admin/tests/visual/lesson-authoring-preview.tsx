import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import { LessonEditorClient } from '../../src/app/admin/membros/cursos/[courseId]/aulas/[lessonId]/lesson-editor-client'

// Actual production editor, served only by the local QA harness with in-memory lesson data.
createRoot(document.getElementById('root')!).render(
  <div className="min-h-screen bg-background text-foreground">
    <aside className="fixed inset-y-0 left-0 hidden w-60 border-r border-border p-6 lg:block">
      <p className="font-semibold">Sistema Zero</p>
      <p className="mt-8 text-sm text-muted-foreground">Configuração</p>
      <p className="mt-3 text-sm font-medium">Cursos e aulas</p>
    </aside>
    <main className="min-w-0 p-6 lg:ml-60">
      <LessonEditorClient
        courseId="preview-course"
        lessonId="preview-lesson"
        authorId="preview-teacher"
        currentRole="admin"
      />
    </main>
    <Toaster />
  </div>,
)
