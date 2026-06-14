import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { createEmptyProject } from '#core'
import { useProjectStore } from '../../state/projectStore'

// bun:test NÃO isola module mocks por arquivo — captura os exports reais ANTES
// de mockar e restaura no afterAll (ver BottomPanel.test.tsx / CLAUDE.md).
const realWcClient = { ...(await import('./webContainerClient')) }
const realXterm = { ...(await import('@xterm/xterm')) }
const realFit = { ...(await import('@xterm/addon-fit')) }

let resetCalls = 0

// ResizeObserver não existe no happy-dom; stub mínimo.
if (!(globalThis as Record<string, unknown>).ResizeObserver) {
  ;(globalThis as Record<string, unknown>).ResizeObserver = class {
    observe(): void {}
    disconnect(): void {}
  }
}

function makeShell() {
  return {
    output: new ReadableStream<string>({ start() {} }),
    // O shell real expõe `input.getWriter()`; o WritableStream do happy-dom não
    // implementa getWriter, então damos um writer-stub direto.
    input: { getWriter: () => ({ write() {}, releaseLock() {} }) },
    kill() {},
    resize() {},
  }
}

// WebContainer falso: spawn devolve um shell-stub; mount/fs não-op.
const fakeWebContainer = {
  spawn: async () => makeShell(),
  mount: async () => undefined,
  fs: { writeFile: async () => undefined, rm: async () => undefined },
}

mock.module('./webContainerClient', () => ({
  getWebContainer: async () => fakeWebContainer,
  resetWebContainerFs: async () => {
    resetCalls += 1
  },
}))

// XTerm/FitAddon falsos só com a superfície usada pelo componente.
mock.module('@xterm/xterm', () => ({
  Terminal: class {
    cols = 80
    rows = 24
    loadAddon(): void {}
    open(): void {}
    onData() {
      return { dispose() {} }
    }
    write(): void {}
    writeln(): void {}
    dispose(): void {}
  },
}))
mock.module('@xterm/addon-fit', () => ({
  FitAddon: class {
    fit(): void {}
  },
}))

afterAll(() => {
  mock.module('./webContainerClient', () => realWcClient)
  mock.module('@xterm/xterm', () => realXterm)
  mock.module('@xterm/addon-fit', () => realFit)
})

// Importa DEPOIS dos mocks.
const { Terminal } = await import('./Terminal')

function setClassicProject(): void {
  useProjectStore.setState({
    project: createEmptyProject('p1', 'Projeto'),
    isDirty: false,
    saveError: null,
  })
}

describe('Terminal single-owner do FS clássico (#9)', () => {
  beforeEach(() => {
    resetCalls = 0
    setClassicProject()
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('a segunda instância clássica recusa em vez de clobberar o FS da primeira', async () => {
    const a = render(<Terminal />)
    fireEvent.click(a.getByText('Carregar terminal real'))
    // Primeira instância vira dona e monta o FS (reset chamado 1x).
    await waitFor(() => expect(a.getByText('Reiniciar')).toBeTruthy())
    expect(resetCalls).toBe(1)

    // Segunda instância clássica na MESMA aba: deve recusar.
    const b = render(<Terminal />)
    fireEvent.click(b.getByText('Carregar terminal real'))
    await waitFor(() => expect(b.getByText(/já está em uso em outra instância/i)).toBeTruthy())
    // Nenhum reset/mount adicional — o FS da primeira instância ficou intacto.
    expect(resetCalls).toBe(1)

    // Ao desmontar a primeira (libera o token), a segunda consegue carregar.
    a.unmount()
    fireEvent.click(b.getByText('Tentar novamente'))
    await waitFor(() => expect(b.getByText('Reiniciar')).toBeTruthy())
    expect(resetCalls).toBe(2)
  })
})
