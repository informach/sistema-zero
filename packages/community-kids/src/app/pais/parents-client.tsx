'use client'

import type { StudyGrantView } from '@sistemazero/member-shell/lib/study-access'
import { ChevronRight, Info } from 'lucide-react'
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
import type { ProfileView } from '@/lib/types'
import { AttentionList, attentionItems } from './_components/attention-list'
import { AddChildCard, ChildCard } from './_components/child-card'
import { ParentShell } from './_components/parent-shell'
import {
  ParentPageTitle,
  ParentSection,
  PRIMARY_ACTION,
  SECONDARY_ACTION,
} from './_components/parent-ui'
import { useChildrenStats } from './_components/use-children-stats'
import { VoiceNewsCard } from './_components/voice-news-card'
import { childHref, NEW_CHILD_HREF, studentEntryFor } from './parent-routes'
import { ProfileAllowanceNote } from './profile-allowance-note'

const HOW_IT_WORKS = [
  {
    title: 'Crie o perfil',
    text: 'Cada criança tem o próprio perfil, com o progresso guardado nele.',
  },
  {
    title: 'Autorize o aparelho',
    text: 'Neste computador ou em outro, com um código que vale 10 minutos.',
  },
  {
    title: 'A criança entra sozinha',
    text: 'Ela clica em Eu sou criador(a) e no próprio nome, sem a sua senha.',
  },
] as const

function NumberedSteps({ steps }: { steps: readonly { title: string; text: string }[] }) {
  return (
    <ol className="grid gap-3 md:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step.title} className="kids-carta flex gap-4 p-5">
          <span className="kids-marca sz-display flex size-10 shrink-0 items-center justify-center rounded-full text-lg">
            {index + 1}
          </span>
          <span>
            <strong className="block">{step.title}</strong>
            <span className="text-muted-foreground text-sm">{step.text}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

/**
 * A Família, o início da área dos pais (11/10/2026): o que pede atenção primeiro, um cartão por
 * criança e, no primeiro acesso, o guia de como preparar a entrada. O acesso de cada criança e o
 * progresso detalhado moram na página dela; conta e ajuda têm páginas próprias na barra.
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
  const limited = profileAllowance.kind === 'limited'
  const addNote = limited
    ? `${profiles.length} de ${profileAllowance.maxProfiles} perfis do seu plano`
    : undefined
  return (
    <ParentShell active="familia" parentName={parentName} studentDestination={studentEntry}>
      <ParentPageTitle
        title={parentName ? `Olá, ${parentName}` : 'Área dos pais'}
        text="Aqui você prepara o acesso das crianças e acompanha o que elas estão criando."
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
                href={childHref(firstWithoutAccess.id, undefined, studentDestination)}
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
      <ParentSection title="Suas crianças" id="children-title">
        <ul className="kids-grade-centrada [--grade-vao:1.25rem] md:[--grade-colunas:2] xl:[--grade-colunas:3]">
          {profiles.map((profile) => (
            <ChildCard
              key={profile.id}
              profile={profile}
              photoUrl={avatarPhotoByProfile[profile.id] ?? null}
              grants={access[profile.id]}
              stats={stats}
              studentDestination={studentDestination}
            />
          ))}
          {canCreateProfile ? <AddChildCard note={addNote} /> : null}
        </ul>
        {/* O limite do plano já mora no cartão de adicionar; o recado só aparece no limite,
            ilimitado ou quando a consulta falhou. */}
        {!canCreateProfile || !limited ? (
          <ProfileAllowanceNote allowance={profileAllowance} profilesCount={profiles.length} />
        ) : null}
      </ParentSection>
      {guideStep ? null : (
        <ParentSection
          title="Como funciona o acesso"
          action={
            <Link
              href="/pais/ajuda"
              className="inline-flex min-h-11 items-center gap-1 font-bold text-primary text-sm"
            >
              Ver o passo a passo completo <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          }
        >
          <NumberedSteps steps={HOW_IT_WORKS} />
        </ParentSection>
      )}
    </ParentShell>
  )
}
