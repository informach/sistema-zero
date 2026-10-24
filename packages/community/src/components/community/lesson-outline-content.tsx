'use client'

import { ProgressBar } from '@sistemazero/member-shell/components/progress-bar'
import { Card } from '@sistemazero/ui/card'
import { CheckCircle2, Circle, Lock } from 'lucide-react'
import Link from 'next/link'
import type { CourseDetailView } from '@/lib/types'
import { CourseRatingFlow, type RatingViewer } from './course-rating-flow'

type OutlineCourse = Pick<CourseDetailView, 'title' | 'slug' | 'progress' | 'myRating' | 'modules'>

/** Adult course navigation; completion, lock and current lesson remain independent. */
export function LessonOutlineContent({
  course,
  courseHref,
  currentLessonId,
  shareUrl,
  viewer,
}: {
  course: OutlineCourse
  courseHref: string
  currentLessonId: string
  shareUrl: string | null
  viewer: RatingViewer
}) {
  return (
    <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0 lg:rounded-none lg:border-0 lg:shadow-none">
      <div className="sz-lesson-outline-header">
        <h2 className="sz-lesson-outline-title">{course.title}</h2>
        <div className="mt-2 flex items-center gap-2">
          <ProgressBar value={course.progress.percent} className="flex-1" />
          <span className="sz-display text-primary text-xs">{course.progress.percent}%</span>
        </div>
        {/* Classificação do curso: o link some quando myRating != null. */}
        <CourseRatingFlow
          courseSlug={course.slug}
          initialRating={course.myRating}
          shareUrl={shareUrl}
          viewer={viewer}
        />
      </div>
      <nav
        aria-label="Lista de aulas do curso"
        className="sz-lesson-outline-list scrollbar-subtle min-h-0 flex-1 overflow-y-auto"
      >
        {course.modules.map((module) => (
          <div key={module.id} className="sz-lesson-outline-module">
            <h3 className="sz-lesson-outline-module-title">{module.title}</h3>
            <ul>
              {module.lessons.map((item) => {
                const active = item.id === currentLessonId
                if (item.locked) {
                  return (
                    <li key={item.id}>
                      <div
                        aria-disabled="true"
                        title="Conclua a aula anterior para liberar"
                        className="sz-lesson-outline-link sz-lesson-outline-locked"
                      >
                        <Lock className="size-4 shrink-0" aria-hidden />
                        <span>{item.title}</span>
                      </div>
                    </li>
                  )
                }
                return (
                  <li key={item.id}>
                    <Link
                      href={`${courseHref}/aulas/${encodeURIComponent(item.id)}`}
                      className="sz-lesson-outline-link"
                      aria-current={active ? 'page' : undefined}
                    >
                      {item.completed ? (
                        <CheckCircle2
                          className="sz-lesson-outline-completed size-4 shrink-0"
                          aria-hidden
                        />
                      ) : (
                        <Circle className="size-4 shrink-0" aria-hidden />
                      )}
                      <span>
                        {item.completed ? <span className="sr-only">Aula concluída. </span> : null}
                        {item.title}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </Card>
  )
}
