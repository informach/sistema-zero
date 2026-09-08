'use client'

import { isLearningManifest, type LessonSection } from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId, useState } from 'react'
import { type ApiError, apiSend } from '@/lib/api'

interface Preview {
  title: string
  fingerprint: string
  warnings: string[]
  sections: LessonSection[]
  blocks: Array<{ id: string; action: 'create' | 'update' | 'preserve' }>
}
export function LessonManifestImport({
  lessonId,
  lessonSlug,
  courseSlug,
  published,
  disabled,
  onImported,
}: {
  lessonId: string
  lessonSlug: string
  courseSlug: string
  published: boolean
  disabled: boolean
  onImported: () => Promise<void>
}) {
  const id = useId()
  const [source, setSource] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const change = (text: string) => {
    setSource(text)
    setPreview(null)
    setError('')
    setNotice('')
  }
  const parse = () => {
    const value: unknown = JSON.parse(source)
    if (!isLearningManifest(value))
      throw new Error('Confira o formato do manifesto, as atividades e as referências das seções.')
    return value
  }
  async function inspect() {
    setBusy(true)
    setError('')
    try {
      const document = parse()
      setPreview(
        await apiSend<Preview>(`/api/members/lessons/${lessonId}/import-preview`, 'POST', {
          document,
        }),
      )
    } catch (e) {
      setError((e as ApiError).message || 'Manifesto inválido.')
    } finally {
      setBusy(false)
    }
  }
  async function apply() {
    if (!preview) return
    setBusy(true)
    setError('')
    try {
      const result = await apiSend<{ zappyKnowledgeStatus?: string }>(
        `/api/members/lessons/${lessonId}/import-learning`,
        'POST',
        {
          document: parse(),
          expectedFingerprint: preview.fingerprint,
        },
      )
      setPreview(null)
      setSource('')
      await onImported()
      setNotice(
        result.zappyKnowledgeStatus === 'pending'
          ? 'Roteiro importado. A atualização da base do Zappy está em andamento.'
          : 'Roteiro importado.',
      )
    } catch (e) {
      setError((e as ApiError).message || 'Não foi possível importar.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <details className="rounded-2xl border border-border bg-card p-5">
      <summary className="cursor-pointer font-semibold">Importar roteiro com seções</summary>
      <fieldset disabled={busy || disabled} className="mt-4 space-y-4">
        {disabled && <p className="text-sm">Salve a organização didática antes de importar.</p>}
        <p className="text-sm text-muted-foreground">
          Destino:{' '}
          <strong>
            {courseSlug} / {lessonSlug}
          </strong>
          . A prévia mostra o que será criado ou atualizado. Projetos, quizzes e mídias existentes
          são preservados.
        </p>
        <label className="block space-y-2 text-sm" htmlFor={`${id}-file`}>
          Arquivo do manifesto
          <input
            id={`${id}-file`}
            type="file"
            accept=".json,application/json"
            disabled={busy}
            className="block w-full text-sm"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file) return
              if (file.size > 1800000) {
                setError('O manifesto deve ter até 1,8 MB.')
                return
              }
              change(await file.text())
            }}
          />
        </label>
        <label htmlFor={`${id}-json`} className="block text-sm">
          Conteúdo JSON
        </label>
        <Textarea
          id={`${id}-json`}
          rows={8}
          value={source}
          disabled={busy}
          onChange={(e) => change(e.target.value)}
          className="font-mono text-xs"
        />
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={busy || !source.trim()}
            onClick={() => {
              try {
                change(JSON.stringify({ ...parse(), courseSlug, lessonSlug }, null, 2))
              } catch (e) {
                setError((e as Error).message)
              }
            }}
          >
            Vincular ao destino aberto
          </Button>
          <Button disabled={busy || !source.trim()} onClick={() => void inspect()}>
            {busy ? 'Processando…' : 'Conferir importação'}
          </Button>
        </div>
        {preview && (
          <div className="space-y-4 rounded-xl border border-primary/25 bg-primary/5 p-5">
            <h3 className="font-semibold">{preview.title}</h3>
            <p className="text-sm">
              {preview.blocks.filter((b) => b.action === 'create').length} blocos novos ·{' '}
              {preview.blocks.filter((b) => b.action === 'update').length} atualizados ·{' '}
              {preview.blocks.filter((b) => b.action === 'preserve').length} preservados
            </p>
            <ol className="space-y-2">
              {preview.sections.map((section, index) => (
                <li key={section.id} className="text-sm">
                  <strong>
                    {index + 1}. {section.title}
                  </strong>
                  <p className="text-muted-foreground">{section.objective}</p>
                  {section.pendingMedia.length > 0 && (
                    <p>Mídias pendentes: {section.pendingMedia.join('; ')}</p>
                  )}
                </li>
              ))}
            </ol>
            {preview.warnings.map((warning) => (
              <p key={warning} className="text-sm">
                {warning}
              </p>
            ))}
            <Button disabled={busy || published} onClick={() => void apply()}>
              Aplicar ao rascunho desta aula
            </Button>
          </div>
        )}
        {notice && (
          <p role="status" className="text-sm">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </fieldset>
    </details>
  )
}
