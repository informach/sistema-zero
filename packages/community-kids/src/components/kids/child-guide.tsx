'use client'

import { Button } from '@sistemazero/ui/button'
import Link from 'next/link'
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { GuideBalloon, GuideReopenButton, GuideWelcomeDialog } from '@/components/kids/parent-guide'
import {
  childGuideAvatarDismissedKey,
  childGuideStartDismissedKey,
  childGuideWelcomeSeenKey,
  childWelcomeSteps,
  clearGuideFlag,
  clearSessionGuideFlag,
  readGuideFlag,
  readSessionGuideFlag,
  resolveChildGuideStep,
  writeGuideFlag,
  writeSessionGuideFlag,
} from '@/lib/guide'
import { trackOnboardingEvent } from '@/lib/onboarding-telemetry'

const ChildGuideStartContext = createContext<string | undefined>(undefined)

export function useChildGuideStartDescriptionId(): string | undefined {
  return useContext(ChildGuideStartContext)
}

/**
 * Tutorial guiado da CRIANÇA (fase 2, 08/2026) — na home, os dois destravadores
 * do primeiro uso: o AVATAR (o que mais motiva, e não tem item de menu — só o
 * clique no rosto em /perfil, invisível para quem chegou agora) e o "Começar" do
 * ContinueHero (a primeira aula). Mesmo espírito do guia dos pais: os passos
 * derivam do ESTADO e somem sozinhos quando a coisa acontece — montou o avatar,
 * o convite some; abriu a 1ª aula, o aponte some. "Agora não" adia o avatar
 * somente até o fim da sessão atual. Renderizado entre a
 * saudação e o ContinueHero (o balão 'start' aponta para BAIXO, direto no herói).
 */

