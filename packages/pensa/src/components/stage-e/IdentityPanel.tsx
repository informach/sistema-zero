/**
 * Funil de identidade da etapa E, um passo por vez: 1) NOME (3 sugestões ou
 * inventar o seu), 2) PALETA (4 cards de swatches — escolher repinta os
 * wireframes via chosenPalette na store) e 3) ÍCONE (SVGs sanitizados do BFF
 * renderizados via <img src="data:image/svg+xml;utf8,..."> — defesa em
 * profundidade: NUNCA dangerouslySetInnerHTML). Salvar → card resumo ('done').
 */
import { clsx } from 'clsx'
import type { FormEvent, JSX } from 'react'
import { useEffect, useId, useState } from 'react'
import { useStore } from 'zustand'
import { PENSA_NAME_MAX, PENSA_NAME_MIN } from '../../core/limits'
import { type PensaIdentityPalette, parseIdentityContent } from '../../core/specContent'
import { MAX_ICON_GENERATIONS, type PensaStageEStore } from '../../state/stageEStore'
import { usePensaApp } from '../appContext'
import { ZappyImage } from '../common/ZappyImage'

const NAME_MAX = PENSA_NAME_MAX

/** SVG sanitizado → data URI de <img> (nunca vira markup no DOM). */
function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function LoadingDots(): JSX.Element {
  return (
    <span aria-hidden="true" className="flex gap-1">
      {['a', 'b', 'c'].map((key, index) => (
        <span
          key={key}
          className="h-2 w-2 animate-bounce rounded-full bg-pz-accent motion-reduce:animate-none"
          style={{ animationDelay: `${index * 0.15}s` }}
        />
      ))}
    </span>
  )
}

const STEP_ORDER = ['name', 'palette', 'icon'] as const
type FunnelStep = (typeof STEP_ORDER)[number]

function StepDots({
  step,
  labels,
}: {
  step: FunnelStep
  labels: Record<FunnelStep, string>
}): JSX.Element {
  const current = STEP_ORDER.indexOf(step)
  return (
    <ol
      aria-label={`Passo ${current + 1} de ${STEP_ORDER.length}`}
      className="flex flex-wrap gap-2"
    >
      {STEP_ORDER.map((key, index) => {
        const state = index < current ? 'done' : index === current ? 'current' : 'todo'
        return (
          <li
            key={key}
            data-step={key}
            data-state={state}
            className={clsx(
              'flex min-h-7 items-center gap-1.5 rounded-full border-2 px-2.5 text-xs font-bold',
              state === 'current' && 'border-pz-accent text-pz-accent',
              state === 'done' && 'border-pz-ok text-pz-ok',
              state === 'todo' && 'border-pz-border text-pz-muted',
            )}
          >
            <span aria-hidden="true">{state === 'done' ? '✓' : index + 1}</span>
            {labels[key]}
          </li>
        )
      })}
    </ol>
  )
}

