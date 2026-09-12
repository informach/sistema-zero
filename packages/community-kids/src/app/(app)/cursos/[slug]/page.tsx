import { BookOpen, Play } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { KidsBackButton } from '@/components/kids/back-button'
import { CourseTrail } from '@/components/kids/course-trail'
import { KidsBand } from '@/components/kids/kids-band'
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
    <>
      <KidsBand tone="creme">
        {/* A setinha fica colada no cabeçalho: solta, ela empurrava a capa ~76px no
          mobile e jogava o "Continuar" abaixo da dobra. Mesmo agrupamento da trilha. */}
        <KidsBackButton href={back.href} label={back.label} showLabel className="mb-6" />

        {/* Cabeçalho do curso, na régua das telas-modelo (11/09/2026): a capa de cantos
            redondos à esquerda, o título em Baloo na escala dos cabeçalhos, a barra verde
            dos cartões de curso e o botão da marca. */}
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
          <div className="relative aspect-[5/3] w-full shrink-0 overflow-hidden rounded-[1.25rem] bg-muted md:w-[22.5rem]">
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
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <BookOpen className="size-12" strokeWidth={1.75} aria-hidden />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="sz-display text-[clamp(1.875rem,3vw,2.5rem)]">{course.title}</h1>
            {course.subtitle ? (
              <p className="mt-2 font-medium text-[1.0625rem] text-muted-foreground">
                {course.subtitle}
              </p>
            ) : null}
            {course.description ? (
              <p className="mt-2 max-w-2xl font-medium text-[0.9375rem] text-muted-foreground">
                {course.description}
              </p>
            ) : null}
            <div className="mt-5 max-w-md">
              <div className="flex items-center justify-between font-semibold text-muted-foreground text-xs">
                <span>
                  {course.progress.completedLessons} de {course.progress.totalLessons} aulas
                  concluídas
                </span>
                <span
                  className={
                    course.progress.percent > 0
                      ? 'font-extrabold text-(--success-foreground)'
                      : 'font-extrabold'
                  }
                >
                  {course.progress.percent}%
                </span>
              </div>
              <div
                className="sz-progress mt-2"
                role="progressbar"
                aria-label="Progresso do curso"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={course.progress.percent}
              >
                <span style={{ width: `${course.progress.percent}%` }} />
              </div>
            </div>
            {next && !pendingPublication ? (
              <Link href={lessonHref(next)} className="sz-btn-gradient mt-5 gap-2 px-6">
                <Play className="size-4" aria-hidden />
                {course.progress.completedLessons > 0 ? 'Continuar de onde parei' : 'Começar agora'}
              </Link>
            ) : null}
          </div>
        </div>
      </KidsBand>

      {/* A régua saiu: quem separa as seções agora é a troca de FAIXA. */}
      {pendingPublication && (deliveryState === 'pending' || deliveryState === 'delivered') ? (
        <KidsBand tone="amarelo">
          <PublicationStatus state={deliveryState} />
        </KidsBand>
      ) : pendingPublication ? (
        <KidsBand tone="amarelo">
          <section id="publicar" className="kids-carta scroll-mt-20 p-6 md:p-7">
            <p className="font-extrabold text-primary text-xs uppercase tracking-[0.12em]">
              Aulas concluídas · publicação pendente
            </p>
            <h2 className="sz-display mt-2 text-xl md:text-[1.625rem]">
              Seu projeto também faz parte da conquista
            </h2>
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
                className="sz-btn-gradient mt-5 px-6"
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
        </KidsBand>
      ) : null}

      {course.materialLessonIds?.length ? (
        <KidsBand tone="amarelo">
          <section className="kids-carta p-6 md:p-7" aria-label="Caderno do curso">
            <h2 className="sz-display text-xl">Seu caderno está aqui</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Volte quando quiser ler ou baixar o material.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {course.materialLessonIds.map((id) => (
                <Link
                  key={id}
                  className="sz-btn-gradient px-5"
                  href={`/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(id)}`}
                >
                  {course.modules
                    .flatMap((module) => module.lessons)
                    .find((lesson) => lesson.id === id)?.title ?? 'Abrir caderno'}
                </Link>
              ))}
            </div>
          </section>
        </KidsBand>
      ) : null}

      {/* Trilha de aulas (estilo Duolingo) — substitui a lista de módulos. A faixa
          azul-céu vai do começo ao fim da trilha, como no mapa da carreira. */}
      <KidsBand tone="ceu">
        <CourseTrail course={course} />
      </KidsBand>
    </>
  )
}
