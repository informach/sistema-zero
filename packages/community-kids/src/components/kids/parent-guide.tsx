'use client'

import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { HelpCircle } from 'lucide-react'
import { KidsMascot } from '@/components/kids/mascot'
import type { GuideWelcomeStep } from '@/lib/guide'

/**
 * Tutorial guiado de primeiro acesso — a APRESENTAÇÃO do guia dos pais.
 *
 * Cada balão nasce no mesmo contêiner do alvo; em telas estreitas, os que poderiam
 * transbordar ficam presos à viewport. Assim eles sobrevivem aos early returns do
 * `perfis-client` (ProfileForm/PurchasesView trocam a página inteira) e ignoram o
 * layout-shift dos skeletons do ChildrenDashboard — zero medição de coordenada.
 * O cérebro (que passo mostrar) é puro, em
 * `@/lib/guide.ts`; aqui só se desenha.
 */

/**
 * Balão do guia apontando um alvo adjacente. `arrow` diz de onde a seta sai
 * (o balão fica do lado OPOSTO do alvo): 'down' = alvo abaixo do balão.
 */
export function GuideBalloon({
  children,
  arrow = 'down',
  onDismiss,
  actions,
  className,
  mobileFloating = false,
  dismissButtonRef,
  descriptionId,
}: {
  children: React.ReactNode
  /** De onde a seta sai ('down' = o alvo está ABAIXO do balão); 'none' = aviso solto. */
  arrow?: 'down' | 'up' | 'none'
  /** Presente → mostra o "Entendi" (o arremate final do guia). */
  onDismiss?: () => void
  /** Ações customizadas (fase 2, criança: "Criar meu avatar"/"Agora não") — vence o `onDismiss`. */
  actions?: React.ReactNode
  className?: string
  /** Em alvos estreitos, fixa o balão dentro da viewport no mobile. */
  mobileFloating?: boolean
  dismissButtonRef?: React.Ref<HTMLButtonElement>
  /** Liga semanticamente a instrução ao controle apontado via `aria-describedby`. */
  descriptionId?: string
}) {
  return (
    <div
      role="status"
      className={[
        'relative mx-auto flex min-w-0 w-[min(22rem,calc(100vw-2rem))] max-w-none items-start gap-3 rounded-2xl border-2 border-primary bg-card p-4 text-left shadow-[0_3px_0_var(--border)]',
        mobileFloating
          ? 'max-sm:fixed max-sm:inset-x-4 max-sm:bottom-4 max-sm:z-40 max-sm:w-auto'
          : '',
        className ?? '',
      ].join(' ')}
    >
      {/* Seta CSS apontando o alvo (losango girado, mesma borda do balão). */}
      {arrow !== 'none' ? (
        <span
          aria-hidden="true"
          className={[
            'absolute left-1/2 size-3 -translate-x-1/2 rotate-45 border-primary bg-card',
            mobileFloating ? 'max-sm:hidden' : '',
            arrow === 'down'
              ? '-bottom-[7px] border-r-2 border-b-2'
              : '-top-[7px] border-t-2 border-l-2',
          ].join(' ')}
        />
      ) : null}
      <KidsMascot expression="happy" className="size-10 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p
          id={descriptionId}
          className="break-words text-foreground text-sm [overflow-wrap:anywhere]"
        >
          {children}
        </p>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : onDismiss ? (
          <Button
            ref={dismissButtonRef}
            size="sm"
            variant="secondary"
            onClick={onDismiss}
            className="min-h-11 self-start"
          >
            Entendi!
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/** Item da grade com largura do ALVO, não do balão que pode transbordar visualmente. */
export function GuideTargetItem({ children }: { children: React.ReactNode }) {
  return <li className="flex w-28 shrink-0 flex-col items-center gap-3">{children}</li>
}

/** Alvo "Concluir" com copy fiel à transição que de fato aconteceu. */
export function ParentConcludeTarget({
  created,
  showGuide = true,
  busy,
  onConclude,
}: {
  created: boolean
  showGuide?: boolean
  busy: boolean
  onConclude: () => void
}) {
  const descriptionId = showGuide ? 'parent-conclude-guide' : undefined
  return (
    <div className="flex w-36 shrink-0 flex-col items-center gap-3">
      {showGuide ? (
        <GuideBalloon arrow="down" mobileFloating descriptionId={descriptionId}>
          {created ? (
            <>
              Perfil criado! 🎉 Agora toque em <strong>Concluir</strong> para fechar a área dos
              pais.
            </>
          ) : (
            <>
              Tudo certo por aqui. Toque em <strong>Concluir</strong> para fechar a área dos pais.
            </>
          )}
        </GuideBalloon>
      ) : null}
      <Button
        variant="secondary"
        onClick={onConclude}
        disabled={busy}
        aria-describedby={descriptionId}
      >
        Concluir
      </Button>
    </div>
  )
}

/**
 * Modal de boas-vindas do primeiro acesso (molde do `ClubeCombinados`): Dialog do
 * ui (foco/Esc/trap grátis via useModalA11y) + Zappy + passos ilustrados.
 * GENÉRICO desde a fase 2 (o guia da criança reusa com copy própria); o link
 * "Pular tutorial" só existe com `onSkip` — o guia da criança NÃO tem pular
 * (cada balão dela se dispensa sozinho ou pelo estado). Quem decide QUANDO
 * auto-abrir é o chamador (a visibilidade se resolve em efeito pós-mount, nunca
 * no render — lição de hidratação do focus-mode).
 */
export function GuideWelcomeDialog({
  open,
  onClose,
  onContinue,
  onSkip,
  title,
  description,
  steps,
}: {
  open: boolean
  onClose: () => void
  /** CTA positivo; separado do X/Esc/backdrop para medir conclusão vs. abandono. */
  onContinue?: () => void
  /** "Pular tutorial": encerra todo o fluxo guiado (só o guia dos pais usa). */
  onSkip?: () => void
  title: string
  description: string
  steps: readonly GuideWelcomeStep[]
}) {
  if (!open) return null
  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      description={description}
      className="max-w-md rounded-3xl"
      footer={
        <div
          className={[
            'flex w-full flex-wrap items-center gap-3',
            onSkip ? 'justify-between' : 'justify-end',
          ].join(' ')}
        >
          {onSkip ? (
            <button
              type="button"
              onClick={onSkip}
              className="min-h-11 rounded-md px-1 text-muted-foreground text-sm underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
            >
              Pular tutorial
            </button>
          ) : null}
          <Button onClick={onContinue ?? onClose} className="min-h-11">
            Vamos lá! 🚀
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-4">
        <KidsMascot expression="happy" className="size-20" />
        <ul className="flex flex-col gap-3">
          {steps.map((step) => (
            <li key={step.id} className="flex items-start gap-3">
              <span aria-hidden="true" className="text-xl">
                {step.emoji}
              </span>
              <span className="text-foreground text-sm">{step.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </Dialog>
  )
}

/**
 * "Como funciona?" — reabre o tutorial a qualquer momento (precedente: o botão
 * "📋 Combinados" do Clube). Fica na fileira de ações da grade.
 */
export function GuideReopenButton({
  onClick,
  buttonRef,
}: {
  onClick: () => void
  buttonRef?: React.Ref<HTMLButtonElement>
}) {
  return (
    <Button ref={buttonRef} variant="ghost" onClick={onClick}>
      <HelpCircle className="size-4" /> Como funciona?
    </Button>
  )
}
