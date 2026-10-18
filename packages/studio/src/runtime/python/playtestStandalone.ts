import { createPythonPlaytestCollector } from './playtestCollector'
import { startStandalonePythonPlayer } from './standalonePlayer'
import { fetchPythonWebBytes } from './webFiles'

/** Only the isolated validator serves this versioned entry and its host-owned recipe. */
async function start() {
  const bytes = await fetchPythonWebBytes(
    new URL('playtest-recipe.json', location.href),
    100_000,
    AbortSignal.timeout(10_000),
  )
  const recipe = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  const collector = createPythonPlaytestCollector(recipe, () => {
    const stop = document.querySelector('#stop')
    if (!(stop instanceof HTMLButtonElement))
      throw new Error('O player de validação está incompleto.')
    stop.click()
    return document.querySelectorAll('#stage iframe').length === 0
  })
  // The same protected frame/player, resolved beside this approved distribution module.
  startStandalonePythonPlayer(new URL('standalone.mjs', import.meta.url).href, collector.observer)
  Object.defineProperty(globalThis, '__studioPythonPlaytest', {
    value: Object.freeze({
      view: collector.view,
      submitNextLine: collector.submitNextLine,
      dispatched: collector.dispatched,
      finish: collector.finish,
    }),
    writable: false,
    configurable: false,
  })
}

void start().catch((error: unknown) => {
  reportError(error)
})
