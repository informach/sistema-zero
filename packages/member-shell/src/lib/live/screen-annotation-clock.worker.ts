/**
 * O relógio do compositor do desenho (`screen-annotation.ts`).
 *
 * ⚠️ Mora num Worker DE PROPÓSITO. A professora opera a aba de demonstração e a aba da sala fica em
 * segundo plano: ali o Chrome segura o `setInterval` da página em 1 disparo por segundo e o
 * `requestAnimationFrame` para. Medido em 14/10/2026 (Chrome 155, aba escondida, canvas →
 * `captureStream` → WebRTC): com o relógio na página saía 1 quadro por segundo; com este Worker,
 * 15. O Worker não sofre essa espera, e a mensagem dele acorda a página na hora.
 */
let timer: ReturnType<typeof setInterval> | undefined

self.addEventListener('message', (event: MessageEvent<{ fps?: number }>) => {
  clearInterval(timer)
  timer = undefined
  const fps = event.data?.fps ?? 0
  if (fps > 0) timer = setInterval(() => self.postMessage(0), 1000 / fps)
})
