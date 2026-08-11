import type { Project } from '#core'

export interface StudioPlayerOriginRequest {
  project: Project
  /** Documento completo já endurecido pelo Studio. */
  document: string
  signal: AbortSignal
}

/**
 * Fronteira do host para publicar o documento numa origem isolada. O adaptador
 * deve devolver uma URL HTTP(S) absoluta em origem diferente da página host.
 */
export interface StudioPlayerOriginAdapter {
  createPreviewUrl(request: StudioPlayerOriginRequest): Promise<string>
  /** Libera URL/artefato temporário quando o player troca de projeto ou desmonta. */
  releasePreviewUrl?(url: string): void | Promise<void>
}

export function validateIsolatedPreviewUrl(rawUrl: string, parentOrigin: string): string {
  let preview: URL
  let parent: URL
  try {
    preview = new URL(rawUrl)
    parent = new URL(parentOrigin)
  } catch {
    throw new Error('O adaptador do player deve devolver uma URL absoluta válida.')
  }
  if (preview.protocol !== 'https:' && preview.protocol !== 'http:') {
    throw new Error('O adaptador do player deve devolver uma URL HTTP(S).')
  }
  if (preview.username || preview.password) {
    throw new Error('A URL do player não pode conter credenciais.')
  }
  if (preview.origin === parent.origin) {
    throw new Error('A URL do player precisa usar uma origem diferente da página host.')
  }
  return preview.href
}
