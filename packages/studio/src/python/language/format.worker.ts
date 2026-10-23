import initialize, { PositionEncoding, Workspace } from '@astral-sh/ruff-wasm-web'
import { PYTHON_LANGUAGE_LIMITS } from '@sistemazero/core/studio/python-language'

// Official Ruff runs in a dedicated worker and is downloaded only on explicit formatting.
let workspace: Promise<Workspace> | undefined
function loadWorkspace() {
  workspace ??= initialize()
    .then(() => {
      if (Workspace.version() !== '0.17.1')
        throw new Error('Versão inesperada do formatador Python.')
      return new Workspace(
        {
          'target-version': 'py314',
          'line-length': 88,
          'indent-width': 4,
          format: { 'indent-style': 'space', 'quote-style': 'preserve', 'line-ending': 'auto' },
        },
        PositionEncoding.Utf16,
      )
    })
    .catch((error: unknown) => {
      // A failed download must not poison subsequent explicit formatting attempts.
      workspace = undefined
      throw error
    })
  return workspace
}
let busy = false
self.onmessage = async (event: MessageEvent<unknown>) => {
  const data = event.data
  if (
    !data ||
    typeof data !== 'object' ||
    !('id' in data) ||
    !Number.isSafeInteger(data.id) ||
    !('source' in data) ||
    typeof data.source !== 'string'
  )
    return
  if (busy) {
    self.postMessage({ id: data.id, error: 'Aguarde a organização do código em andamento.' })
    return
  }
  busy = true
  try {
    if (new TextEncoder().encode(data.source).length > PYTHON_LANGUAGE_LIMITS.maxFileBytes)
      throw new Error('Este arquivo ultrapassou o limite de formatação Python.')
    const value = (await loadWorkspace()).format(data.source)
    if (new TextEncoder().encode(value).length > PYTHON_LANGUAGE_LIMITS.maxFileBytes)
      throw new Error('O código formatado ultrapassou o limite do arquivo.')
    self.postMessage({ id: data.id, value })
  } catch (error) {
    self.postMessage({
      id: data.id,
      error:
        error instanceof Error
          ? error.message
          : 'Confira a sintaxe antes de organizar o código Python.',
    })
  } finally {
    busy = false
  }
}
