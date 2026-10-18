import { StudioPythonPreviewMessageSchema } from '@sistemazero/core/studio/python-preview-bridge'
import { isStudioPythonWebOrigin } from '@sistemazero/core/studio/python-preview-input'
import type { StandalonePythonPlayerObserver } from './standalonePlayer'

/** The service writes this metadata; project payloads and the opaque learner frame cannot. */
export function pythonPreviewObserver(): StandalonePythonPlayerObserver {
  const parentOrigin = document.querySelector<HTMLMetaElement>(
      'meta[name="studio-python-preview-parent"]',
    )?.content,
    parameters = new URLSearchParams(location.hash.slice(1)),
    session = parameters.get('studio-preview-session'),
    previewId = /^\/v1\/python-previews\/([a-f0-9]{64})\/index\.html$/.exec(location.pathname)?.[1]
  if (
    !parentOrigin ||
    !isStudioPythonWebOrigin(parentOrigin) ||
    new URL(parentOrigin).origin !== parentOrigin ||
    window.parent === window ||
    !previewId ||
    parameters.size !== 1 ||
    !session ||
    !StudioPythonPreviewMessageSchema.safeParse({
      type: 'studio-python-preview',
      version: 1,
      session,
      previewId,
      status: 'loading',
    }).success
  )
    return {}
  const report = (status: 'loading' | 'ready' | 'unavailable') =>
    window.parent.postMessage(
      { type: 'studio-python-preview', version: 1, session, previewId, status },
      parentOrigin,
    )
  return {
    session() {
      report('loading')
    },
    event(event) {
      if (event.type === 'failed') report('unavailable')
      else if (
        event.type === 'state' &&
        ['running', 'waiting-input', 'completed', 'paused'].includes(event.state)
      )
        report('ready')
    },
    failed() {
      report('unavailable')
    },
  }
}
