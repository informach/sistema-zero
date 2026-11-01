import { Button } from '@sistemazero/ui/button'
import { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CoursePublicationDialog } from '../../src/app/admin/membros/cursos/course-publication-dialog'

const scenario = new URLSearchParams(location.search).get('scenario') ?? 'ready'
const response = await fetch(`/__qa/course?scenario=${encodeURIComponent(scenario)}`)
if (!response.ok) throw new Error('Fixture local indisponível')
const course = (await response.json()) as { id: string; slug: string; title: string }
function View() {
  const [open, setOpen] = useState(false)
  return (
    <main className="mx-auto max-w-4xl space-y-4 p-4 sm:p-8">
      <p className="text-sm text-muted-foreground">
        Sistema Zero · Admin · Teste local com dados fictícios
      </p>
      <h1 className="text-2xl font-semibold">Publicação de cursos</h1>
      <Button onClick={() => setOpen(true)}>
        {scenario === 'promote' ? 'Promover para produção' : 'Publicar no adulto'}
      </Button>
      <CoursePublicationDialog
        course={open ? course : null}
        operation={scenario === 'promote' ? 'promote-kids' : 'copy-adult'}
        onClose={() => setOpen(false)}
        onPublished={() => {}}
      />
    </main>
  )
}
createRoot(document.getElementById('root')!).render(<View />)
