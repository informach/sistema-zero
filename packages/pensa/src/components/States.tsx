/**
 * Os estados do Pensa (Canvas "Estados"): toda espera, erro e bloqueio fala na voz do Zappy, diz
 * o que aconteceu com o jogo e mostra um próximo passo. Nenhum estado vira texto solto.
 */
import type { ReactNode } from 'react'
import { usePensaUi } from './context'
import { AlertIcon, CheckIcon, EyeIcon, PauseIcon } from './icons'
import { Chip, Mascot } from './ui'

/** As ideias (ou os créditos) acabaram: o plano continua aberto, só a conversa descansa. */
export function IdeasExhausted({ actions }: { actions?: ReactNode }) {
  const { credits, kids, copy } = usePensaUi()
  const month = credits.scope === 'month'
  if (!kids)
    return (
      <section className="pz-card pz-state" aria-labelledby="pz-exhausted">
        <h2 id="pz-exhausted" className="pz-title pz-title--md">
          {month ? 'Os créditos deste mês acabaram' : 'Os créditos de hoje acabaram'}
        </h2>
        <p>{credits.exhausted}</p>
        {actions ? <div className="pz-row">{actions}</div> : null}
      </section>
    )
  return (
    <section className="pz-card pz-state" aria-labelledby="pz-exhausted">
      <Mascot pose="sleeping" size={120} className="pz-anim-sleep" />
      <Chip tone="yellow" className="pz-self-start">
        0 {copy.unit(0)} {month ? 'este mês' : 'hoje'}
      </Chip>
      <h2 id="pz-exhausted" className="pz-title pz-title--md">
        {month ? 'As ideias deste mês acabaram' : 'As ideias de hoje acabaram'}
      </h2>
      <p>
        {month ? `O Zappy descansa um pouco. ${credits.renews}` : 'O Zappy descansa até amanhã.'} O
        plano e as missões continuam abertos, e dá para seguir construindo nas oficinas.
      </p>
      {actions ? <div className="pz-row">{actions}</div> : null}
    </section>
  )
}

/** "Deu um tropeço. A sua ideia está guardada.": a operação falhou e nada se perdeu. */
export function OperationFailed({
  kind,
  quote,
  busy,
  onRetry,
  onEdit,
}: {
  kind: 'planning' | 'help' | 'other'
  quote?: string | null
  busy: boolean
  onRetry(): void
  onEdit?: () => void
}) {
  const { copy, readOnly } = usePensaUi()
  return (
    <section className="pz-card pz-state" aria-labelledby="pz-failed">
      <Mascot pose="thinking" size={120} />
      <h2 id="pz-failed" className="pz-title pz-title--md">
        {kind === 'help'
          ? 'Deu um tropeço. A sua pergunta está guardada.'
          : 'Deu um tropeço. A sua ideia está guardada.'}
      </h2>
      <p>{copy.failedSaved}</p>
      {quote ? <blockquote className="pz-quote">“{quote}”</blockquote> : null}
      <div className="pz-row">
        <button
          type="button"
          className="pz-btn pz-btn--action"
          disabled={busy || readOnly}
          onClick={onRetry}
        >
          Tentar de novo
        </button>
        {onEdit ? (
          <button
            type="button"
            className="pz-btn pz-btn--card"
            disabled={busy || readOnly}
            onClick={onEdit}
          >
            Mudar o texto
          </button>
        ) : null}
      </div>
    </section>
  )
}

/** O Pensa (ou um jogo) não abriu: os dados estão guardados, é só tentar de novo. */
export function LoadError({
  title,
  text,
  onRetry,
}: {
  title: string
  text: string
  onRetry(): void
}) {
  return (
    <section className="pz-card pz-state pz-state--center" aria-labelledby="pz-load-error">
      <Mascot pose="thinking" size={96} />
      <h2 id="pz-load-error" className="pz-title pz-title--md">
        {title}
      </h2>
      <p>{text}</p>
      <div className="pz-row">
        <button type="button" className="pz-btn pz-btn--action" onClick={onRetry}>
          Tentar de novo
        </button>
      </div>
    </section>
  )
}

