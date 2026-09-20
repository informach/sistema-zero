import Link from 'next/link'
import { notFound } from 'next/navigation'
import { KidsBackButton } from '@/components/kids/back-button'
import { CourseTrail } from '@/components/kids/course-trail'
import { KidsBand } from '@/components/kids/kids-band'
import { careerLockReason, KidsLockedCourse } from '@/components/kids/kids-locked-course'
import { PublicationStatus } from '@/components/kids/publication-status'
import { courseBadge } from '@/lib/course-badge'
import { resolveCourseBack } from '@/lib/course-return'
import { getMyCourse } from '@/server/members'
import { shell } from '@/server/shell'

export const dynamic = 'force-dynamic'

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

  const pendingPublication = courseBadge(course) === 'publicar'
  const delivery =
    pendingPublication && course.id
      ? await shell.hub.myShowcaseDeliveryReadonly(course.id).catch(() => null)
      : null
  const deliveryState = delivery?.status === 200 ? delivery.body?.state : null
  const back = resolveCourseBack(de, course)
  return (
    <>
      <KidsBand tone="creme" innerClassName="pt-6 pb-2 md:pt-8 md:pb-2">
        <div className="mx-auto flex w-full max-w-[40rem] items-center justify-start gap-4">
          <KidsBackButton href={back.href} label={back.label} showLabel className="shrink-0" />
          <h1 className="sz-display min-w-0 text-left text-[clamp(1.125rem,3vw,1.75rem)] leading-tight [overflow-wrap:anywhere]">
            {course.title}
          </h1>
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

      {/* O cabeçalho e a trilha dividem a mesma régua estreita. */}
      <KidsBand tone="ceu" innerClassName="pt-8 md:pt-10">
        <CourseTrail course={course} />
      </KidsBand>
    </>
  )
}
