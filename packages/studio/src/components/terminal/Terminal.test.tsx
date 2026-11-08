import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react'
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

// O que os "Comandos úteis" mandaram ao shell.
const written: string[] = []
let focused = 0

function makeShell() {
  return {
    output: new ReadableStream<string>({ start() {} }),
    // O shell real expõe `input.getWriter()`; o WritableStream do happy-dom não
    // implementa getWriter, então damos um writer-stub direto.
    input: {
      getWriter: () => ({
        write(data: string) {
          written.push(data)
          return Promise.resolve()
        },
        releaseLock() {},
      }),
    },
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

// Controla o precheck de cross-origin isolation por teste: por default deixamos
// bootar (caminho feliz); o teste de "indisponível" flipa para false.
let canBoot = true

mock.module('./webContainerClient', () => ({
  canBootWebContainer: () => canBoot,
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
    focus(): void {
      focused += 1
    }
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
    canBoot = true
    setClassicProject()
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('a segunda instância clássica recusa em vez de clobberar o FS da primeira', async () => {
    const a = render(<Terminal />)
    fireEvent.click(a.getByText('Abrir o terminal'))
    // Primeira instância vira dona e monta o FS (reset chamado 1x).
    await waitFor(() => expect(a.getByText('Travou? Reiniciar terminal')).toBeTruthy())
    expect(resetCalls).toBe(1)

    // Segunda instância clássica na MESMA aba: deve recusar.
    const b = render(<Terminal />)
    fireEvent.click(b.getByText('Abrir o terminal'))
    await waitFor(() => expect(b.getByText(/já está em uso em outra instância/i)).toBeTruthy())
    // Nenhum reset/mount adicional — o FS da primeira instância ficou intacto.
    expect(resetCalls).toBe(1)

    // Ao desmontar a primeira (libera o token), a segunda consegue carregar.
    a.unmount()
    fireEvent.click(b.getByText('Tentar novamente'))
    await waitFor(() => expect(b.getByText('Travou? Reiniciar terminal')).toBeTruthy())
    expect(resetCalls).toBe(2)
  })

  it('"Comandos úteis": cada botão escreve no shell; o npm install só digita, o Parar manda Ctrl+C', async () => {
    written.length = 0
    focused = 0
    const a = render(<Terminal />)
    // Antes de abrir não há faixa (o shell ainda não existe).
    expect(a.queryByRole('toolbar', { name: 'Comandos úteis' })).toBeNull()
    fireEvent.click(a.getByText('Abrir o terminal'))
    const strip = await a.findByRole('toolbar', { name: 'Comandos úteis' })
    const click = (name: string) => fireEvent.click(within(strip).getByRole('button', { name }))
    click('Ver os arquivos')
    click('Instalar uma biblioteca')
    click('Parar o que está rodando')
    expect(written).toEqual(['ls\r', 'npm install ', '\u0003'])
    expect(focused).toBe(3)
    // O comando de verdade fica no `title`, e o "Travou?" mora na faixa.
    expect(within(strip).getByRole('button', { name: 'Ver os arquivos' }).title).toBe('ls')
    expect(within(strip).getByRole('button', { name: 'Travou? Reiniciar terminal' })).toBeTruthy()
    // Nada de npm run dev: a prévia já roda o servidor.
    expect(strip.textContent).not.toContain('npm run dev')
  })
})

describe('Terminal precheck de cross-origin isolation', () => {
  beforeEach(() => {
    resetCalls = 0
    canBoot = true
    setClassicProject()
  })

  afterEach(() => {
    cleanup()
    useProjectStore.setState({ project: null, isDirty: false, saveError: null })
  })

  it('sem isolamento: mostra "indisponível" SEM bootar nem oferecer retry', async () => {
    canBoot = false
    const a = render(<Terminal />)
    fireEvent.click(a.getByText('Abrir o terminal'))
    await waitFor(() => expect(a.getByText(/não está disponível aqui ainda/i)).toBeTruthy())
    // Curto-circuitou ANTES do reset/mount do FS — nada foi tocado.
    expect(resetCalls).toBe(0)
    // Sem "Tentar novamente": recarregar é o único remédio.
    expect(a.queryByText('Tentar novamente')).toBeNull()
  })
})
