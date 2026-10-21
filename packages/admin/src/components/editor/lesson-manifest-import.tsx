'use client'

import {
  cursoEditorialComum,
  hasLegacyStudioManifestSolution,
  isLearningManifest,
  LEARNING_IMPORT_BODY_MAX_BYTES,
  LEARNING_MANIFEST_SOURCE_MAX_BYTES,
  type LessonSection,
  learningImportBodyBytes,
  manifestoParaDestino,
} from '@sistemazero/core/learning'
import { Button } from '@sistemazero/ui/button'
import { Textarea } from '@sistemazero/ui/textarea'
import { useId, useRef, useState } from 'react'
import { type ApiError, apiSend } from '@/lib/api'

interface Preview {
  title: string
  fingerprint: string
  warnings: string[]
  sections: LessonSection[]
  blocks: Array<{
    id: string
    label?: string
    action: 'create' | 'update' | 'preserve' | 'retire' | 'remove'
  }>
  removedSections: Array<{ id: string; title: string }>
  removedExamples?: Array<{
    blockId: string
    sectionId: string
    sectionTitle: string
    role: 'entryExampleId' | 'solutionExampleId'
    exampleId: string
    exampleName: string
  }>
}
type ImportMode = 'preserve' | 'replace'

/** Quantos blocos `plannedVideo` o texto do manifesto traz (0 quando ainda não é JSON). */
export function plannedVideoCount(source: string): number {
  try {
    const value: unknown = JSON.parse(source)
    if (hasLegacyStudioManifestSolution(value))
      throw new Error(
        'Este manifesto contém um gabarito global antigo. Converta o arquivo para exemplos por parte antes de importar.',
      )
    const blocks = (value as { blocks?: unknown } | null)?.blocks
    return Array.isArray(blocks)
      ? blocks.filter((block) => block && typeof block === 'object' && 'plannedVideo' in block)
          .length
      : 0
  } catch {
    return 0
  }
}

