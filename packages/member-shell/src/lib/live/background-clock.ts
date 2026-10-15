'use client'

/**
 * O relógio de verdade da sala: um Worker que bate `fps` vezes por segundo, mesmo com a aba
 * escondida. Sem Worker (ou se ele não carregar), cai no `setInterval`, que só vale com a aba à
 * vista.
 *
 * ⚠️ Quem produz imagem para a turma (o desenho sobre a tela, o fundo da câmera) usa ESTE
 * relógio, nunca o `setInterval` da página: a professora trabalha em outra aba e a aba da sala
 * fica em segundo plano, onde o Chrome segura o `setInterval` em 1 disparo por segundo (e, depois
 * de alguns minutos escondida, em 1 por minuto). Medido em 14/10/2026: 1 quadro por segundo com
 * o relógio da página, 15 com o Worker.
 */
export function startBackgroundClock(fps: number, tick: () => void): () => void {
  let interval: ReturnType<typeof setInterval> | undefined
  let worker: Worker | undefined
  const fallback = () => {
    interval ??= setInterval(tick, 1000 / fps)
  }
  if (typeof Worker === 'function') {
    try {
      worker = new Worker(new URL('./background-clock.worker.ts', import.meta.url), {
        type: 'module',
        name: 'sz-live-background-clock',
      })
      worker.addEventListener('message', () => tick())
      worker.addEventListener('error', () => {
        worker?.terminate()
        worker = undefined
        fallback()
      })
      worker.postMessage({ fps })
    } catch {
      worker = undefined
      fallback()
    }
  } else fallback()
  return () => {
    worker?.terminate()
    worker = undefined
    clearInterval(interval)
    interval = undefined
  }
}
