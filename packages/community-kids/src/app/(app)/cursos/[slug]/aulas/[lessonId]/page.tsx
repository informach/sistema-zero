import { isVoiceInputConfigured } from '@sistemazero/member-shell/server/openrouter-transcribe'
import { notFound } from 'next/navigation'
import { journeyLockReason, KidsLockedCourse } from '@/components/kids/kids-locked-course'
import { KidsLockedLesson } from '@/components/kids/kids-locked-lesson'
import { getEnv } from '@/lib/env'
import type { LessonOutlineView } from '@/lib/types'
import { computeAgeFromBirthDate } from '@/lib/user-display'
import { getAvatarReadonly, getLesson, getMyCourse } from '@/server/members'
import { getSession } from '@/server/session'
import { shell } from '@/server/shell'
import { LessonPlayer } from './lesson-player-client'

export const dynamic = 'force-dynamic'

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>
}) {
  const { slug, lessonId } = await params
  const [courseRes, lessonRes, session, avatar, profileRes] = await Promise.all([
    getMyCourse(slug),
    getLesson(slug, lessonId),
    getSession(),
    // Foto do agradecimento da classificação = snapshot do avatar 3D da CRIANÇA
    // (desde 24/07 é a ÚNICA imagem dela — nunca a foto da conta do responsável).
    getAvatarReadonly(),
    // O PRÓPRIO perfil (a criança) dá nome + nascimento p/ a classificação (nunca o
    // e-mail/nome do responsável). Pelo `/auth/me` da sessão de perfil: a lista da família
    // é da área dos pais e o Gateway a recusa para o aluno. Best-effort.
    shell.auth.getMyProfileReadonly(),
  ])
  if (courseRes.status === 404 || courseRes.status === 403) notFound()
  if (courseRes.status === 423)
    return <KidsLockedCourse reason={journeyLockReason(courseRes.body)} />
  if (courseRes.status !== 200 || !courseRes.body) throw new Error('Falha ao carregar o curso')
  const course = courseRes.body

  // Aula travada pela trava sequencial (members → 423): recado kids, não erro.
  if (lessonRes.status === 423) return <KidsLockedLesson courseSlug={course.slug} />
  if (lessonRes.status === 404) notFound()
  if (lessonRes.status !== 200 || !lessonRes.body) throw new Error('Falha ao carregar a aula')

  const lesson = lessonRes.body

  // Próxima aula para a comemoração; a navegação durante a aula é por seções.
  const flat: LessonOutlineView[] = course.modules.flatMap((m) => m.lessons)
  const index = flat.findIndex((l) => l.id === lesson.id)
  const href = (l: LessonOutlineView | undefined) =>
    l ? `/cursos/${encodeURIComponent(course.slug)}/aulas/${encodeURIComponent(l.id)}` : null
  const nextOutline = index >= 0 ? flat[index + 1] : undefined
  // Próxima aula na ORDEM (ignora a trava): a comemoração usa este link — ao concluir,
  // a aula atual já destravou a próxima.
  const nextLessonHref = href(nextOutline)

  // Perfil ATIVO = a criança (id da sessão). Server-side e best-effort: o nascimento
  // só é usado p/ a idade da PRÓPRIA criança (sem vazar dados de outros perfis).
  const mine = profileRes.status === 200 ? profileRes.body.profile : null
  const activeProfile = mine && mine.id === session?.id ? mine : undefined

  return (
    <LessonPlayer
      key={`${session?.id ?? 'anonymous'}:${lesson.id}`}
      course={course}
      lesson={lesson}
      nextLessonHref={nextLessonHref}
      viewerWatermark={session?.id ? `Perfil ${session.id.slice(0, 8)}` : null}
      viewerId={session?.id ?? null}
      // O rascunho da aula guardado na conta: desligado pelo interruptor de emergência e na
      // sessão de suporte só leitura (o BFF recusaria as escritas de qualquer jeito).
      lessonDraftsEnabled={
        getEnv().LESSON_DRAFTS_ENABLED && session?.act?.mode !== 'readonly' && Boolean(session?.id)
      }
      // Falar em vez de escrever para a equipe (14/10/2026): a criança, com a fala ligada pelos
      // pais e no servidor. Sessão de suporte nunca grava a voz de ninguém.
      voiceInput={
        activeProfile?.voiceInputEnabled === true &&
        session?.kids?.kind === 'student' &&
        !session.act &&
        isVoiceInputConfigured()
      }
      ratingViewer={{
        name: activeProfile?.name ?? session?.activeProfile?.name ?? null,
        age: computeAgeFromBirthDate(activeProfile?.birthDate),
        avatarUrl: avatar.status === 200 ? (avatar.body?.photoUrl ?? null) : null,
      }}
      // Compartilhar usa a página de vendas do curso; kids não tem FUNNEL_URL
      // (decisão da v1) — sem salesPageUrl o botão fica oculto.
      shareUrl={course.salesPageUrl}
    />
  )
}
