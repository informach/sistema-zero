'use client'

import {
  PLATFORM_ACTION_LABELS,
  type PlatformAction,
  type PlatformActionResult,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { useRef, useState } from 'react'
import { apiSend } from '../lib/api'
import { useLessonPlayer } from './lesson-player-context'

export function SectionPlatformAction({
  action,
  sectionId,
  revision,
  preview = false,
  completed = false,
}: {
  action: PlatformAction
  sectionId: string
  revision: string | null
  preview?: boolean
  completed?: boolean
}) {
  const player = useLessonPlayer()
  const [result, setResult] = useState<PlatformActionResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const inFlight = useRef(false)
  const destination =
    action === 'customize-avatar'
      ? '/meu-avatar'
      : action === 'customize-room'
        ? '/quarto'
        : '/perfil'
  async function verify() {
    if (!player || !revision || preview || inFlight.current) return
    inFlight.current = true
    setBusy(true)
    setError('')
    try {
      const saved = await apiSend<PlatformActionResult>(
        `/api/members/lessons/${encodeURIComponent(player.lessonId)}/sections/${encodeURIComponent(sectionId)}/action-check`,
        'POST',
        { revision },
        { 'x-sz-viewer': player.viewerId ?? '' },
      )
      setResult(saved)
      if (saved.passed) player.refreshAfterLearning?.()
    } catch (cause) {
      setError(
        typeof cause === 'object' &&
          cause !== null &&
          'message' in cause &&
          typeof cause.message === 'string'
          ? cause.message
          : 'Não consegui verificar agora. Tente novamente.',
      )
    } finally {
      inFlight.current = false
      setBusy(false)
    }
  }
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
      {player?.renderInstruction?.(
        action === 'change-theme'
          ? 'No menu do seu perfil, use “Mudar tema”. Depois volte aqui para eu conferir!'
          : 'Deixe do seu jeito, salve e volte aqui para eu conferir!',
      )}
      <div className="flex flex-wrap gap-3">
        <a
          href={destination}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 font-medium"
        >
          {PLATFORM_ACTION_LABELS[action]}
          <span className="sr-only"> em outra aba</span>
        </a>
        <Button onClick={() => void verify()} disabled={busy || preview}>
          {busy ? 'Verificando…' : 'Verificar minha ação'}
        </Button>
      </div>
      {preview && (
        <p className="text-sm text-muted-foreground">
          Prévia: a verificação real acontece na conta do aluno.
        </p>
      )}
      <div role="status" className="text-sm">
        {error || result?.feedback || (completed ? 'Etapa concluída!' : '')}
      </div>
      {result?.passed && player?.renderActionEvidence?.(result)}
    </div>
  )
}