export function ChildGuide({
  profileKey,
  childName,
  hasAvatar,
  hasCourseActivity,
  startAvailable,
  children,
}: {
  /** Id do PERFIL ativo (a home sempre roda em sessão de perfil). */
  profileKey: string
  childName: string | null
  /** `null` = não foi possível consultar o avatar; nesse caso não fazemos convite baseado em suposição. */
  hasAvatar: boolean | null
  hasCourseActivity: boolean
  /** Existe curso liberado para apontar (sem curso, a cobrança é dos pais). */
  startAvailable: boolean
  children?: ReactNode
}) {
  // Visibilidade decidida em efeito pós-mount: SSR e 1º render do cliente
  // concordam em "nada" (lição de hidratação do focus-mode, 03/08). Começa tudo
  // dispensado para não piscar o balão antes de ler o localStorage.
  const [avatarDismissed, setAvatarDismissed] = useState(true)
  const [startDismissed, setStartDismissed] = useState(true)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const focusAfterWelcomeRef = useRef(false)
  const avatarCtaRef = useRef<HTMLAnchorElement>(null)
  const startDismissRef = useRef<HTMLButtonElement>(null)
  const reopenRef = useRef<HTMLButtonElement>(null)
  const welcomeSteps = useMemo(
    () => childWelcomeSteps({ hasAvatar, hasCourseActivity, startAvailable }),
    [hasAvatar, hasCourseActivity, startAvailable],
  )
  useEffect(() => {
    setAvatarDismissed(readSessionGuideFlag(childGuideAvatarDismissedKey(profileKey)))
    setStartDismissed(readGuideFlag(childGuideStartDismissedKey(profileKey)))
    // Boas-vindas 1× por perfil neste navegador — e só se houver o que guiar.
    // Falha na API do avatar é "desconhecido", não evidência de que ele falta.
    const somethingToGuide = welcomeSteps.some((welcomeStep) => welcomeStep.id !== 'xp')
    if (somethingToGuide && !readGuideFlag(childGuideWelcomeSeenKey(profileKey))) {
      setWelcomeOpen(true)
      trackOnboardingEvent({ audience: 'child', action: 'welcome_opened', step: 'welcome' })
    }
  }, [profileKey, welcomeSteps])

  const resolvedStep = resolveChildGuideStep({
    hasAvatar,
    hasCourseActivity,
    startAvailable,
    avatarDismissed,
    startDismissed,
  })
  const step = welcomeOpen ? null : resolvedStep

  useEffect(() => {
    if (welcomeOpen || !focusAfterWelcomeRef.current) return
    focusAfterWelcomeRef.current = false
    if (step === 'avatar') avatarCtaRef.current?.focus()
    else if (step === 'start') startDismissRef.current?.focus()
    else reopenRef.current?.focus()
  }, [welcomeOpen, step])

  function closeWelcome(action: 'welcome_completed' | 'welcome_dismissed') {
    writeGuideFlag(childGuideWelcomeSeenKey(profileKey))
    focusAfterWelcomeRef.current = true
    setWelcomeOpen(false)
    trackOnboardingEvent({ audience: 'child', action, step: 'welcome' })
  }

  function reopenGuide() {
    clearSessionGuideFlag(childGuideAvatarDismissedKey(profileKey))
    clearGuideFlag(childGuideStartDismissedKey(profileKey))
    setAvatarDismissed(false)
    setStartDismissed(false)
    setWelcomeOpen(true)
    trackOnboardingEvent({ audience: 'child', action: 'guide_reopened', step: 'welcome' })
    trackOnboardingEvent({ audience: 'child', action: 'welcome_opened', step: 'welcome' })
  }

  return (
    <ChildGuideStartContext.Provider value={step === 'start' ? 'child-start-guide' : undefined}>
      {step === 'avatar' ? (
        <GuideBalloon
          arrow="none"
          descriptionId="child-avatar-guide"
          actions={
            <>
              <Link
                ref={avatarCtaRef}
                href="/meu-avatar?returnTo=%2F"
                aria-describedby="child-avatar-guide"
                onClick={() =>
                  trackOnboardingEvent({ audience: 'child', action: 'cta_clicked', step: 'avatar' })
                }
                className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 font-bold text-primary-foreground text-sm shadow-[0_3px_0_color-mix(in_oklch,var(--primary)_55%,black)] transition-[transform,filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 active:translate-y-[2px]"
              >
                Criar meu avatar
              </Link>
              <Button
                size="sm"
                variant="ghost"
                className="min-h-11"
                onClick={() => {
                  writeSessionGuideFlag(childGuideAvatarDismissedKey(profileKey))
                  setAvatarDismissed(true)
                  trackOnboardingEvent({
                    audience: 'child',
                    action: 'step_deferred',
                    step: 'avatar',
                  })
                }}
              >
                Agora não
              </Button>
            </>
          }
        >
          Que tal montar o SEU avatar? Você escolhe o cabelo, a roupa, tudo! 😄
        </GuideBalloon>
      ) : null}
      {step === 'start' ? (
        <GuideBalloon
          arrow="down"
          descriptionId="child-start-guide"
          dismissButtonRef={startDismissRef}
          onDismiss={() => {
            writeGuideFlag(childGuideStartDismissedKey(profileKey))
            setStartDismissed(true)
            trackOnboardingEvent({ audience: 'child', action: 'step_completed', step: 'start' })
          }}
        >
          Sua primeira aula está te esperando! Toque em <strong>Começar</strong> 👇
        </GuideBalloon>
      ) : null}
      {children}
      <GuideWelcomeDialog
        open={welcomeOpen}
        onClose={() => closeWelcome('welcome_dismissed')}
        onContinue={() => closeWelcome('welcome_completed')}
        title={childName ? `Oi, ${childName}! Eu sou o Zappy! 👋` : 'Oi! Eu sou o Zappy! 👋'}
        description="Vem ver como tudo funciona por aqui:"
        steps={welcomeSteps}
      />
      <div className="flex justify-end">
        <GuideReopenButton buttonRef={reopenRef} onClick={reopenGuide} />
      </div>
    </ChildGuideStartContext.Provider>
  )
}
