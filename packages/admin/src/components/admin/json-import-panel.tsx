'use client'

import { Button } from '@sistemazero/ui/button'
import { Spinner } from '@sistemazero/ui/spinner'
import { Download, FileJson, Upload } from 'lucide-react'
import { type ReactNode, useId, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ImportParseResult } from '@/lib/lesson-block-import'
import { useConfirm } from './use-confirm'

export interface JsonDownload {
  label: string
  filename: string
  data: unknown
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

/**
 * Casca compartilhada dos importadores locais de autoria. Lê o `.json` no navegador,
 * delega contrato/prévia ao consumidor e só altera o form depois da confirmação.
 */
export function JsonImportPanel<T>({
  parse,
  renderPreview,
  onApply,
  hasExistingContent,
  guide,
  example,
  exampleFilename,
  extraDownloads = [],
  successMessage,
}: {
  parse: (text: string) => ImportParseResult<T>
  renderPreview: (data: T) => ReactNode
  onApply: (data: T) => void
  hasExistingContent: boolean
  guide: ReactNode
  example: unknown
  exampleFilename: string
  extraDownloads?: JsonDownload[]
  successMessage: string
}) {
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)
  const [candidate, setCandidate] = useState<{ filename: string; data: T } | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const { confirm, confirmDialog } = useConfirm()

  async function readFile(file: File) {
    setCandidate(null)
    setErrors([])
    if (!file.name.toLowerCase().endsWith('.json')) {
      setErrors(['Selecione um arquivo com a extensão .json.'])
      return
    }

    setReading(true)
    try {
      const result = parse(await file.text())
      if (result.success) setCandidate({ filename: file.name, data: result.data })
      else setErrors(result.errors)
    } catch {
      setErrors(['Não foi possível ler o arquivo. Tente selecioná-lo novamente.'])
    } finally {
      setReading(false)
    }
  }

  function apply(data: T) {
    onApply(data)
    setCandidate(null)
    setErrors([])
    toast.success(successMessage)
  }

  function requestApply() {
    if (!candidate) return
    if (!hasExistingContent) {
      apply(candidate.data)
      return
    }
    confirm({
      title: 'Substituir o conteúdo atual?',
      message: (
        <span>
          A importação de <strong>{candidate.filename}</strong> substituirá tudo que está preenchido
          neste campo. O bloco só será persistido quando você usar o botão <strong>Salvar</strong>.
        </span>
      ),
      confirmText: 'Substituir e aplicar',
      onConfirm: () => apply(candidate.data),
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <details className="group rounded-lg border border-border bg-muted/20 p-3">
        <summary className="cursor-pointer font-medium text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          Formato do arquivo
        </summary>
        <div className="mt-3 space-y-3 text-sm">
          {guide}
          <pre className="max-h-72 overflow-auto rounded-md bg-background p-3 font-mono text-xs">
            <code>{JSON.stringify(example, null, 2)}</code>
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => downloadJson(exampleFilename, example)}
            >
              <Download className="size-4" /> Baixar modelo
            </Button>
            {extraDownloads.map((download) => (
              <Button
                key={download.filename}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadJson(download.filename, download.data)}
              >
                <Download className="size-4" /> {download.label}
              </Button>
            ))}
          </div>
        </div>
      </details>

      <input
        ref={fileRef}
        id={inputId}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void readFile(file)
        }}
      />
      <button
        type="button"
        disabled={reading}
        onClick={() => fileRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border border-dashed bg-muted/30 px-4 py-4 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
      >
        {reading ? (
          <>
            <Spinner /> Lendo arquivo…
          </>
        ) : (
          <>
            <Upload className="size-4" /> Selecionar arquivo JSON
          </>
        )}
      </button>
      <p className="text-muted-foreground text-xs">
        O arquivo é lido somente neste navegador e não é enviado para um servidor.
      </p>

      {errors.length > 0 ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm"
        >
          <p className="font-medium text-destructive">Não foi possível importar:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {candidate ? (
        <div className="space-y-3 rounded-lg border border-success/30 bg-success/10 p-3">
          <div className="flex items-center gap-2 text-sm">
            <FileJson className="size-4 shrink-0 text-success-foreground" />
            <span className="truncate font-medium" title={candidate.filename}>
              {candidate.filename}
            </span>
          </div>
          {renderPreview(candidate.data)}
          <Button type="button" size="sm" onClick={requestApply}>
            Aplicar importação
          </Button>
        </div>
      ) : null}
      {confirmDialog}
    </div>
  )
}
