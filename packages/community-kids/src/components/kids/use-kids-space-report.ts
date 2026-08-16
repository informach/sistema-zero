'use client'

import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { type ApiError, apiSend } from '@/lib/api'

type ReportTarget = {
  target: 'threads' | 'comments'
  id: string
}

/** Estado e comando da denúncia; mantém a moderação fora do orquestrador do espaço. */
export function useKidsSpaceReport() {
  const [target, setTarget] = useState<ReportTarget | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)

  const onReport = useCallback((kind: ReportTarget['target'], id: string) => {
    setReason('')
    setTarget({ target: kind, id })
  }, [])

  async function submit() {
    if (!target) return
    const trimmedReason = reason.trim()
    if (!trimmedReason) {
      toast.error('Conta pra gente o que aconteceu. ✏️')
      return
    }
    setBusy(true)
    try {
      await apiSend(`/api/hub/${target.target}/${encodeURIComponent(target.id)}/report`, 'POST', {
        reason: trimmedReason,
      })
      toast.success('Avisamos um professor. Obrigado! 💙')
      setTarget(null)
    } catch (error) {
      toast.error((error as ApiError).message ?? 'Não consegui avisar.')
    } finally {
      setBusy(false)
    }
  }

  return {
    onReport,
    report: {
      reportOpen: target !== null,
      reportReason: reason,
      reportBusy: busy,
      onReportReasonChange: setReason,
      onCloseReport: () => {
        if (!busy) setTarget(null)
      },
      onSubmitReport: submit,
    },
  }
}
