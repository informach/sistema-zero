const MODELS_READY_MS = 15_000
const STEADY_FRAME_GAP_MS = 400
const STEADY_WINDOW_MS = 2_000

// Executado no mundo isolado, sem os relógios e callbacks substituídos pelo jogo.
export function observeSteadyFrames(ms) {
  return new Promise((resolve) => {
    let last = performance.now()
    let worst = 0
    let frames = 0
    const end = last + ms
    const tick = (t) => {
      worst = Math.max(worst, t - last)
      last = t
      frames++
      if (t < end) requestAnimationFrame(tick)
      else resolve(frames >= 2 ? worst : Infinity)
    }
    requestAnimationFrame(tick)
  })
}

/** Prontidão é pré-condição, não um veredito sobre o programa da criança. */
export async function waitForModels(page, probe) {
  const until = Date.now() + MODELS_READY_MS
  const unavailable = () => new Error('O jogo 3D não ficou pronto no prazo do executor.')
  const bounded = async (operation) => {
    const remaining = until - Date.now()
    if (remaining <= 0) throw unavailable()
    let timer
    try {
      return await Promise.race([
        operation(remaining),
        new Promise((_, reject) => {
          timer = setTimeout(() => reject(unavailable()), remaining)
        }),
      ])
    } finally {
      clearTimeout(timer)
    }
  }
  if (!(await bounded(() => probe.main(() => typeof window.SZGame3D === 'object')))) return
  const pending = async () => {
    const count = await bounded(() => probe.main(() => window.__szModelosPendentes ?? 0))
    if (!Number.isSafeInteger(count) || count < 0)
      throw new Error('Não foi possível observar o carregamento dos modelos 3D.')
    return count
  }
  while (true) {
    while (await pending())
      await bounded((remaining) => page.waitForTimeout(Math.min(100, remaining)))
    const remaining = until - Date.now()
    if (remaining < STEADY_WINDOW_MS) throw unavailable()
    const longest = await bounded((timeout) =>
      probe.isolated(`(${observeSteadyFrames.toString()})(${STEADY_WINDOW_MS})`, timeout),
    )
    if (
      Number.isFinite(longest) &&
      longest >= 0 &&
      longest < STEADY_FRAME_GAP_MS &&
      !(await pending())
    )
      return
  }
}
