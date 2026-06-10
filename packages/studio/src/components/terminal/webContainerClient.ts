import type { WebContainer } from '@webcontainer/api'

let bootPromise: Promise<WebContainer> | null = null

/**
 * WebContainer só pode ser inicializado uma vez por aba. Este singleton evita
 * boot duplicado quando o aluno alterna abas ou troca de projeto.
 */
export function getWebContainer(): Promise<WebContainer> {
  if (!bootPromise) {
    bootPromise = import('@webcontainer/api')
      .then(({ WebContainer }) => WebContainer.boot({ coep: 'credentialless' }))
      .catch((error) => {
        bootPromise = null
        throw error
      })
  }

  return bootPromise
}
