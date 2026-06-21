import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import { t } from '#core'
import { Button, IconCheckCircle, IconLink, Modal } from '#ui'
import { captureCoverFromProject } from '../../cover/coverCapture'
import { useProjectStore } from '../../state/projectStore'
import type { StudioShareAdapter, StudioShareResult } from '../../studio/share'
import { Spinner } from './LoadingViews'

export interface ShareDialogProps {
  open: boolean
  onClose: () => void
  /** Adapter do host. Quando `null` o dialog não renderiza (botão também some). */
  adapter: StudioShareAdapter | null
}

type Step = 'confirm' | 'describe' | 'cover' | 'review' | 'publishing' | 'success' | 'error'

const MAX_DESCRIPTION = 280

/**
 * Fluxo de COMPARTILHAR (publicar no Mural) — UX do Studio, I/O do host.
 *
 * confirm → describe (IA gera, criança edita) → cover (print) → review →
 * publishing → success | error. Reusa `captureCoverFromProject` (print) e o
 * `Modal` (que já reaplica o tema no portal via StudioThemeScope). A
 * imutabilidade do post é garantida no SERVIDOR; aqui só avisamos.
 */
export function ShareDialog({ open, onClose, adapter }: ShareDialogProps): JSX.Element | null {
  // Projeto da store POR INSTÂNCIA (hook com seletor) — não a estática.
  const project = useProjectStore((s) => s.project)

  const [step, setStep] = useState<Step>('confirm')
  const [okConcluded, setOkConcluded] = useState(false)
  const [okLanguage, setOkLanguage] = useState(false)
  const [description, setDescription] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateFailed, setGenerateFailed] = useState(false)
  const [coverDataUrl, setCoverDataUrl] = useState<string | null>(null)
  const [capturing, setCapturing] = useState(false)
  const [title, setTitle] = useState('')
  const [result, setResult] = useState<StudioShareResult | null>(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)

  // Dispara a geração da descrição / captura do print UMA vez por passo.
  const describeStartedRef = useRef(false)
  const coverStartedRef = useRef(false)

  // Reseta tudo a cada abertura (o componente fica montado entre aberturas).
  useEffect(() => {
    if (!open) return
    setStep('confirm')
    setOkConcluded(false)
    setOkLanguage(false)
    setDescription('')
    setGenerating(false)
    setGenerateFailed(false)
    setCoverDataUrl(null)
    setCapturing(false)
    setTitle(project?.name ?? '')
    setResult(null)
    setErrorMsg('')
    setCopied(false)
    describeStartedRef.current = false
    coverStartedRef.current = false
  }, [open, project?.name])

  // Gera o rascunho da descrição ao entrar no passo "describe" (1x).
  useEffect(() => {
    if (step !== 'describe' || describeStartedRef.current) return
    if (!adapter || !project) return
    describeStartedRef.current = true
    setGenerating(true)
    setGenerateFailed(false)
    adapter
      .generateDescription({ project, title: title.trim() || project.name })
      .then((draft) => {
        const clean = (draft ?? '').trim().slice(0, MAX_DESCRIPTION)
        if (clean) setDescription(clean)
        else setGenerateFailed(true)
      })
      .catch(() => setGenerateFailed(true))
      .finally(() => setGenerating(false))
  }, [step, adapter, project, title])

  // Captura o print ao entrar no passo "cover" (1x). Nunca lança; null = sem foto.
  useEffect(() => {
    if (step !== 'cover' || coverStartedRef.current) return
    if (!project) return
    coverStartedRef.current = true
    setCapturing(true)
    captureCoverFromProject(project)
      .then((url) => setCoverDataUrl(url))
      .catch(() => setCoverDataUrl(null))
      .finally(() => setCapturing(false))
  }, [step, project])

  if (!open || !adapter || !project) return null

  const regenerate = () => {
    if (!project || generating) return
    setGenerating(true)
    setGenerateFailed(false)
    adapter
      .generateDescription({ project, title: title.trim() || project.name })
      .then((draft) => {
        const clean = (draft ?? '').trim().slice(0, MAX_DESCRIPTION)
        if (clean) setDescription(clean)
        else setGenerateFailed(true)
      })
      .catch(() => setGenerateFailed(true))
      .finally(() => setGenerating(false))
  }

  const recapture = () => {
    if (!project || capturing) return
    setCapturing(true)
    setCoverDataUrl(null)
    captureCoverFromProject(project)
      .then((url) => setCoverDataUrl(url))
      .catch(() => setCoverDataUrl(null))
      .finally(() => setCapturing(false))
  }

  const doPublish = () => {
    setStep('publishing')
    setErrorMsg('')
    adapter
      .publish({
        project,
        coverDataUrl,
        title: title.trim() || project.name,
        description: description.trim().slice(0, MAX_DESCRIPTION),
      })
      .then((res) => {
        setResult(res ?? {})
        setStep('success')
      })
      .catch((e: unknown) => {
        setErrorMsg(e instanceof Error ? e.message : String(e))
        setStep('error')
      })
  }

  const copyLink = async () => {
    const url = result?.playUrl
    if (!url) return
    try {
      const abs = typeof window !== 'undefined' ? new URL(url, window.location.origin).href : url
      await navigator.clipboard?.writeText(abs)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard pode falhar (permissão) — silencioso.
    }
  }

  const busy = step === 'publishing'
  const descTrimmed = description.trim()

  // Rodapé por passo.
  let footer: JSX.Element | null = null
  if (step === 'confirm') {
    footer = (
      <>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('share.cancel')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!okConcluded || !okLanguage}
          onClick={() => setStep('describe')}
        >
          {t('share.next')}
        </Button>
      </>
    )
  } else if (step === 'describe') {
    footer = (
      <>
        <Button variant="ghost" size="sm" onClick={() => setStep('confirm')}>
          {t('share.back')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={generating || descTrimmed.length === 0}
          onClick={() => setStep('cover')}
        >
          {t('share.next')}
        </Button>
      </>
    )
  } else if (step === 'cover') {
    footer = (
      <>
        <Button variant="ghost" size="sm" onClick={() => setStep('describe')}>
          {t('share.back')}
        </Button>
        <Button variant="primary" size="sm" disabled={capturing} onClick={() => setStep('review')}>
          {t('share.next')}
        </Button>
      </>
    )
  } else if (step === 'review') {
    footer = (
      <>
        <Button variant="ghost" size="sm" onClick={() => setStep('cover')}>
          {t('share.back')}
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={(title.trim() || project.name).length === 0 || descTrimmed.length === 0}
          onClick={doPublish}
        >
          {t('share.publish')}
        </Button>
      </>
    )
  } else if (step === 'error') {
    footer = (
      <>
        <Button variant="ghost" size="sm" onClick={onClose}>
          {t('share.cancel')}
        </Button>
        <Button variant="primary" size="sm" onClick={() => setStep('review')}>
          {t('share.retry')}
        </Button>
      </>
    )
  } else if (step === 'success') {
    footer = (
      <Button variant="primary" size="sm" onClick={onClose}>
        {t('share.close')}
      </Button>
    )
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={t('share.title')}
      footer={footer ?? undefined}
    >
      {step === 'confirm' && (
        <div className="space-y-3">
          <p className="font-medium text-sz-fg">{t('share.step.confirm.heading')}</p>
          <p>{t('share.step.confirm.intro')}</p>
          <label className="flex items-start gap-2 text-sz-fg">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={okConcluded}
              onChange={(e) => setOkConcluded(e.target.checked)}
            />
            <span>{t('share.step.confirm.concluded')}</span>
          </label>
          <label className="flex items-start gap-2 text-sz-fg">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={okLanguage}
              onChange={(e) => setOkLanguage(e.target.checked)}
            />
            <span>{t('share.step.confirm.kidsLanguage')}</span>
          </label>
          <p
            role="alert"
            className="rounded-md border border-sz-warn/40 bg-sz-warn/10 px-3 py-2 text-sz-warn"
          >
            {t('share.step.confirm.irreversible')}
          </p>
        </div>
      )}

      {step === 'describe' && (
        <div className="space-y-3">
          <p className="font-medium text-sz-fg">{t('share.step.describe.heading')}</p>
          <p>{t('share.step.describe.help')}</p>
          <label className="block">
            <span className="sr-only">{t('share.step.describe.label')}</span>
            <textarea
              aria-label={t('share.step.describe.label')}
              value={description}
              maxLength={MAX_DESCRIPTION}
              rows={4}
              placeholder={t('share.step.describe.placeholder')}
              onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
              disabled={generating}
              className="w-full resize-none rounded-md border border-sz-border bg-sz-bg px-3 py-2 text-sm text-sz-fg disabled:opacity-60"
            />
          </label>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-sz-fg-mute">
              {description.length}/{MAX_DESCRIPTION}
            </span>
            <Button variant="ghost" size="sm" onClick={regenerate} disabled={generating}>
              {generating ? (
                <span className="flex items-center gap-1.5">
                  <Spinner className="h-3.5 w-3.5" />
                  {t('share.step.describe.generating')}
                </span>
              ) : description ? (
                t('share.step.describe.regenerate')
              ) : (
                t('share.step.describe.generate')
              )}
            </Button>
          </div>
          {generateFailed && !generating && (
            <p className="text-sz-fg-soft" role="status">
              {t('share.step.describe.failed')}
            </p>
          )}
        </div>
      )}

      {step === 'cover' && (
        <div className="space-y-3">
          <p className="font-medium text-sz-fg">{t('share.step.cover.heading')}</p>
          {capturing ? (
            <p className="flex items-center gap-2 text-sz-fg-soft">
              <Spinner className="h-4 w-4" />
              {t('share.step.cover.capturing')}
            </p>
          ) : coverDataUrl ? (
            <img
              src={coverDataUrl}
              alt=""
              className="mx-auto max-h-56 w-auto rounded-md border border-sz-border"
            />
          ) : (
            <p className="rounded-md border border-sz-border bg-sz-bg px-3 py-2 text-sz-fg-soft">
              {t('share.step.cover.none')}
            </p>
          )}
          {!capturing && (
            <Button variant="ghost" size="sm" onClick={recapture}>
              {t('share.step.cover.retry')}
            </Button>
          )}
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-3">
          <p className="font-medium text-sz-fg">{t('share.step.review.heading')}</p>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-sz-fg-soft">
              {t('share.step.title.label')}
            </span>
            <input
              aria-label={t('share.step.title.label')}
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border border-sz-border bg-sz-bg px-3 py-2 text-sm text-sz-fg"
            />
          </label>
          {coverDataUrl && (
            <img
              src={coverDataUrl}
              alt=""
              className="max-h-40 w-auto rounded-md border border-sz-border"
            />
          )}
          <p className="whitespace-pre-wrap rounded-md border border-sz-border bg-sz-bg px-3 py-2 text-sz-fg-soft">
            {descTrimmed}
          </p>
          <p role="alert" className="text-xs text-sz-warn">
            {t('share.step.confirm.irreversible')}
          </p>
        </div>
      )}

      {step === 'publishing' && (
        <p className="flex items-center gap-2 py-4 text-sz-fg-soft">
          <Spinner className="h-4 w-4" />
          {t('share.publishing')}
        </p>
      )}

      {step === 'success' && (
        <div className="space-y-3">
          <p className="flex items-center gap-2 font-medium text-sz-fg">
            <IconCheckCircle className="text-sz-success" />
            {t('share.success.heading')}
          </p>
          <p>{t('share.success.body')}</p>
          <div className="flex flex-wrap gap-2">
            {result?.muralUrl && (
              <a href={result.muralUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm">
                  {t('share.success.openMural')}
                </Button>
              </a>
            )}
            {result?.playUrl && (
              <a href={result.playUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="primary" size="sm">
                  {t('share.success.openPlay')}
                </Button>
              </a>
            )}
            {result?.playUrl && (
              <Button variant="subtle" size="sm" onClick={() => void copyLink()}>
                <span className="flex items-center gap-1.5">
                  <IconLink size={14} />
                  {copied ? t('share.success.copied') : t('share.success.copyLink')}
                </span>
              </Button>
            )}
          </div>
        </div>
      )}

      {step === 'error' && (
        <p className="text-sz-error" role="alert">
          {t('share.error', { reason: errorMsg })}
        </p>
      )}
    </Modal>
  )
}