export function LessonManifestImport({
  lessonId,
  lessonSlug,
  courseSlug,
  live = false,
  disabled,
  onImported,
  beforeImport,
}: {
  lessonId: string
  lessonSlug: string
  courseSlug: string
  /**
   * Aula de curso AO VIVO. O servidor recusa `plannedVideo` (o vídeo é a transmissão) e o recado
   * dele aparece no alerta; aqui só avisamos antes, quando o arquivo traz vídeo planejado.
   */
  live?: boolean
  disabled: boolean
  onImported: () => Promise<void>
  beforeImport: () => Promise<void>
}) {
  const id = useId()
  const [source, setSource] = useState('')
  const operationId = useRef(crypto.randomUUID())
  const [mode, setMode] = useState<ImportMode>('preserve')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [replacementConfirmed, setReplacementConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const change = (text: string) => {
    operationId.current = crypto.randomUUID()
    setSource(text)
    setPreview(null)
    setReplacementConfirmed(false)
    setError('')
    setNotice('')
  }
  const changeMode = (next: ImportMode) => {
    operationId.current = crypto.randomUUID()
    setMode(next)
    setPreview(null)
    setReplacementConfirmed(false)
    setError('')
    setNotice('')
  }
  const parse = () => {
    if (new TextEncoder().encode(source).byteLength > LEARNING_MANIFEST_SOURCE_MAX_BYTES)
      throw new Error(
        'O texto do arquivo excede 16 MiB. Reduza a formatação ou os snapshots antes de ler.',
      )
    const value: unknown = JSON.parse(source)
    if (!isLearningManifest(value))
      throw new Error('Confira o formato do manifesto, as atividades e as referências das seções.')
    return value
  }
  async function inspect() {
    setBusy(true)
    setError('')
    try {
      await beforeImport()
      operationId.current = crypto.randomUUID()
      const document = parse()
      if (learningImportBodyBytes(document, mode) > LEARNING_IMPORT_BODY_MAX_BYTES)
        throw new Error(
          'O corpo completo de importação excede 2 MiB. Reduza os snapshots antes de preparar a prévia.',
        )
      setPreview(
        await apiSend<Preview>(`/api/members/lessons/${lessonId}/import-preview`, 'POST', {
          document,
          mode,
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
      const document = parse()
      if (
        learningImportBodyBytes(document, mode, preview.fingerprint, operationId.current) >
        LEARNING_IMPORT_BODY_MAX_BYTES
      )
        throw new Error(
          'O corpo completo de importação excede 2 MiB, incluindo revisão e operação. Reduza os snapshots antes de aplicar.',
        )
      await apiSend(`/api/members/lessons/${lessonId}/import-learning`, 'POST', {
        document,
        mode,
        expectedFingerprint: preview.fingerprint,
        operationId: operationId.current,
      })
      setPreview(null)
      setSource('')
      setReplacementConfirmed(false)
      await onImported()
      setNotice(
        mode === 'replace'
          ? 'Rascunho substituído pelo manifesto. Confira a prévia antes de publicar.'
          : 'Rascunho atualizado pelo manifesto. Confira a prévia antes de publicar.',
      )
    } catch (e) {
      setError((e as ApiError).message || 'Não foi possível importar.')
    } finally {
      setBusy(false)
    }
  }
  const leaving =
    preview?.blocks.filter((b) => b.action === 'retire' || b.action === 'remove') ?? []
  const liveVideos = live ? plannedVideoCount(source) : 0
  return (
    <details className="rounded-2xl border border-border bg-card p-5">
      <summary className="cursor-pointer font-semibold">Importar roteiro com seções</summary>
      <fieldset disabled={busy || disabled} className="mt-4 space-y-4">
        {disabled && (
          <p className="text-sm">Resolva a sincronização do rascunho antes de importar.</p>
        )}
        <p className="text-sm text-muted-foreground">
          Destino:{' '}
          <strong>
            {courseSlug} / {lessonSlug}
          </strong>
          . O manifesto manda no que ele criou: o que saiu do arquivo sai do rascunho, inclusive
          vídeo já vinculado (ele continua no Vimeo). A prévia mostra o que entra, o que muda e o
          que sai. O projeto inicial do Estúdio vem sempre do manifesto; projetos já salvos pelos
          alunos e arquivos anexados não são apagados, e a versão publicada só muda quando você
          publicar.
        </p>
        <fieldset className="space-y-2 rounded-xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold">Como importar</legend>
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              type="radio"
              name={`${id}-mode`}
              value="preserve"
              checked={mode === 'preserve'}
              onChange={() => changeMode('preserve')}
            />
            <span>
              <strong className="block">Atualizar pelo manifesto</strong>
              Deixa a aula igual ao arquivo. Só os blocos que você criou aqui no Admin, fora do
              manifesto, ficam no fim da aula.
            </span>
          </label>
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input
              type="radio"
              name={`${id}-mode`}
              value="replace"
              checked={mode === 'replace'}
              onChange={() => changeMode('replace')}
            />
            <span>
              <strong className="block">Substituir o rascunho inteiro</strong>
              Remove também os blocos criados aqui no Admin que não estão no arquivo. A versão
              publicada não muda.
            </span>
          </label>
        </fieldset>
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
              if (file.size > LEARNING_MANIFEST_SOURCE_MAX_BYTES) {
                setError(
                  'O arquivo deve ter até 16 MiB para abrir aqui. O conteúdo completo da importação será conferido antes de aplicar.',
                )
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
        {liveVideos > 0 && (
          <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            Esta aula é de um curso ao vivo e o arquivo traz{' '}
            {liveVideos === 1 ? 'um vídeo planejado' : `${liveVideos} vídeos planejados`}. Na aula
            ao vivo o vídeo é a transmissão do encontro, por isso o servidor recusa vídeo planejado.
            Tire esses blocos do arquivo antes de importar.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={busy || !source.trim()}
            onClick={() => {
              try {
                const origem = parse()
                const vinculado = cursoEditorialComum(origem.courseSlug)
                  ? manifestoParaDestino(origem, { courseSlug, lessonSlug })
                  : { ...origem, courseSlug, lessonSlug }
                change(JSON.stringify(vinculado, null, 2))
                setNotice(
                  `Arquivo vinculado a ${courseSlug} / ${lessonSlug}. Confira a prévia antes de aplicar; mídias já publicadas permanecem no modo de preservação.`,
                )
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
              {preview.blocks.filter((b) => b.action === 'preserve').length} sem mudança ·{' '}
              {leaving.length} saem do rascunho
            </p>
            {preview.removedSections.length > 0 && (
              <details open className="text-sm">
                <summary className="cursor-pointer font-medium">Seções que sairão</summary>
                <ul className="mt-2 list-disc pl-5">
                  {preview.removedSections.map((section) => (
                    <li key={section.id}>{section.title}</li>
                  ))}
                </ul>
              </details>
            )}
            {!!preview.removedExamples?.length && (
              <details open className="text-sm">
                <summary className="cursor-pointer font-medium">
                  Exemplos que serão substituídos ou removidos
                </summary>
                <ul className="mt-2 list-disc pl-5">
                  {preview.removedExamples.map((example) => (
                    <li key={`${example.blockId}:${example.sectionId}:${example.role}`}>
                      {example.sectionTitle}:{' '}
                      {example.role === 'entryExampleId' ? 'entrada' : 'solução'} —{' '}
                      {example.exampleName}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {leaving.length > 0 && (
              <details open className="text-sm">
                <summary className="cursor-pointer font-medium">
                  Blocos que sairão do rascunho
                </summary>
                <ul className="mt-2 list-disc pl-5">
                  {leaving.map((block) => (
                    <li key={block.id}>{block.label ?? block.id}</li>
                  ))}
                </ul>
              </details>
            )}
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
            {mode === 'replace' && (
              <label className="flex min-h-11 items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={replacementConfirmed}
                  onChange={(event) => setReplacementConfirmed(event.target.checked)}
                />
                Entendo que os blocos criados aqui no Admin que não estão no manifesto também serão
                removidos deste rascunho.
              </label>
            )}
            <Button
              disabled={busy || (mode === 'replace' && !replacementConfirmed)}
              onClick={() => void apply()}
            >
              {mode === 'replace' ? 'Substituir rascunho' : 'Aplicar ao rascunho desta aula'}
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
