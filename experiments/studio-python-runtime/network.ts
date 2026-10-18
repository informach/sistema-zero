/** Diagnostic server shaping: aggregate response bandwidth and delay, not a claim of NIC emulation. */
export function createRuntimeNetworkProfile() {
  const bytesPerSecond = 20_000_000 / 8
  let availableAt = 0
  let deliveredBytes = 0
  const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
  return {
    snapshot: () => ({ deliveredBytes, bytesPerSecond, responseDelayMs: 80 }),
    async shape(response: Response) {
      if (!response.ok || !response.body) return response
      await wait(80)
      const reader = response.body.getReader()
      const body = new ReadableStream<Uint8Array>({
        async pull(controller) {
          try {
            const next = await reader.read()
            if (next.done) {
              controller.close()
              reader.releaseLock()
              return
            }
            // Bound each scheduled slice, even if Blob/Response supplies the whole WASM at once.
            for (let offset = 0; offset < next.value.byteLength; offset += 65_536) {
              const chunk = next.value.subarray(
                offset,
                Math.min(offset + 65_536, next.value.byteLength),
              )
              const now = performance.now()
              availableAt = Math.max(availableAt, now) + (chunk.byteLength / bytesPerSecond) * 1000
              await wait(Math.max(0, availableAt - now))
              deliveredBytes += chunk.byteLength
              controller.enqueue(chunk)
            }
          } catch (error) {
            controller.error(error)
            await reader.cancel().catch(() => {})
          }
        },
        async cancel() {
          await reader.cancel()
          reader.releaseLock()
        },
      })
      return new Response(body, { status: response.status, headers: response.headers })
    },
  }
}
