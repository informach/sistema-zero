import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { EventEmitter } from 'node:events'
import { z } from 'zod'

type Pending = {
  method: string
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}
export type RpcEvent = { method: string; params?: unknown }
const rpcIdSchema = z.union([z.string(), z.number().int()])
const rpcErrorSchema = z.object({ code: z.number().int(), message: z.string() })
function parseMessage(value: unknown) {
  const message = z.record(z.string(), z.unknown()).parse(value)
  if (typeof message.method === 'string') {
    if ('result' in message || 'error' in message) throw new Error('Envelope RPC ambíguo')
    const event: RpcEvent = {
      method: message.method,
      ...('params' in message ? { params: message.params } : {}),
    }
    return 'id' in message
      ? { kind: 'request' as const, id: rpcIdSchema.parse(message.id), event }
      : { kind: 'notification' as const, event }
  }
  const id = rpcIdSchema.parse(message.id)
  if ('method' in message || 'result' in message === 'error' in message)
    throw new Error('Envelope RPC inválido')
  return 'error' in message
    ? { kind: 'error' as const, id, error: rpcErrorSchema.parse(message.error) }
    : { kind: 'result' as const, id, result: message.result }
}

export class JsonRpcClient extends EventEmitter {
  private sequence = 0
  private buffer = ''
  private pending = new Map<number, Pending>()
  private closed = false

  constructor(private child: ChildProcessWithoutNullStreams) {
    super()
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => this.read(chunk))
    child.stdout.on('error', () =>
      this.closeWithError(new Error('O canal de saída do Codex foi encerrado.')),
    )
    child.stderr.on('error', () =>
      this.closeWithError(new Error('O canal de diagnóstico do Codex foi encerrado.')),
    )
    child.stderr.resume()
    child.stdin.on('error', () =>
      this.closeWithError(new Error('O canal com o Codex foi encerrado.')),
    )
    child.on('error', () => this.closeWithError(new Error('Falha ao iniciar o Codex.')))
    child.on('close', () => this.closeWithError(new Error('A conexão com o Codex foi encerrada.')))
  }

  private read(chunk: string) {
    if (this.closed) return
    this.buffer += chunk
    if (this.buffer.length > 32_000_000) {
      this.closeWithError(new Error('Resposta do cliente excedeu o limite.'))
      return
    }
    let newline = this.buffer.indexOf('\n')
    while (newline >= 0) {
      const line = this.buffer.slice(0, newline)
      this.buffer = this.buffer.slice(newline + 1)
      try {
        const message = parseMessage(JSON.parse(line))
        if (message.kind === 'request' || message.kind === 'notification') {
          if (message.kind === 'request') {
            // Unattended protocol requests never grant native command/file/tool approval.
            this.send({
              id: message.id,
              error: {
                code: -32601,
                message: 'Interactive tool approval is unavailable in this execution.',
              },
            })
          } else this.emit('notification', message.event)
        } else if (typeof message.id === 'number') {
          const pending = this.pending.get(message.id)
          if (pending) {
            this.pending.delete(message.id)
            clearTimeout(pending.timer)
            if (message.kind === 'error') {
              const error = message.error
              const detail = error.message
                .replace(/(?:Bearer\s+\S+|sk-[\w-]+|eyJ[\w.-]+)/g, '[credencial omitida]')
                .slice(0, 800)
              pending.reject(new Error(`Codex ${pending.method} (${error.code}): ${detail}`))
            } else pending.resolve(message.result)
          }
        }
      } catch {
        this.closeWithError(new Error('O cliente retornou uma mensagem inválida.'))
        return
      }
      if (this.closed) return
      newline = this.buffer.indexOf('\n')
    }
  }

  private send(message: unknown) {
    if (this.closed) throw new Error('Cliente encerrado.')
    this.child.stdin.write(`${JSON.stringify(message)}\n`)
  }

  request(method: string, params: unknown, timeoutMs = 30000): Promise<unknown> {
    if (this.closed) return Promise.reject(new Error('Cliente encerrado.'))
    const id = ++this.sequence
    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.closeWithError(new Error(`O cliente não respondeu a ${method} no prazo.`))
      }, timeoutMs)
      this.pending.set(id, { method, resolve, reject, timer })
      try {
        this.send({ id, method, params })
      } catch {
        this.closeWithError(new Error('Não foi possível enviar o pedido ao Codex.'))
      }
    })
  }

  notify(method: string, params: unknown = {}) {
    this.send({ method, params })
  }

  close() {
    this.closeWithError(new Error('Cliente encerrado.'))
  }

  private closeWithError(error: Error) {
    if (this.closed) return
    this.closed = true
    this.buffer = ''
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.pending.clear()
    this.child.kill()
    this.emit('closed', error)
  }
}
