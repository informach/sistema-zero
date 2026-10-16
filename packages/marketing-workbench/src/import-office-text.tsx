'use client'
import { importOfficeViewSchema, stableEditorialId } from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import type { WorkbenchPort } from './port'

/** Same bounded request on web and desktop; only the original asset is read.
 * Extraction and hash validation happen in the server's deterministic parser. */
export async function prepareOfficeText(
  port: WorkbenchPort,
  projectId: string,
  sourceId: string,
  canExtract: boolean,
) {
  const endpoint = `/projects/${projectId}/import-sources/${sourceId}/office-text`
  const view = importOfficeViewSchema.parse(await port.request(endpoint))
  if (view.sourceVersionId !== sourceId) throw new Error('O servidor retornou outra origem')
  if (view.destinations.length) return view
  if (!canExtract)
    throw new Error(
      'O texto ainda não foi extraído. Uma pessoa com permissão de edição pode prepará-lo; o original está preservado.',
    )
  if (view.size > 196608)
    throw new Error(
      'Extração Office limitada a arquivos de 192 KiB. O original está preservado para consulta.',
    )
  const response = await fetch(await port.assetUrl(projectId, view.assetId), {
    signal: AbortSignal.timeout(60000),
  })
  if (!response.ok || !response.body) throw new Error('Não foi possível ler o original preservado')
  const reader = response.body.getReader()
  let binary = ''
  try {
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      if (binary.length + part.value.length > view.size)
        throw new Error('Tamanho do original divergente')
      for (const byte of part.value) binary += String.fromCharCode(byte)
    }
  } finally {
    await reader.cancel()
    reader.releaseLock()
  }
  if (binary.length !== view.size) throw new Error('Original incompleto; tente novamente')
  return importOfficeViewSchema.parse(
    await port.request(endpoint, 'POST', {
      operationId: await stableEditorialId(`${projectId}:${sourceId}:${view.parserVersion}`),
      base64: btoa(binary),
    }),
  )
}
export function ImportOfficeText({
  port,
  projectId,
  sourceId,
  canExtract,
  busy,
  run,
  onOpen,
}: {
  port: WorkbenchPort
  projectId: string
  sourceId: string
  canExtract: boolean
  busy: boolean
  run(work: () => Promise<void>): void
  onOpen(id: string, kind: 'evidence'): void
}) {
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={() =>
        run(async () => {
          const value = await prepareOfficeText(port, projectId, sourceId, canExtract)
          await port.synchronize()
          const first = value.destinations[0]
          if (first) onOpen(first.entityId, 'evidence')
        })
      }
    >
      Abrir texto extraído do Office
    </Button>
  )
}
