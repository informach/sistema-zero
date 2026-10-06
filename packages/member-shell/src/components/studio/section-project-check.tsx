'use client'

import type { StudioHandle } from '@sistemazero/studio'
import { Button } from '@sistemazero/ui/button'
import { type RefObject, useState } from 'react'
import { apiSend } from '../../lib/api'
import { useLessonCopy } from '../lesson-copy-context'
import { useLessonPlayer } from '../lesson-player-context'

export function SectionProjectCheck({
  blockId,
  handleRef,
}: {
  blockId: string
  handleRef: RefObject<StudioHandle | null>
}) {
  const player = useLessonPlayer()
  const check = player?.sectionProjectCheck
  if (!player || !check || check.blockId !== blockId) return null
  return <CheckStage key={`${player.viewerId}:${check.sectionId}`} handleRef={handleRef} />
}

function CheckStage({ handleRef }: { handleRef: RefObject<StudioHandle | null> }) {
  const player = useLessonPlayer()
  const { verificacao, erroDoServidor } = useLessonCopy()
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [results, setResults] = useState<{ checkId: string; passed: boolean }[]>([])
  async function verify() {
    const check = player?.sectionProjectCheck
    const project = handleRef.current?.getProject()
    if (!check || !project || !player || busy) return
    setBusy(true)
    setResults([])
    try {
      const result = await apiSend<{
        passed: boolean
        results: { checkId: string; passed: boolean }[]
      }>(
        `/api/members/lessons/${encodeURIComponent(player.lessonId)}/sections/${encodeURIComponent(check.sectionId)}/project-check`,
        'POST',
        { revision: check.revision, project },
        { 'x-sz-viewer': player.viewerId ?? '' },
      )
      setFeedback(result.passed ? verificacao.cumprido : verificacao.faltou)
      setResults(result.results)
      player.refreshAfterLearning?.()
    } catch (error) {
      const padrao = 'Não foi possível verificar. Seu projeto continua aqui; tente novamente.'
      setFeedback(error instanceof Error ? erroDoServidor(error, padrao) : padrao)
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-2">
      <ul className="space-y-1 text-sm" aria-label={verificacao.objetivos}>
        {player?.sectionProjectCheck?.objectives?.map((objective) => {
          const result = results.find((r) => r.checkId === objective.id)
          return (
            <li key={objective.id}>
              {result ? (result.passed ? '✓ Cumprido: ' : 'Falta: ') : '• '}
              {objective.label}
            </li>
          )
        })}
      </ul>
      <Button variant="outline" disabled={busy} onClick={() => void verify()}>
        {busy ? 'Verificando…' : verificacao.botao}
      </Button>
      {feedback && (
        <p role="status" className="text-sm">
          {feedback}
        </p>
      )}
    </div>
  )
}
