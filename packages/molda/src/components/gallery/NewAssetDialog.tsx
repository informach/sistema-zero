/**
 * "Criar novo" em três passos: o TIPO (modelo, textura, céu) → as opções do
 * tipo (texels por bloco / tamanho da folha / céu de partida) → o NOME.
 * O 4º cartão do primeiro passo, "Modelos prontos", troca as opções pela grade
 * de templates (`TemplatePicker`) e chega ao nome já com uma sugestão.
 * O nome é validado ao vivo com a régua do Estúdio (kebab-case, ≤ 48).
 */
import { clsx } from 'clsx'
import type { FormEvent, JSX } from 'react'
import { useState } from 'react'
import { COPY } from '../../core/copy'
import { MOLDA_LIMITS, type TexelsPerUnit, type TextureSize } from '../../core/limits'
import {
  MOLDA_ASSET_KINDS,
  type MoldaAsset,
  type MoldaAssetKind,
  type NewAssetInput,
} from '../../core/model'
import { normalizeAssetName, uniqueAssetName } from '../../core/names'
import { SKY_PRESET_IDS, type SkyPresetId, skyPreset } from '../../sky/params'
import type { MoldaTemplateId } from '../../templates/catalog'
import { useGallery, useMoldaApp } from '../appContext'
import { Button } from '../ui/Button'
import { Dialog } from '../ui/Dialog'
import { useToast } from '../ui/Toast'
import { KIND_CHIP_CLASSES } from './kinds'
import { TemplatePicker } from './TemplatePicker'
import { SkyThumb } from './thumbs'

type Step = 'kind' | 'options' | 'template' | 'name'
/** O caminho normal e o dos modelos prontos (que troca as opções pela grade). */
const KIND_STEPS: readonly Step[] = ['kind', 'options', 'name']
const TEMPLATE_STEPS: readonly Step[] = ['kind', 'template', 'name']

const STEP_TITLES: Record<Step, string> = {
  kind: COPY.newAsset.stepKind,
  options: COPY.newAsset.stepOptions,
  template: COPY.templates.stepTitle,
  name: COPY.newAsset.stepName,
}

function OptionButton({
  selected,
  onClick,
  title,
  hint,
  children,
}: {
  selected: boolean
  onClick: () => void
  title: string
  hint?: string
  children?: JSX.Element
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        'flex min-h-11 flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
        selected
          ? 'border-mld-accent bg-mld-accent/10'
          : 'border-mld-border bg-mld-surface hover:border-mld-accent/60',
      )}
    >
      {children}
      <span className="text-base font-bold text-mld-text">{title}</span>
      {hint ? <span className="text-xs text-mld-muted">{hint}</span> : null}
    </button>
  )
}

