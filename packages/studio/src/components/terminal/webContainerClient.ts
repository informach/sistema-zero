import type { WebContainer } from '@webcontainer/api'

let bootPromise: Promise<WebContainer> | null = null

/**
 * WebContainer só pode ser inicializado uma vez por aba. Este singleton evita
 * boot duplicado quando o aluno alterna abas ou troca de projeto.
 *
 * `forwardPreviewErrors: 'exceptions-only'` habilita o evento `preview-message`,
 * que o modo profissional (ProPreview) usa para encaminhar exceções do app ao
 * console do Studio (o preview é cross-origin, não dá para ler o console dele).
 */
export function getWebContainer(): Promise<WebContainer> {
  if (!bootPromise) {
    bootPromise = import('@webcontainer/api')
      .then(({ WebContainer }) =>
        WebContainer.boot({ coep: 'credentialless', forwardPreviewErrors: 'exceptions-only' }),
      )
      .catch((error) => {
        bootPromise = null
        throw error
      })
  }

  return bootPromise
}

/**
 * Apaga o FS do container preservando `keep` (default `node_modules`) — usado ao
 * trocar de projeto profissional para remontar a árvore sem reinstalar deps
 * (boot+install são lentos; preservar node_modules evita o npm install de novo
 * quando o template é o mesmo).
 */
export async function resetWebContainerFs(
  wc: WebContainer,
  keep: readonly string[] = ['node_modules'],
): Promise<void> {
  const keepSet = new Set(keep)
  const entries = await wc.fs.readdir('/', { withFileTypes: true })
  await Promise.all(
    entries
      .filter((entry) => !keepSet.has(entry.name))
      .map((entry) => wc.fs.rm(`/${entry.name}`, { recursive: true, force: true })),
  )
}
