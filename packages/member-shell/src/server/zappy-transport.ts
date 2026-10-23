import 'server-only'

/** Flush only after contextual policy checks. A live journal must not wait for the model. */
export function streamZappyAnswer(
  run: (signal: AbortSignal) => Promise<Response>,
  signal: AbortSignal,
) {
  const cancellation = new AbortController()
  const joined = AbortSignal.any([signal, cancellation.signal])
  const encoder = new TextEncoder()
  let closed = false
  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"transportVersion":1,'))
        void run(joined)
          .then(async (response) => {
            const body = await response.json()
            if (closed) return
            controller.enqueue(
              encoder.encode(JSON.stringify({ status: response.status, body }).slice(1)),
            )
            closed = true
            controller.close()
          })
          .catch(() => {
            if (closed) return
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  status: 503,
                  body: { error: { code: 'ZAPPY_UNAVAILABLE' } },
                }).slice(1),
              ),
            )
            closed = true
            controller.close()
          })
      },
      cancel() {
        closed = true
        cancellation.abort()
      },
    }),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'private, no-store, no-transform',
        'x-content-type-options': 'nosniff',
      },
    },
  )
}
