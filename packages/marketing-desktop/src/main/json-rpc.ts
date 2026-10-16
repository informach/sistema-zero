import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { EventEmitter } from 'node:events'

type Pending = {
  method: string
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: ReturnType<typeof setTimeout>
}
export type RpcEvent = { method: string; params?: Record<string, unknown> }

export class JsonRpcClient extends EventEmitter {
  private sequence = 0
  private buffer = ''
  private pending = new Map<number, Pending>()
  private closed = false

  constructor(private child: ChildProcessWithoutNullStreams) {
    super()
    child.stdout.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => this.read(chunk))
    child.stderr.resume()
    child.stdin.on('error', () =>
      this.closeWithError(new Error('O canal com o Codex foi encerrado.')),
    )
    child.on('error', () => this.closeWithError(new Error('Falha ao iniciar o Codex.')))
    child.on('close', () => this.closeWithError(new Error('A conexão com o Codex foi encerrada.')))
  }

  private read(chunk: string) {
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
        const message = JSON.parse(line) as Record<string, unknown>
        if (typeof message.method === 'string') {
          if (message.id !== undefined) {
            // L0 never grants native command/file/tool approval through an unattended request.
            this.send({
              id: message.id,
              error: {
                code: -32601,
                message: 'Interactive tool approval unavailable in this local proof.',
              },
            })
          } else this.emit('notification', message as RpcEvent)
        } else if (typeof message.id === 'number') {
          const pending = this.pending.get(message.id)
          if (pending) {
            this.pending.delete(message.id)
            clearTimeout(pending.timer)
            if (message.error) {
              const error = message.error as { code?: number; message?: string }
              const detail = String(error.message ?? 'Operação recusada.')
                .replace(/(?:Bearer\s+\S+|sk-[\w-]+|eyJ[\w.-]+)/g, '[credencial omitida]')
                .slice(0, 800)
              pending.reject(
                new Error(`Codex ${pending.method} (${error.code ?? 'erro'}): ${detail}`),
              )
            } else pending.resolve(message.result)
          }
        }
      } catch {
        this.closeWithError(new Error('O cliente retornou uma mensagem inválida.'))
        return
      }
      newline = this.buffer.indexOf('\n')
    }
  }

  private send(message: unknown) {
    if (this.closed) throw new Error('Cliente encerrado.')
    this.child.stdin.write(`${JSON.stringify(message)}\n`)
  }

  request<T>(method: string, params: unknown, timeoutMs = 30000): Promise<T> {
    if (this.closed) return Promise.reject(new Error('Cliente encerrado.'))
    const id = ++this.sequence
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.closeWithError(new Error(`O cliente não respondeu a ${method} no prazo.`))
      }, timeoutMs)
      this.pending.set(id, { method, resolve: (value) => resolve(value as T), reject, timer })
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
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.pending.clear()
    this.child.kill()
    this.emit('closed', error)
  }
}
