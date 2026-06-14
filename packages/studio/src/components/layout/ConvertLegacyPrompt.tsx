import type { JSX } from 'react'
import { useState } from 'react'
import { t } from '#core'
import { ConfirmDialog } from '#ui'
import { useProjectStore } from '../../state/projectStore'
import { useStudioConfig } from '../../studio/config'

/**
 * Pergunta, ao abrir, se um projeto BÁSICO legado com arquivos extras deve virar
 * profissional (D2: o básico só edita os 3 arquivos via Blocos/Ponte). Só aparece
 * quando o host suporta pro (`config.professional`). Recusar mantém o projeto
 * básico com os extras preservados/ocultos (o ModeLimitationsNotice avisa) e o
 * aluno ainda pode graduar pela Topbar depois. Não decide nada sem o "ok".
 */
export function ConvertLegacyPrompt(): JSX.Element | null {
  const projectId = useProjectStore((s) => s.project?.id ?? null)
  const kind = useProjectStore((s) => s.project?.kind)
  const extrasCount = useProjectStore((s) => s.project?.extraFiles?.length ?? 0)
  const convertToPro = useProjectStore((s) => s.convertToPro)
  const proAvailable = useStudioConfig().professional

  const [dismissedId, setDismissedId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  // Erro inline da conversão (espelha o padrão de setError do ExportDialog): se
  // convertToPro rejeita, sem este catch viraria unhandled rejection sem feedback.
  const [error, setError] = useState('')

  const shouldAsk =
    proAvailable &&
    kind !== 'pro' &&
    extrasCount > 0 &&
    projectId !== null &&
    dismissedId !== projectId

  if (!shouldAsk) return null

  const onConfirm = async () => {
    setBusy(true)
    setError('')
    try {
      await convertToPro()
    } catch (e) {
      // Mantém o diálogo aberto e usável: mostra a causa e libera o botão.
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ConfirmDialog
      open
      title={t('convert.legacyTitle')}
      confirmLabel={busy ? t('convert.working') : t('convert.confirm')}
      cancelLabel={t('convert.later')}
      busy={busy}
      onCancel={() => setDismissedId(projectId)}
      onConfirm={onConfirm}
    >
      {t('convert.legacyBody', { count: extrasCount })}
      {error && (
        <p className="mt-3 text-sz-error" role="alert">
          {t('export.error', { reason: error })}
        </p>
      )}
    </ConfirmDialog>
  )
}
