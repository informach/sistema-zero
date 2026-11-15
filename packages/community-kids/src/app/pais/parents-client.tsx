'use client'

import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { BookOpen, ChevronRight, Info } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  guideDismissedKey,
  guideWelcomeSeenKey,
  parentWelcomeSteps,
  readGuideFlag,
  resolveParentGuideStep,
  writeGuideFlag,
} from '@/lib/guide'
import { trackOnboardingEvent } from '@/lib/onboarding-telemetry'
import { canAddProfile, type ProfileAllowance } from '@/lib/profile-allowance'
import { familyAccessReady } from '@/lib/study-access-view'
import type { MyCourseView, ProfileView } from '@/lib/types'
import { FamilyAiCredits } from './_components/ai-credits-card'
import { AttentionList, attentionItems } from './_components/attention-list'
import { ChildSummaryRow } from './_components/child-card'
import { ParentShell } from './_components/parent-shell'
import {
  ParentPageTitle,
  ParentSection,
  PRIMARY_ACTION,
  SECONDARY_ACTION,
} from './_components/parent-ui'
import { useChildrenStats } from './_components/use-children-stats'
import { VoiceNewsCard } from './_components/voice-news-card'
import { childHref, NEW_CHILD_HREF, PARENT_COURSES_HREF, studentEntryFor } from './parent-routes'

/**
 * O curso para pais no Início: o que está em andamento continua; sem curso, o convite para
 * conhecer os cursos para pais.
 */
function ParentCourseCard({ course }: { course: MyCourseView | null }) {
  return (
    <section aria-labelledby="parent-course" className="kids-carta flex flex-col gap-3 p-5 sm:p-6">
      <span className="flex items-center gap-2 font-extrabold text-muted-foreground text-xs uppercase tracking-[0.12em]">
        <BookOpen className="size-4" aria-hidden="true" /> Seu curso
      </span>
      {course ? (
        <>
          <h2 id="parent-course" className="sz-display text-[1.375rem] leading-tight">
            {course.title}
          </h2>
          <div
            className="h-2.5 overflow-hidden rounded-full bg-(--band-ceu)"
            role="progressbar"
            aria-valuenow={course.progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${course.progress.completedLessons} de ${course.progress.totalLessons} aulas concluídas`}
          >
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${course.progress.percent}%` }}
            />
          </div>
          <p className="text-muted-foreground text-sm">
            {course.progress.completedLessons} de {course.progress.totalLessons} aulas concluídas
          </p>
          <Link
            href={
              course.continueLessonId
                ? `${PARENT_COURSES_HREF}/${encodeURIComponent(course.courseSlug)}/aulas/${encodeURIComponent(course.continueLessonId)}`
                : `${PARENT_COURSES_HREF}/${encodeURIComponent(course.courseSlug)}`
            }
            className={PRIMARY_ACTION}
          >
            {course.progress.percent > 0 ? 'Continuar de onde parei' : 'Começar o curso'}
          </Link>
        </>
      ) : (
        <>
          <h2 id="parent-course" className="sz-display text-[1.375rem] leading-tight">
            Cursos para pais
          </h2>
          <p className="text-muted-foreground text-sm">
            Seus filhos aprendem a criar jogos aqui, e estes cursos são para você: como ajudar sem
            fazer por eles e como transformar o que eles criam em conversa.
          </p>
          <Link href={PARENT_COURSES_HREF} className={SECONDARY_ACTION}>
            Conhecer os cursos
          </Link>
        </>
      )}
    </section>
  )
}

/**
 * O Início da área dos pais (redesenho de 14/11/2026; era a Família de 11/10/2026): o que pede
 * atenção primeiro, o resumo da semana de cada filho, o curso para pais e os créditos. No
 * primeiro acesso, o guia de como preparar a entrada. Os cartões completos dos filhos e as regras
 * do Arquipélago ficam na Família; o acesso e o progresso, na página de cada filho.
 */
