'use client'

import type { LessonEvidencePage } from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { useEffect, useRef, useState } from 'react'
import { apiGet } from '@/lib/api'

export function LessonEvidenceHistory({
  initial,
  lessonId,
  userId,
  accountId,
}: {
  initial: LessonEvidencePage
  lessonId: string
  userId: string
  accountId: string
}) {
  const [page, setPage] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const active = useRef(false)
  const loading = useRef(false)
  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
    }
  }, [])
  async function more() {
    if (!page.nextCursor || loading.current) return
    loading.current = true
    setBusy(true)
    setError('')
    try {
      const next = await apiGet<LessonEvidencePage>(
        `/api/members/lessons/${lessonId}/learning-evidence?${new URLSearchParams({ userId, accountId, beforeId: page.nextCursor })}`,
      )
      if (active.current)
        setPage((current) => ({
          ...next,
          items: [
            ...current.items,
            ...next.items.filter((item) => !current.items.some((old) => old.id === item.id)),
          ],
        }))
    } catch {
      if (active.current)
        setError('Não foi possível carregar os registros anteriores. Tente novamente.')
    } finally {
      loading.current = false
      if (active.current) setBusy(false)
    }
  }
  return (
    <section className="space-y-2 rounded-lg border p-3">
      <h4 className="font-medium">Histórico de evidências da aula</h4>
      <p className="text-xs text-muted-foreground">
        Inclui versões anteriores e atividades removidas da aula.
      </p>
      {!page.items.length && <p className="text-sm">Nenhuma evidência registrada.</p>}
      {page.items.map((evidence) => {
        const payload =
          evidence.payload && typeof evidence.payload === 'object' ? evidence.payload : {}
        const title =
          'sectionTitle' in payload && typeof payload.sectionTitle === 'string'
            ? payload.sectionTitle
            : 'blockTitle' in payload && typeof payload.blockTitle === 'string'
              ? payload.blockTitle
              : null
        return (
          <details key={evidence.id} className="rounded border p-2 text-sm">
            <summary>
              {evidence.kind === 'platform_action'
                ? 'Ação na plataforma'
                : evidence.kind === 'section_project'
                  ? 'Verificação do projeto'
                  : evidence.kind === 'quiz'
                    ? 'Tentativa de quiz'
                    : 'Entrega'}
              {title ? ` · ${title}` : ''} · {new Date(evidence.createdAt).toLocaleString('pt-BR')}
            </summary>
            <p className="text-xs text-muted-foreground">
              Origem:{' '}
              {evidence.sectionId
                ? `seção ${evidence.sectionId}`
                : `bloco ${evidence.blockId ?? 'não identificado'}`}{' '}
              · Revisão avaliada: {evidence.revision}
            </p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap text-xs">
              {JSON.stringify(evidence.payload, null, 2)}
            </pre>
            <button
              type="button"
              className="underline"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' }),
                )
                const link = document.createElement('a')
                link.href = url
                link.download = `evidencia-${evidence.id}.json`
                link.click()
                setTimeout(() => URL.revokeObjectURL(url), 1000)
              }}
            >
              Baixar resumo
            </button>
            <a
              className="ml-3 underline"
              href={`/api/members/lessons/${lessonId}/learning-evidence/${evidence.id}?${new URLSearchParams({ userId, accountId })}`}
              download={`evidencia-${evidence.id}.json`}
            >
              Baixar projeto e avaliação completos
            </a>
          </details>
        )
      })}
      {error && <p role="alert">{error}</p>}
      {page.nextCursor && (
        <Button variant="outline" disabled={busy} onClick={() => void more()}>
          {busy ? 'Carregando registros…' : 'Ver registros anteriores'}
        </Button>
      )}
    </section>
  )
}
