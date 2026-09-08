import { ProgressBar } from '@sistemazero/member-shell/components/progress-bar'
import { PlayCircle } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { KidsBackButton } from '@/components/kids/back-button'
import { CourseTrail } from '@/components/kids/course-trail'
import { careerLockReason, KidsLockedCourse } from '@/components/kids/kids-locked-course'
import { PublicationStatus } from '@/components/kids/publication-status'
import { courseBadge } from '@/lib/course-badge'
import { resolveCourseBack } from '@/lib/course-return'
import type { CourseDetailView, LessonOutlineView } from '@/lib/types'
import { getMyCourse } from '@/server/members'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

/**
 * Aula-alvo do "continuar de onde parei": o backend manda `continueLessonId`
 * (última acessada > 1ª não concluída > 1ª); fallback local se vier nulo.
 * Pula aulas TRAVADAS (trava sequencial) — defensivo: o herói nunca aponta para um
 * cadeado (que cairia no 423). Se só sobrarem travadas, usa a 1ª (recado amigável).
 */
function nextLesson(course: CourseDetailView): LessonOutlineView | null {
  const all = course.modules.flatMap((m) => m.lessons)
  if (course.continueLessonId) {
    const target = all.find((l) => l.id === course.continueLessonId)
    if (target && !target.locked) return target
  }
  return all.find((l) => !l.completed && !l.locked) ?? all.find((l) => !l.locked) ?? all[0] ?? null
}

export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  // `?de=` guarda de onde a criança veio (só a home emite). Ausente → trilha do curso.
  searchParams: Promise<{ de?: string }>
}) {
  const [{ slug }, { de }] = await Promise.all([params, searchParams])
  // A gamificação saiu daqui em 14/08: ela só existia para desempatar a trilha do
  // Iniciante 2D, que era dividido entre Faísca e Construtor(a). Agora cada degrau tem
  // um dono e o destino sai só do curso. (O layout segue buscando o que precisa.)
  const { status, body } = await getMyCourse(slug)
  if (status === 404 || status === 403) notFound()
  if (status === 423) return <KidsLockedCourse reason={careerLockReason(body)} />
  if (status !== 200 || !body) throw new Error('Falha ao carregar o curso')
  const course = body

  const next = nextLesson(course)
  const pendingPublication = courseBadge(course) === 'publicar'
  const delivery =
    pendingPublication && course.id
      ? await shell.hub.myShowcaseDeliveryReadonly(course.id).catch(() => null)
      : null
  const deliveryState = delivery?.status === 200 ? delivery.body?.state : null
  const back = resolveCourseBack(de, course)
  const lessonHref = (l: LessonOutlineView) =>
    `/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(l.id)}`

  return (
    <div className="flex flex-col gap-8">
      {/* A setinha vive AGRUPADA com o cabeçalho (gap-3), não como irmã dele no
          `gap-8`: solta, ela empurrava a capa ~76px no mobile e jogava o "Continuar"
          abaixo da dobra. É o mesmo agrupamento da página da trilha. */}
      <div className="flex flex-col gap-3">
        <KidsBackButton href={back.href} label={back.label} showLabel />

        {/* Cabeçalho do curso */}
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-2xl bg-muted md:w-80">
            {course.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.coverImageUrl}
                alt=""
                width={16}
                height={9}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-secondary to-muted" />
            )}
          </div>
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <h1 className="sz-display text-2xl md:text-3xl">{course.title}</h1>
              {course.subtitle ? (
                <p className="mt-1 text-muted-foreground">{course.subtitle}</p>
              ) : null}
            </div>
            {course.description ? (
              <p className="text-muted-foreground text-sm">{course.description}</p>
            ) : null}
            <div className="mt-1 flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-muted-foreground text-xs">
                <span>
                  {course.progress.completedLessons} de {course.progress.totalLessons} aulas
                  concluídas
                </span>
                <span className="sz-display">{course.progress.percent}%</span>
              </div>
              <ProgressBar value={course.progress.percent} />
            </div>
            {next && !pendingPublication ? (
              <Link href={lessonHref(next)} className="sz-btn-gradient mt-2 self-start">
                <PlayCircle className="size-4" />
                {course.progress.completedLessons > 0 ? 'Continuar de onde parei' : 'Começar agora'}
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <hr className="sz-divider" />

      {pendingPublication && (deliveryState === 'pending' || deliveryState === 'delivered') ? (
        <PublicationStatus state={deliveryState} />
      ) : pendingPublication ? (
        <section
          id="publicar"
          className="scroll-mt-20 rounded-2xl border border-primary/25 bg-card p-6"
        >
          <p className="text-sm font-bold text-primary">Aulas concluídas · publicação pendente</p>
          <h2 className="sz-display mt-2 text-xl">Seu projeto também faz parte da conquista</h2>
          {deliveryState == null ? (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              Se você acabou de compartilhar, a confirmação pode estar a caminho. Ainda não
              conseguimos consultar a publicação; você pode conferir seu jogo no Mural.
            </p>
          ) : null}
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Abra a aula do projeto, confira a versão que você criou e use Compartilhar no Estúdio.
            Depois que a publicação for confirmada, este curso contará na sua carreira.
          </p>
          {course.showcaseLessonId ? (
            <Link
              href={`/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(course.showcaseLessonId)}`}
              className="sz-btn-gradient mt-4 inline-flex min-h-11 items-center"
            >
              Abrir projeto para publicar
            </Link>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              A aula de publicação não está disponível agora. Sua conclusão continua registrada.
              <Link href="/recados" className="ml-1 font-bold text-primary underline">
                Falar com o professor
              </Link>
            </p>
          )}
        </section>
      ) : null}

      {/* Trilha de aulas (estilo Duolingo) — substitui a lista de módulos. */}
      <CourseTrail course={course} />
    </div>
  )
}
