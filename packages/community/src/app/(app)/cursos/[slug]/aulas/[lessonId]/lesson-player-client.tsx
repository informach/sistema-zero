'use client'

import { ArrowLeft, ArrowRight, CheckCircle2, ChevronLeft, Circle, Download } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast } from 'sonner'
import { LessonBlocks } from '@/components/community/lesson-blocks'
import { ProgressBar } from '@/components/community/progress-bar'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { apiSend } from '@/lib/api'
import { cn } from '@/lib/cn'
import type { CourseDetailView, LessonDetailView } from '@/lib/types'

interface Props {
  course: CourseDetailView
  lesson: LessonDetailView
  prevHref: string | null
  nextHref: string | null
}

export function LessonPlayer({ course, lesson, prevHref, nextHref }: Props) {
  const router = useRouter()
  const [completing, setCompleting] = useState(false)
  const courseHref = `/cursos/${encodeURIComponent(course.slug)}`

  async function complete() {
    setCompleting(true)
    try {
      await apiSend(`/api/members/lessons/${encodeURIComponent(lesson.id)}/complete`, 'POST')
      toast.success('Aula concluída!')
      if (nextHref) router.push(nextHref)
      router.refresh()
    } catch {
      toast.error('Não foi possível marcar a aula. Tente de novo.')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
      {/* Conteúdo principal */}
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <div>
          <Link
            href={courseHref}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            {course.title}
          </Link>
          <h1 className="sz-display mt-2 text-2xl">{lesson.title}</h1>
        </div>

        <LessonBlocks blocks={lesson.blocks} />

        {lesson.attachments.length > 0 ? (
          <Card className="flex flex-col gap-2 p-4">
            <h2 className="text-sm font-semibold">Materiais da aula</h2>
            <ul className="flex flex-col gap-1">
              {[...lesson.attachments]
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((file) => (
                  <li key={file.id}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-interactive transition-colors hover:bg-muted/60 hover:text-interactive-hover"
                    >
                      <Download className="size-4" />
                      {file.label}
                      {file.fileType ? (
                        <span className="text-xs uppercase text-muted-foreground">
                          {file.fileType}
                        </span>
                      ) : null}
                    </a>
                  </li>
                ))}
            </ul>
          </Card>
        ) : null}

        {/* Ações: concluir + navegação */}
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          {lesson.completed ? (
            <span className="inline-flex items-center gap-2 text-sm text-accent dark:text-primary">
              <CheckCircle2 className="size-4" />
              Aula concluída
            </span>
          ) : (
            <Button onClick={complete} disabled={completing}>
              {completing ? <Spinner /> : <CheckCircle2 className="size-4" />}
              Concluir aula
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            {prevHref ? (
              <Link href={prevHref} className={buttonVariants({ variant: 'outline' })}>
                <ArrowLeft className="size-4" />
                Anterior
              </Link>
            ) : null}
            {nextHref ? (
              <Link href={nextHref} className={buttonVariants({ variant: 'outline' })}>
                Próxima
                <ArrowRight className="size-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Outline do curso (sidebar) */}
      <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-72">
        <Card className="overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold">{course.title}</p>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar value={course.progress.percent} className="flex-1" />
              <span className="sz-display text-xs">{course.progress.percent}%</span>
            </div>
          </div>
          <nav className="scrollbar-subtle max-h-[28rem] overflow-y-auto">
            {course.modules.map((module) => (
              <div key={module.id}>
                <p className="bg-muted/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {module.title}
                </p>
                <ul>
                  {module.lessons.map((item) => {
                    const active = item.id === lesson.id
                    return (
                      <li key={item.id}>
                        <Link
                          href={`${courseHref}/aulas/${encodeURIComponent(item.id)}`}
                          className={cn(
                            'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                            active
                              ? 'bg-muted font-medium text-foreground'
                              : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                          )}
                          aria-current={active ? 'page' : undefined}
                        >
                          {item.completed ? (
                            <CheckCircle2 className="size-3.5 shrink-0 text-accent dark:text-primary" />
                          ) : (
                            <Circle className="size-3.5 shrink-0" />
                          )}
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </Card>
      </aside>
    </div>
  )
}
