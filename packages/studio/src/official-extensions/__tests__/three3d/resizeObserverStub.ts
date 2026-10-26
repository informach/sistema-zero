/**
 * Dublê do `ResizeObserver` para os runtimes 3D: o orçamento de desenho
 * (`threeRenderBudgetRuntime.ts`) reajusta a resolução por UM caminho só, o observador do
 * canvas. O do happy-dom não entrega nada para um canvas de mentira, então o teste troca o
 * global, conta quem foi observado e dispara a entrega à mão.
 *
 * `install({ absent: true })` tira o global (o caminho de reserva, o resize da janela).
 */
export interface ResizeObserverStub {
  instances: number
  observed: unknown[]
  disconnects: number
  fire(): void
  restore(): void
}

export function installResizeObserverStub(opts: { absent?: boolean } = {}): ResizeObserverStub {
  const g = globalThis as unknown as Record<string, unknown>
  const had = Object.hasOwn(g, 'ResizeObserver')
  const original = g.ResizeObserver
  const callbacks: (() => void)[] = []
  const stub: ResizeObserverStub = {
    instances: 0,
    observed: [],
    disconnects: 0,
    fire() {
      for (const cb of callbacks.slice()) cb()
    },
    restore() {
      if (had) g.ResizeObserver = original
      else delete g.ResizeObserver
    },
  }
  if (opts.absent) {
    delete g.ResizeObserver
    return stub
  }
  g.ResizeObserver = class {
    constructor(cb: () => void) {
      stub.instances += 1
      callbacks.push(cb)
    }
    observe(target: unknown) {
      stub.observed.push(target)
    }
    disconnect() {
      stub.disconnects += 1
    }
  }
  return stub
}