/** Os cartões fantasmas têm o formato dos cartões de verdade: a página não pula. */
export function ListSkeleton() {
  return (
    <section className="pz-skeleton" aria-busy="true" aria-labelledby="pz-skeleton-title">
      <h2 id="pz-skeleton-title" className="pz-sr-only">
        Abrindo os seus jogos
      </h2>
      <div className="pz-skeleton__head" aria-hidden="true">
        <div className="pz-bone" style={{ width: 56, height: 56, borderRadius: 16 }} />
        <div className="pz-skeleton__lines">
          <div className="pz-bone" style={{ height: 14, width: '40%' }} />
          <div className="pz-bone" style={{ height: 30, width: '60%' }} />
        </div>
      </div>
      <div className="pz-games" aria-hidden="true">
        {[0, 1, 2].map((item) => (
          <div key={item} className="pz-card pz-skeleton__card">
            <div className="pz-bone" style={{ height: 92, borderRadius: 0 }} />
            <div className="pz-skeleton__lines">
              <div className="pz-bone" style={{ height: 22, width: '60%' }} />
              <div className="pz-bone" style={{ height: 14, width: '85%' }} />
              <div className="pz-bone" style={{ height: 10, width: '100%', borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
      <p className="pz-sr-only" role="status">
        Abrindo os seus jogos
      </p>
    </section>
  )
}

export function ProjectSkeleton() {
  return (
    <section className="pz-skeleton pz-skeleton--project" aria-busy="true">
      <p className="pz-sr-only" role="status">
        Abrindo o seu jogo
      </p>
      <div className="pz-skeleton__head" aria-hidden="true">
        <div className="pz-bone" style={{ width: 44, height: 44, borderRadius: 12 }} />
        <div className="pz-bone" style={{ height: 28, width: 260 }} />
      </div>
      <div className="pz-skeleton__cols" aria-hidden="true">
        <div className="pz-skeleton__main">
          <div className="pz-card pz-bone" style={{ height: 260 }} />
          <div className="pz-card pz-bone" style={{ height: 320 }} />
        </div>
        <div className="pz-card pz-bone pz-skeleton__aside" style={{ height: 520 }} />
      </div>
    </section>
  )
}

/** Jogo pausado ou em Guardados: as missões esperam, e quem é dona traz de volta. */
export function StatusBanner({
  paused,
  archived,
  owner,
  busy,
  onResume,
  onRestore,
}: {
  paused: boolean
  archived: boolean
  owner: boolean
  busy: boolean
  onResume(): void
  onRestore(): void
}) {
  const { readOnly } = usePensaUi()
  if (!paused && !archived) return null
  return (
    <div className="pz-banner is-yellow" role="status">
      <PauseIcon size={20} />
      <span>
        {archived
          ? 'Este jogo está em Guardados. As missões ficam paradas até ele voltar.'
          : 'Este jogo está pausado. As missões esperam você voltar.'}
      </span>
      {owner && !readOnly ? (
        <button
          type="button"
          className="pz-btn pz-btn--card pz-btn--sm"
          disabled={busy}
          onClick={archived ? onRestore : onResume}
        >
          {archived ? 'Trazer de volta' : 'Continuar de onde parei'}
        </button>
      ) : null}
    </div>
  )
}

/** Sessão de suporte só leitura: dá para olhar, nada muda. */
export function SupportBanner({ name }: { name: string | null }) {
  return (
    <div className="pz-support" role="note">
      <EyeIcon size={20} />
      <span>
        {name ? `Você está vendo o Pensa de ${name}.` : 'Você está vendo este Pensa.'} Nada muda
        enquanto você olha.
      </span>
    </div>
  )
}

export interface PensaToast {
  id: number
  message: string
  tone: 'ok' | 'error'
}

/** Avisos curtos que somem sozinhos ("Código copiado.", "Versão guardada."). */
export function Toasts({ toasts }: { toasts: PensaToast[] }) {
  return (
    <div className="pz-toasts">
      <div role="status" aria-live="polite">
        {toasts
          .filter((toast) => toast.tone === 'ok')
          .map((toast) => (
            <p key={toast.id} className="pz-toast is-ok">
              <CheckIcon size={18} />
              {toast.message}
            </p>
          ))}
      </div>
      {toasts.some((toast) => toast.tone === 'error') ? (
        <div role="alert">
          {toasts
            .filter((toast) => toast.tone === 'error')
            .map((toast) => (
              <p key={toast.id} className="pz-toast is-error">
                <AlertIcon size={18} />
                {toast.message}
              </p>
            ))}
        </div>
      ) : null}
    </div>
  )
}
