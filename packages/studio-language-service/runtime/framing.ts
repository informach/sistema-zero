import { Transform, type TransformCallback } from 'node:stream'

/** Bound upstream frames before the JSON-RPC reader allocates their declared body. */
export class BoundedLspStream extends Transform {
  private header = Buffer.alloc(0)
  private remaining = 0
  constructor(private readonly maxFrameBytes = 16 * 1024 * 1024) {
    super()
  }

  override _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback) {
    try {
      let offset = 0
      while (offset < chunk.length) {
        if (this.remaining) {
          const size = Math.min(this.remaining, chunk.length - offset)
          offset += size
          this.remaining -= size
          continue
        }
        const previous = this.header.length
        const size = Math.min(4096 - previous, chunk.length - offset)
        this.header = Buffer.concat([this.header, chunk.subarray(offset, offset + size)])
        const separator = this.header.indexOf('\r\n\r\n')
        if (separator < 0) {
          offset += size
          if (this.header.length === 4096) throw new Error('LSP header exceeds limit')
          continue
        }
        const lines = this.header.subarray(0, separator).toString('ascii').split('\r\n')
        const lengths = lines.filter((line) => /^content-length:/i.test(line))
        const match =
          lengths.length === 1 ? /^content-length:\s*(\d+)\s*$/i.exec(lengths[0]!) : null
        const length = match ? Number(match[1]) : NaN
        if (!Number.isSafeInteger(length) || length < 1 || length > this.maxFrameBytes)
          throw new Error('Invalid LSP frame length')
        offset += separator + 4 - previous
        this.remaining = length
        this.header = Buffer.alloc(0)
      }
      callback(null, chunk)
    } catch (error) {
      callback(error as Error)
    }
  }

  override _flush(callback: TransformCallback) {
    callback(this.remaining || this.header.length ? new Error('Incomplete LSP frame') : null)
  }
}
