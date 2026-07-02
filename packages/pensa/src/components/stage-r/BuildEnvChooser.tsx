/**
 * CHOOSER "Onde você vai construir?" (etapa R): 3 cartões grandes, um por
 * ambiente ('embedded' recomendado com badge, 'studio', 'external'). Aparece
 * ANTES de tudo quando o projeto ainda não escolheu (buildEnv null) e reabre
 * pelo botão "Trocar" do header (aí ganha o "Deixa como está" para desistir
 * sem mudar nada). Escolher dispara o PATCH via projectStore.setBuildEnv.
 */
import { clsx } from 'clsx'
import type { JSX } from 'react'
import type { PensaBuildEnv } from '../../core/types'
import { usePensaApp } from '../appContext'
import { ZappyImage } from '../common/ZappyImage'

const ENV_ORDER: readonly PensaBuildEnv[] = ['embedded', 'studio', 'external'] as const

/** Também usado no chip discreto do header da etapa R. */
export const ENV_EMOJI: Record<PensaBuildEnv, string> = {
  embedded: '🧩',
  studio: '🎨',
  external: '💻',
}

export function BuildEnvChooser({
  current,
  busy,
  error,
  onChoose,
  onKeep,
}: {
  /** Escolha atual do projeto (null = primeira vez, sem "Deixa como está"). */
  current: PensaBuildEnv | null
  /** PATCH em voo: desabilita os cartões. */
  busy: boolean
  error: string | null
  onChoose: (env: PensaBuildEnv) => void
  /** Presente quando o chooser foi REABERTO via "Trocar" (fecha sem mudar). */
  onKeep: (() => void) | null
}): JSX.Element {
  const { copy } = usePensaApp()
  const c = copy.buildEnv

  return (
    <section
      aria-label={c.title}
      className="flex flex-col items-center gap-4 rounded-3xl border-2 border-pz-border bg-pz-surface px-6 py-10 text-center"
    >
      <ZappyImage pose="happy" fallbackEmoji="🏗️" className="h-20 w-20 object-contain text-5xl" />
      <h3 className="text-2xl font-extrabold text-pz-text">{c.title}</h3>
      <p className="max-w-md text-pz-muted">{c.subtitle}</p>

      {error ? (
        <p role="alert" className="font-semibold text-pz-warn">
          {error}
        </p>
      ) : null}

      <div className="grid w-full max-w-3xl gap-3 sm:grid-cols-3">
        {ENV_ORDER.map((env) => (
          <button
            key={env}
            type="button"
            onClick={() => onChoose(env)}
            disabled={busy}
            aria-busy={busy || undefined}
            className={clsx(
              'flex min-h-44 flex-col items-center gap-2 rounded-3xl border-2 bg-pz-bg p-4 text-center transition hover:border-pz-accent disabled:cursor-not-allowed disabled:opacity-60',
              current === env ? 'border-pz-accent' : 'border-pz-border',
            )}
          >
            {env === 'embedded' ? (
              <span className="rounded-full bg-pz-accent/15 px-2.5 py-0.5 text-xs font-bold text-pz-accent">
                <span aria-hidden="true">⭐ </span>
                {c.recommended}
              </span>
            ) : null}
            <span aria-hidden="true" className="text-4xl">
              {ENV_EMOJI[env]}
            </span>
            <span className="text-lg leading-snug font-extrabold text-pz-text">
              {c.cards[env].title}
            </span>
            <span className="text-sm leading-snug text-pz-muted">{c.cards[env].body}</span>
          </button>
        ))}
      </div>

      {onKeep ? (
        <button
          type="button"
          onClick={onKeep}
          disabled={busy}
          className="min-h-11 rounded-2xl border-2 border-pz-border px-5 font-semibold text-pz-muted transition hover:border-pz-accent hover:text-pz-text disabled:cursor-not-allowed disabled:opacity-60"
        >
          {c.keep}
        </button>
      ) : null}
    </section>
  )
}