function PaletteSwatches({ colors }: { colors: string[] }): JSX.Element {
  return (
    <span className="flex gap-1.5">
      {colors.map((color, index) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: cores podem repetir na paleta; a posição é a identidade.
          key={`${color}-${index}`}
          aria-hidden="true"
          className="h-8 w-8 rounded-lg border border-pz-border"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  )
}

export function IdentityPanel({
  store,
  projectId,
}: {
  store: PensaStageEStore
  projectId: string
}): JSX.Element {
  const { copy } = usePensaApp()
  const c = copy.stageE.identity

  const step = useStore(store, (s) => s.identityStep)
  const identity = useStore(store, (s) => s.identity)
  const suggestions = useStore(store, (s) => s.suggestions)
  const loadingSuggestions = useStore(store, (s) => s.loadingSuggestions)
  const chosenName = useStore(store, (s) => s.chosenName)
  const chosenPalette = useStore(store, (s) => s.chosenPalette)
  const icons = useStore(store, (s) => s.icons)
  const loadingIcons = useStore(store, (s) => s.loadingIcons)
  const iconGenerations = useStore(store, (s) => s.iconGenerations)
  const chosenIconIndex = useStore(store, (s) => s.chosenIconIndex)
  const savingIdentity = useStore(store, (s) => s.savingIdentity)
  const identityError = useStore(store, (s) => s.identityError)

  const [inventing, setInventing] = useState(false)
  const [customName, setCustomName] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const inventId = useId()

  // Sugestões do passo 1 carregam sozinhas (uma vez; erro para o loop e o
  // botão de retry reassume).
  useEffect(() => {
    if (step !== 'name' || suggestions || loadingSuggestions || identityError) return
    void store.getState().loadSuggestions(projectId)
  }, [step, suggestions, loadingSuggestions, identityError, store, projectId])

  // Ícones do passo 3 idem (dependem do nome + paleta escolhidos).
  useEffect(() => {
    if (step !== 'icon' || icons !== null || loadingIcons || identityError) return
    void store.getState().generateIcons(projectId)
  }, [step, icons, loadingIcons, identityError, store, projectId])

  const handleInvent = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault()
    const trimmed = customName.trim()
    if (trimmed.length < PENSA_NAME_MIN) {
      setNameError(c.nameTooShort)
      return
    }
    setNameError(null)
    store.getState().chooseName(trimmed)
  }

  const handleSkipIcon = (): void => {
    store.getState().chooseIcon(null)
    void store.getState().saveIdentity(projectId)
  }

  if (step === 'done') {
    const content = identity ? parseIdentityContent(identity.content) : null
    const doneName = content?.name ?? chosenName ?? ''
    const donePalette: PensaIdentityPalette | null = content?.palette ?? chosenPalette
    const doneIconSvg = content
      ? content.iconSvg
      : chosenIconIndex !== null
        ? (icons?.[chosenIconIndex] ?? null)
        : null
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-pz-ok bg-pz-bg p-5 text-center">
        <p className="text-xs font-bold tracking-widest text-pz-ok uppercase">
          <span aria-hidden="true">🏷️ </span>
          {c.doneTitle}
        </p>
        <p className="text-sm text-pz-muted">{c.doneBody}</p>
        {doneIconSvg ? (
          <img src={svgToDataUri(doneIconSvg)} alt={c.iconAlt} className="h-16 w-16" />
        ) : (
          <p className="text-sm font-semibold text-pz-muted">{c.noIcon}</p>
        )}
        <p className="text-2xl leading-snug font-extrabold break-words text-pz-text">{doneName}</p>
        {donePalette ? (
          <div className="flex flex-col items-center gap-1">
            <PaletteSwatches colors={donePalette.colors} />
            <p className="text-xs font-semibold text-pz-muted">{donePalette.name}</p>
          </div>
        ) : null}
        {identityError ? (
          <p role="alert" className="text-sm font-semibold text-pz-warn">
            {identityError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => store.getState().reopenIdentity()}
          className="min-h-11 rounded-2xl border-2 border-pz-border px-4 font-semibold text-pz-muted transition hover:border-pz-accent hover:text-pz-accent"
        >
          <span aria-hidden="true">✏️ </span>
          {c.editIdentity}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-pz-muted">{c.intro}</p>
        <StepDots step={step} labels={c.steps} />
      </div>

      {step === 'name' ? (
        loadingSuggestions ? (
          <div
            role="status"
            aria-busy="true"
            className="flex items-center gap-2 py-4 font-semibold text-pz-muted"
          >
            <ZappyImage pose="thinking" fallbackEmoji="💭" className="h-9 w-9 object-contain" />
            <LoadingDots />
            {c.loadingSuggestions}
          </div>
        ) : suggestions ? (
          <>
            <p className="text-lg font-bold text-pz-text">{c.nameQuestion}</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {suggestions.names.slice(0, 3).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => store.getState().chooseName(name)}
                  className="min-h-14 rounded-2xl border-2 border-pz-border bg-pz-surface px-4 text-lg leading-snug font-bold break-words text-pz-text transition hover:border-pz-accent"
                >
                  {name}
                </button>
              ))}
            </div>
            {inventing ? (
              <form onSubmit={handleInvent} className="flex flex-col gap-2">
                <div className="flex flex-wrap items-stretch gap-2">
                  <label htmlFor={inventId} className="sr-only">
                    {c.inventNameLabel}
                  </label>
                  <input
                    id={inventId}
                    type="text"
                    value={customName}
                    maxLength={NAME_MAX}
                    autoComplete="off"
                    onChange={(event) => {
                      setCustomName(event.target.value)
                      setNameError(null)
                    }}
                    placeholder={c.inventNamePlaceholder}
                    className="min-h-12 min-w-0 flex-1 rounded-2xl border-2 border-pz-border bg-pz-surface px-4 text-pz-text outline-none placeholder:text-pz-muted focus:border-pz-accent"
                  />
                  <button
                    type="submit"
                    className="min-h-12 shrink-0 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105"
                  >
                    {c.inventNameSubmit}
                  </button>
                </div>
                {nameError ? (
                  <p role="alert" className="text-sm font-semibold text-pz-warn">
                    {nameError}
                  </p>
                ) : null}
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setInventing(true)}
                className="min-h-11 self-start rounded-2xl border-2 border-dashed border-pz-border px-4 font-semibold text-pz-muted transition hover:border-pz-accent hover:text-pz-accent"
              >
                <span aria-hidden="true">✏️ </span>
                {c.inventName}
              </button>
            )}
          </>
        ) : identityError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-pz-warn bg-pz-bg px-4 py-3">
            <p role="alert" className="font-semibold text-pz-warn">
              {identityError}
            </p>
            <button
              type="button"
              onClick={() => void store.getState().loadSuggestions(projectId)}
              className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105"
            >
              {copy.errors.retry}
            </button>
          </div>
        ) : null
      ) : null}

      {step === 'palette' ? (
        <>
          <button
            type="button"
            onClick={() => store.getState().backToNameStep()}
            className="min-h-11 self-start rounded-2xl border-2 border-pz-border px-4 font-semibold text-pz-muted transition hover:border-pz-accent hover:text-pz-accent"
          >
            <span aria-hidden="true">← </span>
            {c.back}
          </button>
          <p className="text-lg font-bold text-pz-text">{c.paletteQuestion}</p>
          <p className="text-sm font-semibold text-pz-muted">
            <span aria-hidden="true">🖌️ </span>
            {c.paletteHint}
          </p>
          {suggestions ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {suggestions.palettes.slice(0, 4).map((palette) => (
                <button
                  key={palette.name}
                  type="button"
                  onClick={() => store.getState().choosePalette(palette)}
                  className={clsx(
                    'flex min-h-16 flex-col gap-2 rounded-2xl border-2 bg-pz-surface p-3 text-left transition hover:border-pz-accent',
                    chosenPalette?.name === palette.name ? 'border-pz-accent' : 'border-pz-border',
                  )}
                >
                  <PaletteSwatches colors={palette.colors} />
                  <span className="font-bold text-pz-text">{palette.name}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-pz-warn bg-pz-bg px-4 py-3">
              <p role="alert" className="font-semibold text-pz-warn">
                {identityError ?? copy.errors.title}
              </p>
              <button
                type="button"
                onClick={() => void store.getState().loadSuggestions(projectId)}
                className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105"
              >
                {copy.errors.retry}
              </button>
            </div>
          )}
        </>
      ) : null}

      {step === 'icon' ? (
        <>
          <button
            type="button"
            onClick={() => store.getState().backToPaletteStep()}
            disabled={savingIdentity}
            className="min-h-11 self-start rounded-2xl border-2 border-pz-border px-4 font-semibold text-pz-muted transition hover:border-pz-accent hover:text-pz-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span aria-hidden="true">← </span>
            {c.back}
          </button>
          <p className="text-lg font-bold text-pz-text">{c.iconQuestion}</p>
          {loadingIcons ? (
            <div
              role="status"
              aria-busy="true"
              className="flex items-center gap-2 py-4 font-semibold text-pz-muted"
            >
              <ZappyImage pose="thinking" fallbackEmoji="💭" className="h-9 w-9 object-contain" />
              <LoadingDots />
              {c.loadingIcons}
            </div>
          ) : icons ? (
            <>
              <div className="flex flex-wrap gap-3">
                {icons.map((svg, index) => (
                  <button
                    // biome-ignore lint/suspicious/noArrayIndexKey: SVGs podem repetir; o índice é a identidade da opção.
                    key={index}
                    type="button"
                    onClick={() => store.getState().chooseIcon(index)}
                    disabled={savingIdentity}
                    aria-pressed={chosenIconIndex === index}
                    className={clsx(
                      'flex min-h-24 min-w-24 items-center justify-center rounded-2xl border-2 bg-pz-surface p-2 transition disabled:cursor-not-allowed disabled:opacity-60',
                      chosenIconIndex === index
                        ? 'border-pz-accent ring-2 ring-pz-accent/40'
                        : 'border-pz-border hover:border-pz-accent',
                    )}
                  >
                    <img
                      src={svgToDataUri(svg)}
                      alt={`${c.iconAlt} ${index + 1}`}
                      className="h-20 w-20"
                    />
                  </button>
                ))}
              </div>
              {identityError ? (
                <p role="alert" className="text-sm font-semibold text-pz-warn">
                  {identityError}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void store.getState().saveIdentity(projectId)}
                  disabled={chosenIconIndex === null || savingIdentity}
                  aria-busy={savingIdentity || undefined}
                  className="min-h-12 rounded-2xl bg-pz-accent px-6 font-bold text-pz-accent-fg transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingIdentity ? c.saving : c.save}
                </button>
                {iconGenerations < MAX_ICON_GENERATIONS ? (
                  <button
                    type="button"
                    onClick={() => void store.getState().generateIcons(projectId)}
                    disabled={savingIdentity}
                    className="min-h-11 rounded-2xl border-2 border-pz-border px-4 font-semibold text-pz-text transition hover:border-pz-accent disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {c.regenerateIcons}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={handleSkipIcon}
                  disabled={savingIdentity}
                  className="min-h-11 rounded-2xl px-4 font-semibold text-pz-muted transition hover:bg-pz-bg hover:text-pz-text disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {c.skipIcon}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              {identityError ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-pz-warn bg-pz-bg px-4 py-3">
                  <p role="alert" className="font-semibold text-pz-warn">
                    {identityError}
                  </p>
                  <button
                    type="button"
                    onClick={() => void store.getState().generateIcons(projectId)}
                    className="min-h-11 rounded-2xl bg-pz-accent px-5 font-bold text-pz-accent-fg transition hover:brightness-105"
                  >
                    {copy.errors.retry}
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleSkipIcon}
                disabled={savingIdentity}
                className="min-h-11 self-start rounded-2xl px-4 font-semibold text-pz-muted transition hover:bg-pz-bg hover:text-pz-text disabled:cursor-not-allowed disabled:opacity-60"
              >
                {c.skipIcon}
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
