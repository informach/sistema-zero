import type { JSX } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { Translator } from '#core'
import { Button, Modal } from '#ui'
import type { ExportStep } from '../../export'
import { triggerDownload } from '../../export/download'
import { prepareWebDownload } from '../../export/webDownload'
import { useProjectStore, useProjectStoreApi } from '../../state/projectStore'
import { usePendingEditorEdits } from '../../state/studioStores'
import { useT } from '../../studio/i18n'
import { useStudioRuntimeEnvironment } from '../../studio/runtime-environment'
import { Spinner } from './LoadingViews'

export interface ExportDialogProps {
  open: boolean
  onClose: () => void
}

function stepLabel(step: ExportStep, t: Translator): string {
  switch (step) {
    case 'collecting':
      return t('export.collecting')
    case 'minifying':
      return t('export.minifying')
    case 'zipping':
      return t('export.zipping')
    default:
      return t('export.working')
  }
}

export function ExportDialog({ open, onClose }: ExportDialogProps): JSX.Element | null {
  const t = useT()
  // Lê o projeto da store POR INSTÂNCIA (hook com seletor) — não a estática.
  const project = useProjectStore((s) => s.project)
  const store = useProjectStoreApi()
  const pending = usePendingEditorEdits()
  const environment = useStudioRuntimeEnvironment()
  const operation = useRef<AbortController | null>(null)
  const isPro = project?.kind === 'pro'
  const isPython = project?.programmingLanguage === 'python'
  useEffect(() => {
    if (!open || environment?.signal?.aborted) operation.current?.abort()
    return () => {
      operation.current?.abort()
    }
  }, [open, environment])

  const [minify, setMinify] = useState(true)
  const [working, setWorking] = useState(false)
  const [label, setLabel] = useState('')
  const [error, setError] = useState('')
  // Avisos não-fatais do export (extra que não compilou, lib 3D via esm.sh, JS 3D
  // inline). O download já aconteceu; mostramos o que o aluno precisa saber em vez
  // de fechar em silêncio.
  const [warnings, setWarnings] = useState<string[]>([])

  if (!open) return null

  const handleExport = async () => {
    if (!project || working) return
    setWorking(true)
    setError('')
    setWarnings([])
    setLabel(t('export.working'))
    const controller = new AbortController()
    operation.current = controller
    try {
      const result = await prepareWebDownload(store, pending ?? undefined, controller.signal, {
        runtimeEnvironment: environment,
        minify: isPro ? undefined : minify,
        onProgress: (step) => setLabel(stepLabel(step, t)),
      })
      controller.signal.throwIfAborted()
      environment?.signal?.throwIfAborted()
      triggerDownload(result.blob, result.filename)
      setWorking(false)
      // Com avisos: o arquivo foi baixado, mas mantemos o diálogo aberto para o
      // aluno ler os avisos. Sem avisos: fecha como antes.
      if (result.warnings.length > 0) setWarnings(result.warnings)
      else onClose()
    } catch (e) {
      if (operation.current !== controller) return
      setWorking(false)
      if (controller.signal.aborted) return
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (operation.current === controller) operation.current = null
    }
  }

  const footer = (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          operation.current?.abort()
          onClose()
        }}
      >
        {t('export.cancel')}
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => void handleExport()}
        disabled={working || !project || (isPython && !environment?.resolvePythonWebExport)}
      >
        {working ? (
          <span className="flex items-center gap-1.5">
            <Spinner className="h-3.5 w-3.5" />
            {label}
          </span>
        ) : (
          t('export.action')
        )}
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      // Trava o fechamento (Escape/clique fora) enquanto exporta.
      onClose={working ? () => {} : onClose}
      title={t(isPython ? 'export.pythonTitle' : 'export.title')}
      footer={footer}
    >
      <p className="mb-3">{isPython ? t('export.pythonDescription') : t('export.description')}</p>
      {isPython ? (
        <p className="text-sz-fg-soft">
          {environment?.resolvePythonWebExport
            ? t('export.pythonSourceNote')
            : t('export.pythonUnavailable')}
        </p>
      ) : isPro ? (
        <p className="text-sz-fg-soft">{t('export.proNote')}</p>
      ) : (
        <label className="flex items-center gap-2 text-sz-fg">
          <input
            type="checkbox"
            name="minify-export"
            checked={minify}
            onChange={(e) => setMinify(e.target.checked)}
            disabled={working}
          />
          {t('export.minify')}
        </label>
      )}
      {error && (
        <p className="mt-3 text-sz-error" role="alert">
          {t('export.error', { reason: error })}
        </p>
      )}
      {warnings.length > 0 && (
        <div className="mt-3" role="status">
          <p className="mb-1 font-medium text-sz-fg">O arquivo foi baixado, mas fique atento:</p>
          <ul className="list-disc space-y-1 pl-5 text-sz-fg-soft">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  )
}
