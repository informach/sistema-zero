import { courseJourneyState, nextCareerCourse } from '@sistemazero/core/career'
import { ContinueHeroLink } from '@/components/kids/continue-hero-link'
import { KidsHero } from '@/components/kids/kids-hero'
import type { MyCourseView } from '@/lib/types'

interface CourseActivityView {
  continueLessonId: string | null
  progress: { completedLessons: number }
}

/** Abrir uma aula já é atividade; conclusão não é o único sinal de início. */
export function courseHasActivity(course: CourseActivityView): boolean {
  return course.continueLessonId !== null || course.progress.completedLessons > 0
}

export function hasAnyCourseActivity(courses: readonly CourseActivityView[]): boolean {
  return courses.some(courseHasActivity)
}

/** Mesma prioridade pedagógica usada pelo restante da jornada. */
export function pickContinueCourse(courses: MyCourseView[]): MyCourseView | null {
  return nextCareerCourse(courses)
}

/**
 * Card-herói "Continuar de onde parei" (estilo Duolingo): azul da marca em largura
 * total, progresso grande e CTA 3D direto pra aula-alvo. Abre a home E o Criar.
 *
 * Era um card BRANCO com um fio azul em volta — o mesmo tom de todo o resto da
 * página, e por isso a coisa mais importante da tela não parecia a mais
 * importante. Agora ele é o bloco azul da referência, com a capa do curso à
 * direita em vez de escondida no `md:`.
 *
 * Desenho das telas-modelo (11/09/2026): a capa fica à direita SEM rotação, no
 * formato 5:3 de cantos redondos da imagem, e o botão é a pílula BRANCA com o rótulo
 * azul (`sz-btn-inverso`), porque sobre o azul o botão da marca sumiria.
 */
export function ContinueHero({ courses }: { courses: MyCourseView[] }) {
  const course = pickContinueCourse(courses)
  if (!course) return null

  const publishing = courseJourneyState(course) === 'publish'
  const courseHref = `/cursos/${encodeURIComponent(course.courseSlug)}`
  const href = publishing
    ? `${courseHref}?de=inicio#publicar`
    : course.continueLessonId
      ? `${courseHref}/aulas/${encodeURIComponent(course.continueLessonId)}`
      : // Sem aula-alvo o herói cai na página do curso: marca a origem p/ a setinha
        // de lá voltar PRA HOME (ver `lib/course-return.ts`).
        `${courseHref}?de=inicio`
  const started = courseHasActivity(course)

  return (
    <KidsHero
      variant="alto"
      eyebrow={
        publishing
          ? 'Seu próximo passo: publicar'
          : started
            ? 'Continue sua criação'
            : 'Sua primeira criação começa aqui'
      }
      title={course.title}
      description={
        publishing
          ? 'Você concluiu este curso. Publique o projeto no Mural para registrar essa conquista na carreira.'
          : undefined
      }
      footer={
        <div className="flex items-center gap-3">
          <div
            className="h-2 max-w-[26rem] flex-1 overflow-hidden rounded-full"
            // Trilho e enchimento saem da TINTA do herói e do ouro da marca, e não
            // de `bg-muted`/`bg-primary`: aqui o fundo é o azul, e os dois somem
            // nele. O ouro é a cor de maior contraste que a paleta tem sobre azul.
            style={{
              backgroundColor: 'color-mix(in oklab, var(--sz-primary-fg) 25%, transparent)',
            }}
          >
            <span
              className="block h-full rounded-full bg-(--sz-kids-amarelo) transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${course.progress.percent}%` }}
            />
          </div>
          <span className="kids-marca-suave shrink-0 font-bold text-sm">
            {course.progress.completedLessons}/{course.progress.totalLessons} aulas
          </span>
        </div>
      }
      actions={
        <ContinueHeroLink
          href={href}
          started={started}
          label={publishing ? 'Preparar publicação' : undefined}
        />
      }
      art={
        course.coverImageUrl ? (
          <div className="w-full max-w-[22.5rem] overflow-hidden rounded-2xl md:w-[22.5rem]">
            {/* Capa pode ser URL externa arbitrária (autoria) → <img> simples. */}
            <img
              src={course.coverImageUrl}
              alt=""
              width={360}
              height={216}
              className="aspect-[5/3] w-full object-cover"
            />
          </div>
        ) : undefined
      }
    />
  )
}
