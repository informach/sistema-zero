'use client'
import { Button } from '@sistemazero/ui/button'
import { Dialog } from '@sistemazero/ui/dialog'
import { Input } from '@sistemazero/ui/input'
import { useId, useRef, useState } from 'react'
import { errorMessage, type WorkbenchPort } from './port'
import {
  type ImportedReference,
  parseReferenceImport,
  referenceImportBatch,
} from './reference-import'
export function ReferenceImportDialog({
  port,
  projectId,
  onClose,
  onSaved,
}: {
  port: WorkbenchPort
  projectId: string
  onClose: () => void
  onSaved: () => void
}) {
  const selection = useRef(0)
  const id = useId(),
    [references, setReferences] = useState<Array<{ id: string; reference: ImportedReference }>>([]),
    [name, setName] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false)
  return (
    <Dialog
      open
      onClose={() => {
        if (!busy) onClose()
      }}
      title="Importar fontes e referências"
    >
      <div className="space-y-4 p-5">
        <p className="text-sm text-muted-foreground">
          CSV ou lista JSON com title, label e, opcionalmente, body, url, classification, product,
          validity, observedAt e tags. As referências não alteram a direção nem aprovam peças.
        </p>
        <label htmlFor={id} className="block text-sm font-medium">
          Arquivo de referências
        </label>
        <Input
          id={id}
          type="file"
          accept=".csv,.json"
          disabled={busy}
          onChange={(event) => {
            const generation = ++selection.current
            const file = event.target.files?.[0]
            setReferences([])
            setError('')
            if (!file) return
            if (file.size > 2_000_000) {
              setError('O arquivo excede 2 MB')
              return
            }
            setName(file.name)
            void file
              .text()
              .then((text) => {
                if (selection.current !== generation) return
                setReferences(
                  parseReferenceImport(
                    text,
                    file.name.toLowerCase().endsWith('.csv') ? 'csv' : 'json',
                  ).map((reference) => ({ id: crypto.randomUUID(), reference })),
                )
              })
              .catch((error) => {
                if (selection.current === generation) setError(errorMessage(error))
              })
          }}
        />
        {references.length ? (
          <>
            <p className="text-sm font-medium">
              {references.length} referências prontas para importar
            </p>
            <ul className="max-h-60 space-y-2 overflow-y-auto text-sm">
              {references.map(({ reference, id }) => (
                <li key={id}>
                  {reference.title} · {reference.label}
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <Button
          disabled={busy || !references.length}
          onClick={() => {
            setBusy(true)
            setError('')
            void referenceImportBatch(
              projectId,
              name,
              references.map((row) => row.reference),
            )
              .then((batch) => port.saveBatch(batch))
              .then(onSaved)
              .catch((error) => setError(errorMessage(error)))
              .finally(() => setBusy(false))
          }}
        >
          {busy ? 'Guardando…' : 'Importar para o projeto'}
        </Button>
      </div>
    </Dialog>
  )
}
