import { afterAll, afterEach, beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import type { DisposableMonacoModel, MonacoModelRegistry } from '../modelPaths'

// bun:test NÃO isola module mocks por arquivo: captura os exports reais ANTES de
// mockar e restaura no afterAll — sem isso o stub do Editor vazaria para os
// próximos arquivos da suíte.
const realEditorReact = { ...(await import('@monaco-editor/react')) }
// `../workers` fica mockado SEM restore (como os mocks de idb-keyval): o módulo
// real importa `monaco-editor/esm/...` estático (editor.api + contribuições de
// linguagem, que registram serviços/emitters e tocam globais do DOM),
// pesado/instável no happy-dom — e nenhum outro arquivo da suíte importa
// `../workers`, então o stub não vaza para ninguém.

// ----------------------------------------------------------------------------
// Mundo Monaco falso: um registro GLOBAL de models por `path` (espelha o
// registro real `monaco.editor` que sobrevive ao desmonte). O <Editor> mockado
// cria/reusa o model do seu `path` atual e expõe um editor mínimo que o
// MonacoTabs consome (getModel/onDidChangeCursorPosition/onDidChangeModel/…).
// ----------------------------------------------------------------------------

interface FakeModel extends DisposableMonacoModel {
  disposed: boolean
  getLineCount: () => number
  getLineMaxColumn: (line: number) => number
}

type CursorListener = (e: {
  position: { lineNumber: number; column: number }
  source?: string
  reason?: number
}) => void
type ModelListener = () => void

const fakeModels = new Map<string, FakeModel>()

function makeModel(path: string): FakeModel {
  const model: FakeModel = {
    disposed: false,
    uri: { path, toString: () => path },
    // Stubs largos para `toMonacoRange` não clampar nas faixas dos testes.
    getLineCount: () => 1000,
    getLineMaxColumn: () => 200,
    dispose() {
      model.disposed = true
      fakeModels.delete(path)
    },
  }
  return model
}

function getOrCreateModel(path: string): FakeModel {
  const existing = fakeModels.get(path)
  if (existing) return existing
  const model = makeModel(path)
  fakeModels.set(path, model)
  return model
}

const fakeRegistry: MonacoModelRegistry = {
  getModels: () => Array.from(fakeModels.values()),
}

// Ação de formatação falsa, controlada por teste (o handleFormat consome
// isSupported/run). `currentFormatAction = null` reproduz "ação inexistente".
interface FakeAction {
  isSupported: () => boolean
  run: () => Promise<void>
}
let currentFormatAction: FakeAction | null = null
// Trilha de chamadas do fluxo de formatação ('services' | 'getAction:<id>' |
// 'run') — os testes asseveram a ORDEM (services antes de getAction antes de run).
const formatCallLog: string[] = []
// Implementação trocável do mock de loadLanguageServices (default: resolve).
let loadLanguageServicesImpl: () => Promise<void> = async () => {}

// View states falsos: saveViewState devolve um token com o path do model
// corrente; restoreViewState registra o que foi aplicado e sobre qual model.
interface FakeViewState {
  forPath: string
}
const restoreViewStateCalls: Array<{ applied: string; on: string }> = []

// Editor único exposto pelo <Editor> mockado, capturado para dirigir eventos
// (cursor / troca de model) a partir do teste.
interface FakeEditor {
  getModel: () => FakeModel | null
  setModelPath: (path: string) => void
  emitCursor: (line: number, column: number, source?: string, reason?: number) => void
  onDidChangeCursorPosition: (cb: CursorListener) => { dispose: () => void }
  onDidChangeModel: (cb: ModelListener) => { dispose: () => void }
  createDecorationsCollection: () => { set: () => void; clear: () => void }
  revealRangeInCenterIfOutsideViewport: () => void
  setSelection: (range: { startLineNumber: number; endLineNumber: number }) => void
  getAction: (id: string) => FakeAction | null
  saveViewState: () => FakeViewState
  restoreViewState: (state: FakeViewState) => void
}

let currentEditor: FakeEditor | null = null
// Faixas passadas a editor.setSelection — para asserir a SELEÇÃO do realce.
const selectionCalls: Array<{ startLineNumber: number; endLineNumber: number }> = []

function makeEditor(initialPath: string): FakeEditor {
  let modelPath = initialPath
  const cursorListeners = new Set<CursorListener>()
  const modelListeners = new Set<ModelListener>()
  const editor: FakeEditor = {
    getModel: () => fakeModels.get(modelPath) ?? null,
    setModelPath(path: string) {
      modelPath = path
      getOrCreateModel(path)
      for (const cb of modelListeners) cb()
    },
    emitCursor(line: number, column: number, source?: string, reason?: number) {
      for (const cb of cursorListeners)
        cb({ position: { lineNumber: line, column }, source, reason })
    },
    onDidChangeCursorPosition(cb) {
      cursorListeners.add(cb)
      return { dispose: () => cursorListeners.delete(cb) }
    },
    onDidChangeModel(cb) {
      modelListeners.add(cb)
      return { dispose: () => modelListeners.delete(cb) }
    },
    createDecorationsCollection: () => ({ set: () => {}, clear: () => {} }),
    revealRangeInCenterIfOutsideViewport: () => {},
    setSelection: (range) => {
      selectionCalls.push({
        startLineNumber: range.startLineNumber,
        endLineNumber: range.endLineNumber,
      })
    },
    getAction: (id: string) => {
      formatCallLog.push(`getAction:${id}`)
      return currentFormatAction
    },
    saveViewState: () => ({ forPath: modelPath }),
    restoreViewState: (state: FakeViewState) => {
      restoreViewStateCalls.push({ applied: state.forPath, on: modelPath })
    },
  }
  return editor
}

// <Editor> mockado: garante o model do seu `path` no registro, monta o editor
// falso e chama `onMount`. Em rerenders com `path` diferente, troca o model do
// editor (espelha o `restoreViewState`/troca de aba do @monaco-editor/react).
function EditorMock(props: {
  path: string
  onMount?: (editor: FakeEditor) => void
}): React.JSX.Element {
  const { path, onMount } = props
  const mountedRef = useRef(false)
  getOrCreateModel(path)
  // biome-ignore lint/correctness/useExhaustiveDependencies: onMount é estável (useCallback no MonacoTabs); monta uma vez e só troca o model por path
  useEffect(() => {
    if (mountedRef.current) {
      currentEditor?.setModelPath(path)
      return
    }
    mountedRef.current = true
    const editor = makeEditor(path)
    currentEditor = editor
    onMount?.(editor)
  }, [path])
  return <div data-testid="editor" data-path={path} />
}

mock.module('@monaco-editor/react', () => ({
  __esModule: true,
  default: EditorMock,
  loader: { config: () => {} },
}))

// `getMonacoModelRegistry` devolve o registro FALSO (é o que o reconcile do
// MonacoTabs varre); os demais viram no-ops para não puxar o `monaco-editor/esm`
// pesado. O MonacoTabs usa só estes exports de `../workers` (o `prewarmEditorModels`
// e o `warmupMonacoLanguageServices` pré-carregam linguagem/models no app real; no
// teste são no-op — o <Editor> mockado já cria o model pelo `path`).
mock.module('../workers', () => ({
  configureMonacoWorkers: () => {},
  getMonacoModelRegistry: () => fakeRegistry,
  warmupMonacoLanguageServices: async () => {},
  loadLanguageServices: () => loadLanguageServicesImpl(),
  prewarmEditorModels: () => {},
  monacoThemeName: (theme: string) => (theme === 'light' ? 'sz-monaco-light' : 'sz-monaco-dark'),
}))

afterAll(() => {
  mock.module('@monaco-editor/react', () => realEditorReact)
})

// Import DEPOIS dos mocks: o módulo chama configureMonacoWorkers() no topo e
// importa o <Editor>.
const { MonacoTabs, setFormatWaitForTests } = await import('../MonacoTabs')

// Sem fake timers na suíte (regra 6): encurta o poll do Formatar p/ os testes
// (intervalo, teto do provider, teto do run — as actions fake resolvem na hora,
// então o teto de 40ms só morde no teste do run pendurado).
setFormatWaitForTests(1, 30, 40)

function resetWorld(): void {
  fakeModels.clear()
  currentEditor = null
  selectionCalls.length = 0
  currentFormatAction = null
  formatCallLog.length = 0
  restoreViewStateCalls.length = 0
  loadLanguageServicesImpl = async () => {}
}

describe('MonacoTabs — ciclo de vida dos models', () => {
  beforeEach(resetWorld)

  afterEach(() => {
    cleanup()
    resetWorld()
  })

  it('#11 descarta o model de uma aba ao fechá-la, preservando o model ativo', () => {
    const files = [
      { name: 'index.html', value: '<html></html>' },
      { name: 'style.css', value: 'body{}' },
      { name: 'script.js', value: 'const a = 1' },
    ]
    const prefix = 'proj-1'

    const { rerender } = render(
      <MonacoTabs
        files={files}
        activeFile="index.html"
        onChange={() => {}}
        modelPathPrefix={prefix}
      />,
    )

    // O editor abre na aba ativa (index.html). O <Editor> mockado só materializa
    // o model do `path` corrente, então abrimos as outras abas para registrar
    // seus models (como o aluno faria ao navegar entre arquivos).
    rerender(
      <MonacoTabs
        files={files}
        activeFile="style.css"
        onChange={() => {}}
        modelPathPrefix={prefix}
      />,
    )
    rerender(
      <MonacoTabs
        files={files}
        activeFile="script.js"
        onChange={() => {}}
        modelPathPrefix={prefix}
      />,
    )
    // Volta para index.html (aba ativa quando fecharmos style.css).
    rerender(
      <MonacoTabs
        files={files}
        activeFile="index.html"
        onChange={() => {}}
        modelPathPrefix={prefix}
      />,
    )

    // Captura o model de style.css ANTES de fechar a aba.
    const styleModel = Array.from(fakeModels.values()).find((m) =>
      m.uri.path.endsWith('/style.css'),
    )
    const activeModel = currentEditor?.getModel() ?? null
    expect(styleModel).toBeDefined()
    expect(activeModel?.uri.path.endsWith('/index.html')).toBe(true)

    // Fecha style.css: sai de `files`. O reconcile deve descartar SÓ esse model.
    const remaining = files.filter((f) => f.name !== 'style.css')
    rerender(
      <MonacoTabs
        files={remaining}
        activeFile="index.html"
        onChange={() => {}}
        modelPathPrefix={prefix}
      />,
    )

    expect(styleModel?.disposed).toBe(true)
    // O model ativo (index.html) e o script.js, ainda abertos, sobrevivem.
    expect(activeModel?.disposed).toBe(false)
    const scriptModel = Array.from(fakeModels.values()).find((m) =>
      m.uri.path.endsWith('/script.js'),
    )
    expect(scriptModel).toBeDefined()
  })

  it('#11 o reconcile nunca deixa o editor com um model descartado', () => {
    // Cenário-limite: o arquivo ATIVO some de `files`. O MonacoTabs cai no
    // fallback (files[0] = b.js), então o model de a.js — agora fora de files e
    // NÃO mais exibido — é descartado (limpeza correta, não é vazamento). O que
    // o invariante #11 garante é que o model que o editor passa a EXIBIR nunca
    // fica descartado (o guard pula `editor.getModel()`).
    const files = [
      { name: 'a.js', value: '1' },
      { name: 'b.js', value: '2' },
    ]
    const prefix = 'proj-edge'

    const { rerender } = render(
      <MonacoTabs files={files} activeFile="a.js" onChange={() => {}} modelPathPrefix={prefix} />,
    )
    expect(currentEditor?.getModel()?.uri.path.endsWith('/a.js')).toBe(true)

    // a.js (arquivo ativo) sai de files.
    rerender(
      <MonacoTabs
        files={[{ name: 'b.js', value: '2' }]}
        activeFile="a.js"
        onChange={() => {}}
        modelPathPrefix={prefix}
      />,
    )

    // O editor caiu no fallback e exibe um model VIVO (nunca descartado).
    const shown = currentEditor?.getModel() ?? null
    expect(shown).not.toBeNull()
    expect(shown?.disposed).toBe(false)
    expect(shown?.uri.path.endsWith('/b.js')).toBe(true)
  })
})

describe('MonacoTabs — nome do arquivo no cursor', () => {
  beforeEach(resetWorld)

  afterEach(() => {
    cleanup()
    resetWorld()
  })

  it('#23 marca o evento de cursor com o arquivo do model ATUAL, não o anterior', () => {
    const files = [
      { name: 'index.html', value: '<html></html>' },
      { name: 'script.js', value: 'const a = 1' },
    ]
    const prefix = 'proj-cursor'
    const events: string[] = []

    render(
      <MonacoTabs
        files={files}
        activeFile="index.html"
        onChange={() => {}}
        onCursorChange={(pos) => events.push(pos.file)}
        modelPathPrefix={prefix}
      />,
    )

    expect(currentEditor).not.toBeNull()
    const editor = currentEditor as NonNullable<typeof currentEditor>

    // Cursor na aba inicial: deve reportar index.html.
    editor.emitCursor(1, 1)
    expect(events.at(-1)).toBe('index.html')

    // Caminho do model de script.js sob o MESMO prefixo salgado (deriva do path
    // de index.html trocando só o arquivo, robusto ao sal do useId).
    const indexPath = editor.getModel()?.uri.path as string
    expect(indexPath.endsWith('/index.html')).toBe(true)
    const scriptPath = indexPath.replace(/\/index\.html$/, '/script.js')

    // Troca o model do editor para script.js — como o restoreViewState faz ao
    // revisitar a aba — e dispara um cursor com source 'api' (NÃO 'model'). O
    // ref de nome atrasaria aqui; derivar do model corrente acerta o arquivo.
    editor.setModelPath(scriptPath)
    editor.emitCursor(2, 3, 'api')

    expect(events.at(-1)).toBe('script.js')
  })

  it('marca `explicit` só quando o reason é Explicit (clique/navegação, não digitação)', () => {
    const files = [{ name: 'index.html', value: '<html></html>' }]
    const events: boolean[] = []

    render(
      <MonacoTabs
        files={files}
        activeFile="index.html"
        onChange={() => {}}
        onCursorChange={(pos) => events.push(pos.explicit)}
        modelPathPrefix="proj-explicit"
      />,
    )

    const editor = currentEditor as NonNullable<typeof currentEditor>
    // Clique/navegação: CursorChangeReason.Explicit = 3.
    editor.emitCursor(1, 1, 'mouse', 3)
    // Digitação: reason NotSet (0)/ausente.
    editor.emitCursor(1, 2, 'keyboard')

    expect(events).toEqual([true, false])
  })

  it('#23 ignora cursor quando o model do editor está fora do prefixo da instância', () => {
    const files = [{ name: 'index.html', value: '<html></html>' }]
    const events: string[] = []

    render(
      <MonacoTabs
        files={files}
        activeFile="index.html"
        onChange={() => {}}
        onCursorChange={(pos) => events.push(pos.file)}
        modelPathPrefix="proj-iso"
      />,
    )

    const editor = currentEditor as NonNullable<typeof currentEditor>
    // Aponta o editor para um model de OUTRA instância (prefixo diferente).
    editor.setModelPath('proj-outra::r9/index.html')
    editor.emitCursor(1, 1, 'api')

    // Sem prefixo casando, não emite (evita marcar o arquivo errado).
    expect(events.length).toBe(0)
  })
})

describe('MonacoTabs — aba ativa no modo não-controlado', () => {
  beforeEach(resetWorld)

  afterEach(() => {
    cleanup()
    resetWorld()
  })

  // Localiza a aba ativa pela classe de realce (border-sz-accent fica no wrapper
  // da aba ativa; transparente nas demais). Devolve o nome do arquivo dela.
  function activeTabName(): string | null {
    for (const button of screen.getAllByRole('button')) {
      const wrapper = button.parentElement
      if (!wrapper) continue
      if (wrapper.className.includes('border-sz-accent')) {
        // O primeiro botão do wrapper é o nome do arquivo (o "×" é o segundo).
        return wrapper.querySelector('button')?.textContent ?? null
      }
    }
    return null
  }

  it('move a aba ativa para o fallback quando o arquivo ativo é removido', () => {
    const closable = () => true
    const files = [
      { name: 'a.js', value: '1' },
      { name: 'b.js', value: '2' },
      { name: 'c.js', value: '3' },
    ]
    const prefix = 'proj-uncontrolled'

    // Sem `activeFile` => modo não-controlado. Abre em a.js (files[0]).
    const { rerender } = render(
      <MonacoTabs
        files={files}
        onChange={() => {}}
        canCloseFile={closable}
        modelPathPrefix={prefix}
      />,
    )
    expect(activeTabName()).toBe('a.js')

    // O aluno clica em b.js: vira a aba ativa não-controlada.
    fireEvent.click(screen.getByText('b.js'))
    expect(activeTabName()).toBe('b.js')
    expect(currentEditor?.getModel()?.uri.path.endsWith('/b.js')).toBe(true)

    // b.js (aba ativa) é fechado: sai de `files`. A fila de abas e o editor devem
    // concordar no fallback (files[0] = a.js) — sem aba ativa órfã.
    const remaining = files.filter((f) => f.name !== 'b.js')
    rerender(
      <MonacoTabs
        files={remaining}
        onChange={() => {}}
        canCloseFile={closable}
        modelPathPrefix={prefix}
      />,
    )

    expect(activeTabName()).toBe('a.js')
    expect(currentEditor?.getModel()?.uri.path.endsWith('/a.js')).toBe(true)
  })

  it('não reativa por engano um arquivo removido que reaparece em files', () => {
    const closable = () => true
    const files = [
      { name: 'a.js', value: '1' },
      { name: 'b.js', value: '2' },
    ]
    const prefix = 'proj-reappear'

    const { rerender } = render(
      <MonacoTabs
        files={files}
        onChange={() => {}}
        canCloseFile={closable}
        modelPathPrefix={prefix}
      />,
    )

    // Ativa b.js, depois o remove: internalActive deve reconciliar para a.js.
    fireEvent.click(screen.getByText('b.js'))
    expect(activeTabName()).toBe('b.js')

    rerender(
      <MonacoTabs
        files={[{ name: 'a.js', value: '1' }]}
        onChange={() => {}}
        canCloseFile={closable}
        modelPathPrefix={prefix}
      />,
    )
    expect(activeTabName()).toBe('a.js')

    // b.js reaparece (ex.: pai reabre a aba): NÃO deve reativar sozinho — a.js
    // continua ativa porque internalActive foi reconciliado, não ficou preso.
    rerender(
      <MonacoTabs
        files={[
          { name: 'a.js', value: '1' },
          { name: 'b.js', value: '2' },
        ]}
        onChange={() => {}}
        canCloseFile={closable}
        modelPathPrefix={prefix}
      />,
    )
    expect(activeTabName()).toBe('a.js')
  })
})

describe('MonacoTabs — seleção do realce (bloco→código)', () => {
  beforeEach(resetWorld)
  afterEach(() => {
    cleanup()
    resetWorld()
  })

  const files = [
    { name: 'index.html', value: '<html></html>' },
    { name: 'style.css', value: 'body{}' },
    { name: 'script.js', value: 'const a = 1' },
  ]

  it('seleciona DE FATO a faixa do bloco ao receber um realce novo', () => {
    render(
      <MonacoTabs
        files={files}
        onChange={() => {}}
        modelPathPrefix="proj-sel"
        highlight={{ file: 'index.html', startLine: 7, endLine: 8, nonce: 1 }}
      />,
    )
    expect(selectionCalls).toEqual([{ startLineNumber: 7, endLineNumber: 8 }])
  })

  it('NÃO re-seleciona quando o realce muda mas o nonce é o mesmo (digitação)', () => {
    const { rerender } = render(
      <MonacoTabs
        files={files}
        onChange={() => {}}
        modelPathPrefix="proj-sel"
        highlight={{ file: 'index.html', startLine: 7, endLine: 8, nonce: 1 }}
      />,
    )
    expect(selectionCalls).toHaveLength(1)

    // Reparse durante a edição: novo objeto de highlight (linhas deslocadas),
    // MESMO nonce → o cursor do aluno NÃO pode ser roubado.
    rerender(
      <MonacoTabs
        files={files}
        onChange={() => {}}
        modelPathPrefix="proj-sel"
        highlight={{ file: 'index.html', startLine: 9, endLine: 9, nonce: 1 }}
      />,
    )
    expect(selectionCalls).toHaveLength(1)

    // Novo clique de bloco (nonce diferente) → seleciona de novo.
    rerender(
      <MonacoTabs
        files={files}
        onChange={() => {}}
        modelPathPrefix="proj-sel"
        highlight={{ file: 'index.html', startLine: 9, endLine: 9, nonce: 2 }}
      />,
    )
    expect(selectionCalls).toHaveLength(2)
    expect(selectionCalls[1]).toEqual({ startLineNumber: 9, endLineNumber: 9 })
  })
})

describe('MonacoTabs — view state por aba', () => {
  beforeEach(resetWorld)
  afterEach(() => {
    cleanup()
    resetWorld()
  })

  it('restaura cursor/scroll ao revisitar uma aba na mesma sessão', () => {
    const files = [
      { name: 'index.html', value: '<html></html>' },
      { name: 'script.js', value: 'const a = 1' },
    ]
    const prefix = 'proj-vs'
    const { rerender } = render(
      <MonacoTabs
        files={files}
        activeFile="index.html"
        onChange={() => {}}
        modelPathPrefix={prefix}
      />,
    )

    // index.html → script.js: salva o estado do index.html; script.js é a 1ª
    // visita (nada a restaurar).
    rerender(
      <MonacoTabs
        files={files}
        activeFile="script.js"
        onChange={() => {}}
        modelPathPrefix={prefix}
      />,
    )
    expect(restoreViewStateCalls).toHaveLength(0)

    // script.js → index.html: restaura o estado salvo DO index.html sobre o
    // model do index.html (o fake registra o par aplicado/corrente).
    rerender(
      <MonacoTabs
        files={files}
        activeFile="index.html"
        onChange={() => {}}
        modelPathPrefix={prefix}
      />,
    )
    expect(restoreViewStateCalls).toHaveLength(1)
    expect(restoreViewStateCalls[0]?.applied.endsWith('/index.html')).toBe(true)
    expect(restoreViewStateCalls[0]?.on.endsWith('/index.html')).toBe(true)
  })
})

describe('MonacoTabs — Formatar', () => {
  beforeEach(resetWorld)
  afterEach(() => {
    cleanup()
    resetWorld()
  })

  const files = [{ name: 'script.js', value: 'const a=1' }]

  function renderWithFormat(onFormatIssue?: (issue: string) => void): HTMLButtonElement {
    render(
      <MonacoTabs
        files={files}
        onChange={() => {}}
        modelPathPrefix="proj-fmt"
        formatLabel="Formatar"
        onFormatIssue={onFormatIssue}
      />,
    )
    return screen.getByRole('button', { name: 'Formatar' }) as HTMLButtonElement
  }

  /** Captura console.warn durante `fn` (sem spy do bun p/ não vazar entre arquivos). */
  async function withWarnCapture(fn: (warns: string[]) => Promise<void>): Promise<void> {
    const warns: string[] = []
    const realWarn = console.warn
    console.warn = (...args: unknown[]) => {
      warns.push(args.map(String).join(' '))
    }
    try {
      await fn(warns)
    } finally {
      console.warn = realWarn
    }
  }

  it('o botão só existe quando formatLabel é passado', () => {
    render(<MonacoTabs files={files} onChange={() => {}} modelPathPrefix="proj-fmt" />)
    expect(screen.queryByRole('button', { name: 'Formatar' })).toBeNull()
    cleanup()
    renderWithFormat()
    expect(screen.getByRole('button', { name: 'Formatar' })).toBeTruthy()
  })

  it('desabilita o botão quando a linguagem da aba não tem formatador (.md)', () => {
    render(
      <MonacoTabs
        files={[{ name: 'README.md', value: '# oi' }]}
        onChange={() => {}}
        modelPathPrefix="proj-fmt"
        formatLabel="Formatar"
      />,
    )
    const button = screen.getByRole('button', { name: 'Formatar' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
  })

  it('clique aguarda os serviços ANTES de resolver a ação, e roda', async () => {
    loadLanguageServicesImpl = async () => {
      formatCallLog.push('services')
    }
    currentFormatAction = {
      isSupported: () => true,
      run: async () => {
        formatCallLog.push('run')
      },
    }
    fireEvent.click(renderWithFormat())
    await waitFor(() =>
      expect(formatCallLog).toEqual(['services', 'getAction:editor.action.formatDocument', 'run']),
    )
  })

  it('espera o provider registrar (isSupported false→true) e então roda', async () => {
    let supported = false
    currentFormatAction = {
      isSupported: () => supported,
      run: async () => {
        formatCallLog.push('run')
      },
    }
    fireEvent.click(renderWithFormat())
    // O provider "registra" no meio da janela do poll (1ms/30ms nos testes).
    setTimeout(() => {
      supported = true
    }, 5)
    await waitFor(() => expect(formatCallLog).toContain('run'))
  })

  it('provider nunca registra: avisa no console, reporta a issue e NÃO roda a ação', async () => {
    await withWarnCapture(async (warns) => {
      const issues: string[] = []
      currentFormatAction = {
        isSupported: () => false,
        run: async () => {
          formatCallLog.push('run')
        },
      }
      fireEvent.click(renderWithFormat((issue) => issues.push(issue)))
      await waitFor(() =>
        expect(warns.some((w) => w.includes('nenhum provider de formatação'))).toBe(true),
      )
      expect(formatCallLog).not.toContain('run')
      expect(issues).toEqual(['no-provider'])
    })
  })

  it('serviços rejeitam: avisa, reporta a issue, não resolve a ação e libera o busy', async () => {
    await withWarnCapture(async (warns) => {
      const issues: string[] = []
      loadLanguageServicesImpl = async () => {
        throw new Error('chunk falhou')
      }
      const button = renderWithFormat((issue) => issues.push(issue))
      fireEvent.click(button)
      await waitFor(() =>
        expect(warns.some((w) => w.includes('serviços de linguagem não carregaram'))).toBe(true),
      )
      expect(formatCallLog.some((c) => c.startsWith('getAction'))).toBe(false)
      expect(issues).toEqual(['services-failed'])
      await waitFor(() => expect(button.disabled).toBe(false))
    })
  })

  it('run() pendurado (worker morto): solta o busy no teto e reporta a issue', async () => {
    await withWarnCapture(async (warns) => {
      const issues: string[] = []
      currentFormatAction = {
        isSupported: () => true,
        // Nunca resolve — reproduz o provider com o worker de linguagem morto
        // (ex.: COEP sem header no chunk → fallback de main thread quebrado).
        run: () => new Promise<void>(() => {}),
      }
      const button = renderWithFormat((issue) => issues.push(issue))
      fireEvent.click(button)
      // Sem o teto, o busy prendia o botão PARA SEMPRE ("só deixa clicar uma vez").
      await waitFor(() => expect(button.disabled).toBe(false))
      expect(warns.some((w) => w.includes('não respondeu a tempo'))).toBe(true)
      expect(issues).toEqual(['run-failed'])
    })
  })

  it('fica busy (desabilitado) durante a formatação e reabilita ao fim', async () => {
    let release!: () => void
    loadLanguageServicesImpl = () =>
      new Promise<void>((resolve) => {
        release = resolve
      })
    currentFormatAction = { isSupported: () => true, run: async () => {} }
    const button = renderWithFormat()
    fireEvent.click(button)
    await waitFor(() => expect(button.disabled).toBe(true))
    release()
    await waitFor(() => expect(button.disabled).toBe(false))
  })
})