export function ParentsClient({
  accountId,
  parentName,
  initialProfiles,
  avatarPhotoByProfile,
  profileAllowance,
  initialAccess = {},
  studentDestination,
  voiceAvailable = false,
  parentCourse = null,
}: {
  accountId: string
  parentName?: string
  initialProfiles: ProfileView[]
  avatarPhotoByProfile: Record<string, string | null>
  profileAllowance: ProfileAllowance
  /** Autorizações de cada criança lidas no servidor; `null` = a consulta falhou. */
  initialAccess?: Record<string, StudyGrantView[] | null>
  /** A aula do link que trouxe o responsável: abre depois da troca para a criança. */
  studentDestination?: string
  /** A fala da criança está ligada no servidor (14/10/2026): mostra a novidade e o passo. */
  voiceAvailable?: boolean
  /** O curso para pais em andamento (ou o primeiro liberado); `null` convida a conhecer. */
  parentCourse?: MyCourseView | null
}) {
  const profiles = initialProfiles
  const access = initialAccess
  const [guideOpen, setGuideOpen] = useState(false)
  const stats = useChildrenStats()
  const canCreateProfile = canAddProfile(profileAllowance, profiles.length)
  // O estado REAL da família (todas as crianças): criança sem leitura conta como "não sei".
  const accessReady = familyAccessReady(
    Object.fromEntries(profiles.map((profile) => [profile.id, access[profile.id] ?? null])),
  )
  const guideKey = guideDismissedKey(accountId)
  const guideStep = resolveParentGuideStep({
    profilesCount: profiles.length,
    canCreateProfile,
    accessReady: accessReady === true,
    dismissed: !guideOpen,
  })
  const steps = parentWelcomeSteps({
    profilesCount: profiles.length,
    canCreateProfile,
    voiceAvailable,
  })
  const studentEntry = studentEntryFor(studentDestination)
  const initial = useRef({
    profiles: initialProfiles.length,
    allowance: profileAllowance,
    ready: accessReady,
  })
  const welcomeKey = guideWelcomeSeenKey(accountId)
  useEffect(() => {
    // Abre sozinho só quando há um passo a fazer: quem já preparou o acesso (ou quando não dá
    // para saber) não lê "Vamos preparar o acesso?".
    if (readGuideFlag(guideKey)) return
    const start = initial.current
    const actionable = start.profiles ? start.ready === false : canAddProfile(start.allowance, 0)
    if (actionable) {
      setGuideOpen(true)
      // O guia acompanha a família por várias páginas (Família, nova criança, página da
      // criança, Família de novo): a abertura conta UMA vez por conta neste navegador.
      if (!readGuideFlag(welcomeKey))
        trackOnboardingEvent({ audience: 'parent', action: 'welcome_opened', step: 'welcome' })
      writeGuideFlag(welcomeKey)
      return
    }
    // O acesso é preparado na página da criança. Quem começou o guia e voltou com o acesso
    // pronto lê "O acesso está preparado" uma vez, e o "Entendi" fecha o guia (tour_completed).
    if (start.ready === true && readGuideFlag(welcomeKey)) setGuideOpen(true)
  }, [guideKey, welcomeKey])
  function dismissGuide() {
    setGuideOpen(false)
    writeGuideFlag(guideKey)
    trackOnboardingEvent(
      accessReady === true
        ? { audience: 'parent', action: 'tour_completed', step: 'access' }
        : accessReady === false || !profiles.length
          ? {
              audience: 'parent',
              action: 'tour_skipped',
              step: profiles.length ? 'access' : 'profile',
            }
          : { audience: 'parent', action: 'welcome_dismissed', step: 'welcome' },
    )
  }
  const allAttention = attentionItems(profiles, access)
  // A primeira criança sem aparelho: o guia leva direto à página dela. Enquanto ele está aberto,
  // o "sem aparelho" sai do "Precisa da sua atenção" (seria o mesmo pedido duas vezes seguidas).
  const firstWithoutAccess = allAttention.find((item) => item.kind === 'none')?.profile
  const attention =
    guideStep === 'access' ? allAttention.filter((item) => item.kind !== 'none') : allAttention
  return (
    <ParentShell active="inicio" parentName={parentName} studentDestination={studentEntry}>
      <ParentPageTitle
        title={parentName ? `Olá, ${parentName}` : 'Área dos pais'}
        text="Veja o que precisa de você, como foi a semana dos seus filhos e continue o seu curso."
      />
      {studentDestination ? (
        <section role="status" className="kids-carta flex gap-4 p-5">
          <Info className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <h2 className="font-extrabold">Esse link abre na área da criança</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              A aula do link é da criança, não do responsável. Confira se o acesso dela está
              preparado neste computador e clique em Ir para a área da criança: a criança escolhe o
              perfil e a aula abre em seguida.
            </p>
          </div>
        </section>
      ) : null}
      {guideStep ? (
        <section
          aria-labelledby="parents-guide"
          className="kids-carta flex flex-col gap-5 border-2 border-primary p-6"
        >
          <h2 id="parents-guide" className="sz-display text-[1.375rem]">
            {guideStep === 'ready'
              ? 'O acesso está preparado'
              : profiles.length
                ? 'Seu filho já tem perfil. Vamos preparar o acesso?'
                : 'Vamos preparar a primeira entrada?'}
          </h2>
          {guideStep === 'ready' ? (
            <p className="max-w-3xl text-sm">
              No aparelho autorizado, a criança clica em <strong>Eu sou criador(a)</strong> e
              escolhe o próprio perfil, sem a sua senha. Se ela for usar este computador agora,
              clique em <strong>Ir para a área da criança</strong>, no alto da página.
            </p>
          ) : (
            <ol className="grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <li key={step.id} className="text-sm">
                  <strong className="block">{step.title}</strong>
                  <span className="text-muted-foreground">{step.text}</span>
                </li>
              ))}
            </ol>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {guideStep === 'profile' ? (
              <Link href={NEW_CHILD_HREF} className={PRIMARY_ACTION}>
                Adicionar criança
              </Link>
            ) : null}
            {guideStep === 'access' && firstWithoutAccess ? (
              <Link
                href={childHref(firstWithoutAccess.id, 'aparelhos', studentDestination)}
                className={PRIMARY_ACTION}
              >
                Preparar o acesso de {firstWithoutAccess.name}
              </Link>
            ) : null}
            {guideStep === 'ready' ? null : (
              <Link href="/pais/ajuda" className={SECONDARY_ACTION}>
                Ver o passo a passo
              </Link>
            )}
            <button
              type="button"
              onClick={dismissGuide}
              className="min-h-11 px-3 font-bold text-sm underline underline-offset-4"
            >
              {guideStep === 'ready' ? 'Entendi' : 'Fechar orientação'}
            </button>
          </div>
        </section>
      ) : null}
      {/* Com o guia aberto a família está no primeiro acesso: a fala aparece no formulário do
          perfil, e o aviso empilhado aqui seria a mesma orientação duas vezes. */}
      {voiceAvailable && !guideStep && profiles.length > 0 ? (
        <VoiceNewsCard accountId={accountId} profiles={profiles} />
      ) : null}
      <AttentionList
        items={attention}
        photoByProfile={avatarPhotoByProfile}
        studentDestination={studentDestination}
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <ParentSection
          title="Seus filhos esta semana"
          id="children-title"
          action={
            <Link
              href="/pais/familia"
              className="inline-flex min-h-11 items-center gap-1 font-bold text-primary text-sm"
            >
              Ver a família <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          }
        >
          {profiles.length ? (
            <ul className="kids-carta flex flex-col px-5 py-1 sm:px-6">
              {profiles.map((profile) => (
                <ChildSummaryRow
                  key={profile.id}
                  profile={profile}
                  photoUrl={avatarPhotoByProfile[profile.id] ?? null}
                  stats={stats}
                  studentDestination={studentDestination}
                />
              ))}
            </ul>
          ) : canCreateProfile ? (
            <div className="kids-carta flex flex-col items-start gap-3 p-5 sm:p-6">
              <p className="text-muted-foreground text-sm">
                Comece criando o perfil do seu filho ou da sua filha.
              </p>
              <Link href={NEW_CHILD_HREF} className={PRIMARY_ACTION}>
                Adicionar filho(a)
              </Link>
            </div>
          ) : null}
        </ParentSection>
        <aside className="flex flex-col gap-6">
          <ParentCourseCard course={parentCourse} />
          <FamilyAiCredits />
        </aside>
      </div>
    </ParentShell>
  )
}
