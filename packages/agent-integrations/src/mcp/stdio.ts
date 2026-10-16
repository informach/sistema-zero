import { StringDecoder } from 'node:string_decoder'
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js'
import { type JSONRPCMessage, JSONRPCMessageSchema } from '@modelcontextprotocol/sdk/types.js'
export interface ManagedProcess {
  stdout: AsyncIterable<Uint8Array>
  stderr: AsyncIterable<Uint8Array>
  send: (data: string | Uint8Array) => void
  close: () => Promise<unknown>
}
export interface JsonLineStreams {
  input: AsyncIterable<Uint8Array>
  diagnostics?: AsyncIterable<Uint8Array>
  write: (data: string) => void | Promise<void>
  close: () => Promise<unknown>
}
export class JsonLineTransport implements Transport {
  onclose?: () => void
  onerror?: (error: Error) => void
  onmessage?: Transport['onmessage']
  private closed = false
  private reading: Promise<void> | undefined
  constructor(private streams: JsonLineStreams) {}
  async start() {
    if (this.reading) throw new Error('Transport already started')
    this.reading = this.read()
      .catch((error) => this.onerror?.(error instanceof Error ? error : new Error(String(error))))
      .finally(() => this.close())
      .catch((error) => this.onerror?.(error instanceof Error ? error : new Error(String(error))))
    void (async () => {
      for await (const _chunk of this.streams.diagnostics ?? []) {
      }
    })().catch((error) => {
      this.onerror?.(error)
      void this.close().catch((failure) => this.onerror?.(failure))
    })
  }
  private async read() {
    const decoder = new StringDecoder('utf8')
    let buffer = ''
    for await (const chunk of this.streams.input) {
      buffer += decoder.write(Buffer.from(chunk))
      let end = buffer.indexOf('\n')
      while (end >= 0) {
        const line = buffer.slice(0, end)
        buffer = buffer.slice(end + 1)
        if (Buffer.byteLength(line) > 1_000_000) throw new Error('MCP frame exceeds limit')
        if (line.trim()) this.onmessage?.(JSONRPCMessageSchema.parse(JSON.parse(line)))
        end = buffer.indexOf('\n')
      }
      if (Buffer.byteLength(buffer) > 1_000_000) throw new Error('MCP frame exceeds limit')
    }
    buffer += decoder.end()
    if (buffer.trim()) throw new Error('Incomplete MCP frame')
  }
  async send(message: JSONRPCMessage) {
    if (this.closed) throw new Error('MCP connection closed')
    const frame = JSON.stringify(message)
    if (Buffer.byteLength(frame) > 1_000_000) throw new Error('MCP frame exceeds limit')
    await this.streams.write(`${frame}\n`)
  }
  async close() {
    if (this.closed) return
    this.closed = true
    try {
      await this.streams.close()
    } finally {
      this.onclose?.()
    }
  }
}
export class ManagedStdioTransport extends JsonLineTransport {
  constructor(process: ManagedProcess) {
    super({
      input: process.stdout,
      diagnostics: process.stderr,
      write: (data) => process.send(data),
      close: () => process.close(),
    })
  }
}
