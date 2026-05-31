/**
 * Idle timeout no streaming do CORPO da RESPOSTA (o timeout de conexão cobre só os
 * headers). Aborta (via `onIdle`) se o stream ficar `ms` sem emitir um chunk.
 *
 * Usa `pipeTo(writable).catch(...)` (não `pipeThrough`) p/ engolir a rejeição do
 * pipe quando a origem é cancelada — senão viraria `unhandledRejection` (que o
 * `index.ts` trata derrubando o processo). O timer é `unref`'d e o abort idempotente.
 *
 * OBS: aplicamos isto só no corpo da RESPOSTA. O corpo da REQUISIÇÃO não é piped
 * (o teto é enforçado pelo `maxRequestBodySize` do Bun.serve) — pipar o stream de
 * entrada do Bun sob latência disparava um erro interno de `node:stream`.
 */
export function idleTimeoutStream(
  body: ReadableStream<Uint8Array>,
  ms: number,
  onIdle: () => void,
): ReadableStream<Uint8Array> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const arm = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(onIdle, ms)
    timer.unref?.()
  }
  const disarm = () => {
    if (timer) clearTimeout(timer)
  }
  const ts = new TransformStream<Uint8Array, Uint8Array>({
    start() {
      arm()
    },
    transform(chunk, controller) {
      arm()
      controller.enqueue(chunk)
    },
    flush() {
      disarm()
    },
  })
  void body.pipeTo(ts.writable).catch(() => disarm())
  return ts.readable
}
