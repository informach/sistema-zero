import './configureProtectedSchemas'

import { STUDIO_PYTHON_INSPECTION_LIMITS } from '@sistemazero/core/studio/python-inspection'
import { preparePythonAnalysisSession } from '../../python/language/session'
import { inspectPythonSnapshot } from './inspection'
import { loadPythonWebPayload } from './webPayload'

/** Trusted inspector entry used by the isolated validator, never a learner-controlled script. */
async function inspect() {
  const lifetime = new AbortController()
  window.addEventListener('pagehide', () => lifetime.abort(), { once: true })
  const signal = AbortSignal.any([
    lifetime.signal,
    AbortSignal.timeout(STUDIO_PYTHON_INSPECTION_LIMITS.deadlineMs),
  ])
  const directory = new URL('./', location.href)
  const structure = document.documentElement.dataset.pythonStructure === 'true'
  const { snapshot } = await loadPythonWebPayload(directory, signal)
  // The module URL belongs to the validator's verified distribution. The project supplies no URL.
  const runtimeDirectory = new URL('./', import.meta.url)
  if (!runtimeDirectory.pathname.endsWith(`/${snapshot.configuration.runtime.manifestSha256}/`))
    throw new Error('O inspector não pertence ao runtime do snapshot.')
  const frame = document.createElement('iframe')
  frame.hidden = true
  frame.title = 'Inspeção de sintaxe Python'
  document.body.append(frame)
  try {
    const report = await inspectPythonSnapshot({
      snapshot,
      structure,
      signal,
      createSession: (signal) =>
        preparePythonAnalysisSession({
          frame,
          signal,
          url: new URL('analysis.html', runtimeDirectory).href,
          allowedOrigins: [runtimeDirectory.origin],
          runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
        }),
    })
    signal.throwIfAborted()
    Object.defineProperty(globalThis, '__studioPythonInspection', {
      value: { ok: true, report },
      configurable: false,
      writable: false,
    })
  } finally {
    frame.remove()
  }
}

void inspect().catch((error: unknown) => {
  Object.defineProperty(globalThis, '__studioPythonInspection', {
    value: {
      ok: false,
      message:
        error instanceof Error
          ? error.message.slice(0, 2000)
          : 'Não foi possível inspecionar a revisão Python.',
    },
    configurable: false,
    writable: false,
  })
})