export function NewAssetDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (asset: MoldaAsset) => void
}): JSX.Element | null {
  const { gallery } = useMoldaApp()
  const assets = useGallery((state) => state.assets)
  const { showToast } = useToast()
  const [step, setStep] = useState<Step>('kind')
  const [kind, setKind] = useState<MoldaAssetKind | null>(null)
  const [texels, setTexels] = useState<TexelsPerUnit>(4)
  const [size, setSize] = useState<TextureSize>(32)
  const [preset, setPreset] = useState<SkyPresetId>('dia')
  const [templateId, setTemplateId] = useState<MoldaTemplateId | null>(null)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function reset(): void {
    setStep('kind')
    setKind(null)
    setTemplateId(null)
    setName('')
    setError(null)
    setBusy(false)
  }

  function close(): void {
    reset()
    onClose()
  }

  const normalized = normalizeAssetName(name)
  const taken = normalized !== null && assets.some((asset) => asset.name === normalized)
  const inTemplateBranch = step === 'template' || templateId !== null
  const STEPS = inTemplateBranch ? TEMPLATE_STEPS : KIND_STEPS
  const stepIndex = STEPS.indexOf(step)

  function pickKind(next: MoldaAssetKind): void {
    setTemplateId(null)
    setKind(next)
    setStep('options')
  }

  function openTemplates(): void {
    setTemplateId(null)
    setKind('model')
    setStep('template')
  }

  async function submit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!kind || busy) return
    if (!normalized) {
      setError(COPY.newAsset.nameInvalid)
      return
    }
    if (taken) {
      setError(COPY.newAsset.nameTaken)
      return
    }
    const input: NewAssetInput =
      kind === 'model'
        ? { kind, name: normalized, texelsPerUnit: texels }
        : kind === 'texture'
          ? { kind, name: normalized, size }
          : { kind, name: normalized, preset }
    setBusy(true)
    const result = templateId
      ? await gallery.getState().createFromTemplate({ templateId, name: normalized })
      : await gallery.getState().create(input)
    setBusy(false)
    if (!result.ok) {
      setError(
        result.reason === 'storage-budget'
          ? COPY.gallery.storageBudget
          : result.reason === 'invalid-name'
            ? COPY.newAsset.nameInvalid
            : COPY.toast.saveFailed,
      )
      return
    }
    showToast(COPY.toast.created(result.asset.name))
    reset()
    onCreated(result.asset)
  }

  return (
    <Dialog open={open} onClose={close} title={COPY.newAsset.title} wide>
      <div className="flex items-center gap-2" aria-hidden="true">
        {STEPS.map((item, index) => (
          <span
            key={item}
            className={clsx(
              'h-2 flex-1 rounded-full',
              index <= stepIndex ? 'bg-mld-accent' : 'bg-mld-border',
            )}
          />
        ))}
      </div>
      <p className="mt-2 text-xs font-bold uppercase tracking-wide text-mld-muted">
        {COPY.newAsset.progress(stepIndex + 1, STEPS.length)}
      </p>
      <h3 className="mld-display mt-1 text-lg text-mld-text">{STEP_TITLES[step]}</h3>

      {step === 'kind' ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {MOLDA_ASSET_KINDS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => pickKind(item)}
              aria-label={COPY.a11y.newAssetKind(COPY.kinds[item].title)}
              className={clsx(
                'flex min-h-11 flex-col items-center gap-2 rounded-2xl border-2 border-mld-border bg-mld-surface p-4 text-center transition hover:border-mld-accent',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
              )}
            >
              <span
                aria-hidden="true"
                className={clsx(
                  'flex size-14 items-center justify-center rounded-2xl text-3xl',
                  KIND_CHIP_CLASSES[item],
                )}
              >
                {COPY.kinds[item].emoji}
              </span>
              <span className="mld-display text-lg text-mld-text">{COPY.kinds[item].title}</span>
              <span className="text-sm text-mld-text-soft">{COPY.kinds[item].description}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={openTemplates}
            aria-label={COPY.a11y.openTemplates}
            className={clsx(
              'flex min-h-11 flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-mld-accent/60 bg-mld-accent/5 p-4 text-center transition hover:border-mld-accent',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mld-accent',
            )}
          >
            <span
              aria-hidden="true"
              className="flex size-14 items-center justify-center rounded-2xl bg-mld-accent/15 text-3xl"
            >
              {COPY.templates.card.emoji}
            </span>
            <span className="mld-display text-lg text-mld-text">{COPY.templates.card.title}</span>
            <span className="text-sm text-mld-text-soft">{COPY.templates.card.description}</span>
          </button>
        </div>
      ) : null}

      {step === 'template' ? (
        <TemplatePicker
          onPick={(template) => {
            setTemplateId(template.id)
            setKind('model')
            setName(
              uniqueAssetName(template.suggestedName, new Set(assets.map((asset) => asset.name))) ??
                template.suggestedName,
            )
            setError(null)
            setStep('name')
          }}
        />
      ) : null}

      {step === 'options' && kind === 'model' ? (
        <fieldset className="mt-4">
          <legend className="text-sm font-bold text-mld-text">{COPY.newAsset.texelsLabel}</legend>
          <p className="mt-1 text-xs text-mld-muted">{COPY.newAsset.texelsHint}</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {MOLDA_LIMITS.texelsPerUnit.map((value) => (
              <OptionButton
                key={value}
                selected={texels === value}
                onClick={() => setTexels(value)}
                title={COPY.newAsset.texelsOptions[value] ?? String(value)}
                hint={`${value} × ${value}`}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 'options' && kind === 'texture' ? (
        <fieldset className="mt-4">
          <legend className="text-sm font-bold text-mld-text">{COPY.newAsset.sizeLabel}</legend>
          <p className="mt-1 text-xs text-mld-muted">{COPY.newAsset.sizeHint}</p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {MOLDA_LIMITS.textureSizes.map((value) => (
              <OptionButton
                key={value}
                selected={size === value}
                onClick={() => setSize(value)}
                title={`${value} × ${value}`}
              />
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 'options' && kind === 'sky' ? (
        <fieldset className="mt-4">
          <legend className="text-sm font-bold text-mld-text">{COPY.newAsset.presetLabel}</legend>
          <p className="mt-1 text-xs text-mld-muted">{COPY.newAsset.presetHint}</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SKY_PRESET_IDS.map((id) => (
              <OptionButton
                key={id}
                selected={preset === id}
                onClick={() => setPreset(id)}
                title={COPY.skyPresets[id]}
              >
                <span className="block h-16 w-full overflow-hidden rounded-xl">
                  <SkyThumb params={skyPreset(id)} />
                </span>
              </OptionButton>
            ))}
          </div>
        </fieldset>
      ) : null}

      {step === 'name' ? (
        <form id="molda-new-asset-form" onSubmit={submit} className="mt-4 flex flex-col gap-1">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-bold text-mld-text">{COPY.newAsset.nameLabel}</span>
            <input
              autoFocus
              name="molda-new-asset-name"
              autoComplete="off"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              placeholder={COPY.newAsset.namePlaceholder}
              maxLength={MOLDA_LIMITS.maxNameChars}
              aria-invalid={error !== null || taken}
              className="min-h-11 rounded-xl border-2 border-mld-border bg-mld-bg px-3 text-base text-mld-text focus-visible:border-mld-accent focus-visible:outline-none"
            />
          </label>
          <span className="text-xs text-mld-muted">{COPY.newAsset.nameHint}</span>
          {taken && !error ? (
            <span role="alert" className="text-sm font-bold text-mld-danger">
              {COPY.newAsset.nameTaken}
            </span>
          ) : null}
          {error ? (
            <span role="alert" className="text-sm font-bold text-mld-danger">
              {error}
            </span>
          ) : null}
        </form>
      ) : null}

      <div className="mt-6 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            if (step === 'kind') close()
            else setStep(STEPS[stepIndex - 1] ?? 'kind')
          }}
        >
          {step === 'kind' ? COPY.newAsset.cancel : COPY.newAsset.back}
        </Button>
        {step === 'options' ? (
          <Button variant="primary" onClick={() => setStep('name')}>
            {COPY.newAsset.next}
          </Button>
        ) : null}
        {step === 'name' ? (
          <Button
            variant="primary"
            type="submit"
            form="molda-new-asset-form"
            disabled={busy || !normalized || taken}
          >
            {COPY.newAsset.create}
          </Button>
        ) : null}
      </div>
    </Dialog>
  )
}
