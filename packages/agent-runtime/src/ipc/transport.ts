import { createHmac, timingSafeEqual } from 'node:crypto'
import { EventEmitter } from 'node:events'
import type { Socket } from 'node:net'

export const MAX_FRAME = 1024 * 1024
export function proof(secret: string, value: string) {
  return createHmac('sha256', secret).update(value).digest('hex')
}
export function verify(secret: string, value: string, signature: string) {
  const expected = Buffer.from(proof(secret, value))
  const supplied = Buffer.from(signature)
  return expected.length === supplied.length && timingSafeEqual(expected, supplied)
}
export class Frames extends EventEmitter {
  private buffer = Buffer.alloc(0)
  constructor(readonly socket: Socket) {
    super()
    socket.on('data', (raw) => {
      const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
      try {
        let start = 0
        for (let end = chunk.indexOf(10); end >= 0; end = chunk.indexOf(10, start)) {
          if (this.buffer.length + end - start > MAX_FRAME) throw new Error('IPC frame too large')
          const line = Buffer.concat([this.buffer, chunk.subarray(start, end)])
          this.buffer = Buffer.alloc(0)
          start = end + 1
          if (line.length) this.emit('message', JSON.parse(line.toString('utf8')))
        }
        if (this.buffer.length + chunk.length - start > MAX_FRAME)
          throw new Error('IPC frame too large')
        this.buffer = Buffer.concat([this.buffer, chunk.subarray(start)])
      } catch (error) {
        socket.destroy(error instanceof Error ? error : new Error('Invalid IPC frame'))
      }
    })
  }
  send(value: unknown) {
    const frame = JSON.stringify(value)
    if (Buffer.byteLength(frame) > MAX_FRAME) throw new Error('IPC response too large')
    if (this.socket.writableLength > MAX_FRAME * 2) throw new Error('IPC client too slow')
    this.socket.write(`${frame}\n`)
  }
}
