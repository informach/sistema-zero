import {
  Z_BUF_ERROR,
  Z_NO_FLUSH,
  Z_OK,
  Z_STREAM_END,
  ZStream,
  zlibInflate,
  zlibInflateEnd,
  zlibInflateInit2,
} from 'pako'

/** Exactly one complete zlib stream. Consume each view before the output block is reused. */
export function visitBoundedPintaZlib(
  input: Iterable<Uint8Array>,
  maxBytes: number,
  visit: (output: Uint8Array) => void,
  invalid: () => never,
  overBudget: () => never,
): void {
  const stream = new ZStream()
  if (zlibInflateInit2(stream, 15) !== Z_OK) invalid()
  let bytes = 0
  let ended = false
  try {
    const output = new Uint8Array(Math.min(16 * 1024, maxBytes + 1))
    for (const chunk of input) {
      if (!chunk.length) continue
      if (ended) invalid()
      stream.input = chunk
      stream.next_in = 0
      stream.avail_in = chunk.length
      do {
        stream.output = output
        stream.next_out = 0
        stream.avail_out = Math.min(output.length, maxBytes - bytes + 1)
        const before = stream.avail_in
        const status = zlibInflate(stream, Z_NO_FLUSH)
        const used = stream.next_out
        bytes += used
        if (bytes > maxBytes) overBudget()
        if (status === Z_BUF_ERROR && !before && !used) break
        if (status !== Z_OK && status !== Z_STREAM_END) invalid()
        if (used) visit(output.subarray(0, used))
        if (status === Z_STREAM_END) {
          if (stream.avail_in) invalid()
          ended = true
          break
        }
        if (before === stream.avail_in && !used) invalid()
      } while (stream.avail_in > 0 || !stream.avail_out)
    }
    if (!ended) invalid()
  } finally {
    if (zlibInflateEnd(stream) !== Z_OK) invalid()
  }
}
