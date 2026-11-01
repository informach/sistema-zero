import { notFound, redirect } from 'next/navigation'
import type { CourseDetailView } from '@/lib/types'
import { staffAccess } from '~/server/access'
import { gatewayFetch, paths, readJson } from '~/server/gateway'

export const dynamic = 'force-dynamic'

/**
 * As aulas de um curso, com o link de cada uma no palco: quem grava abre a aula sem precisar
 * do endereço do Kids (`/aulas/cade-todo-mundo`).
 */
export default async function CursoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const here = `/aulas/${encodeURIComponent(slug)}`
  const access = await staffAccess()
  if (!access) redirect(`/entrar?volta=${encodeURIComponent(here)}`)
  const res = await gatewayFetch(paths.course(slug), { access: access.token })
  if (res.status === 404) notFound()
  const course = res.ok ? await readJson<CourseDetailView>(res) : null
  if (!course) throw new Error(`Não consegui ler o curso (${res.status}).`)
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col gap-6 px-4 py-10">
      <h1 className="font-extrabold text-2xl">{course.title}</h1>
      {course.modules.map((module) => (
        <section key={module.id} className="space-y-2">
          <h2 className="font-bold">{module.title}</h2>
          <ol className="space-y-1">
            {module.lessons.map((lesson) => (
              <li key={lesson.id}>
                <a
                  className="underline"
                  data-aula={lesson.id}
                  href={`${here}/${encodeURIComponent(lesson.id)}`}
                >
                  {lesson.title}
                </a>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </main>
  )
}
