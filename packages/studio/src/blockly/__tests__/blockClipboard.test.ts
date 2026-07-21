import { beforeAll, beforeEach, describe, expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import {
  copyBlockToClipboard,
  hasClipboard,
  type PasteTargetHandlers,
  readClipboard,
  registerPasteTarget,
  requiredExtensionsForBlockState,
  runCopyBlocks,
  runPasteBlocks,
  unregisterPasteTarget,
} from '../blockClipboard'
import { HTMLConnectionChecker } from '../htmlConnectionChecker'
import { ensureBlocklyInitialized } from '../setup'

const CLIPBOARD_KEY = 'sz:block-clipboard'

beforeAll(() => {
  ensureBlocklyInitialized()
})

beforeEach(() => {
  localStorage.clear()
})

/** Handlers de teste com avisos coletados (sobrescreva o que precisar). */
function makeHandlers(over: Partial<PasteTargetHandlers> = {}): {
  handlers: PasteTargetHandlers
  notices: string[]
} {
  const notices: string[] = []
  const handlers: PasteTargetHandlers = {
    getInstalledExtensions: () => [],
    installExtensionById: () => false,
    isBlockTypeKnown: () => true,
    notify: (message) => notices.push(message),
    ...over,
  }
  return { handlers, notices }
}

describe('requiredExtensionsForBlockState', () => {
  test('estado só com blocos core → []', () => {
    expect(
      requiredExtensionsForBlockState({ type: 'sz_val_text', fields: { VALUE: 'oi' } }),
    ).toEqual([])
  })

  test('bloco de Jogo 2D num input → game-2d', () => {
    const state = {
      type: 'sz_frame_behavior',
      inputs: { CHILDREN: { block: { type: 'sz_g2d_create_sprite' } } },
    }
    expect(requiredExtensionsForBlockState(state)).toEqual(['game-2d'])
  })

  test('bloco de Jogo 3D na cadeia next → game-3d', () => {
    const state = { type: 'sz_js_log', next: { block: { type: 'sz_g3d_create_scene' } } }
    expect(requiredExtensionsForBlockState(state)).toEqual(['game-3d'])
  })

  test('Jogo 2D + Jogo 3D → ambos', () => {
    const state = { type: 'sz_g2d_create_sprite', next: { block: { type: 'sz_g3d_create_box' } } }
    expect(requiredExtensionsForBlockState(state).sort()).toEqual(['game-2d', 'game-3d'])
  })

  test('bloco de Mundo 3D → world-3d', () => {
    expect(requiredExtensionsForBlockState({ type: 'sz_w3d_setup' })).toEqual(['world-3d'])
  })
})

describe('área de transferência (localStorage)', () => {
  test('vazia → hasClipboard false / readClipboard null', () => {
    expect(hasClipboard()).toBe(false)
    expect(readClipboard()).toBeNull()
  })

  test('payload válido → lido de volta', () => {
    localStorage.setItem(
      CLIPBOARD_KEY,
      JSON.stringify({
        version: 1,
        block: { type: 'sz_val_text' },
        requiredExtensions: [],
        copiedAt: 1,
      }),
    )
    expect(hasClipboard()).toBe(true)
    expect(readClipboard()?.block.type).toBe('sz_val_text')
  })

  test('versão diferente → null', () => {
    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify({ version: 999, block: { type: 'x' } }))
    expect(readClipboard()).toBeNull()
  })

  test('sem block → null', () => {
    localStorage.setItem(CLIPBOARD_KEY, JSON.stringify({ version: 1 }))
    expect(readClipboard()).toBeNull()
  })

  test('requiredExtensions ausente no JSON → recalculado do estado', () => {
    localStorage.setItem(
      CLIPBOARD_KEY,
      JSON.stringify({ version: 1, block: { type: 'sz_g2d_create_sprite' } }),
    )
    expect(readClipboard()?.requiredExtensions).toEqual(['game-2d'])
  })

  test('JSON corrompido → null (não lança)', () => {
    localStorage.setItem(CLIPBOARD_KEY, '{ nope')
    expect(readClipboard()).toBeNull()
  })
})

describe('copiar → colar (round-trip real do Blockly)', () => {
  test('copyBlockToClipboard salva e o append recria o bloco', () => {
    const ws1 = new Blockly.Workspace()
    const block = ws1.newBlock('sz_val_text')
    expect(copyBlockToClipboard(block)).toBe(true)
    expect(hasClipboard()).toBe(true)

    const payload = readClipboard()
    expect(payload).not.toBeNull()
    if (!payload) return
    expect(payload.block.type).toBe('sz_val_text')

    const ws2 = new Blockly.Workspace()
    Blockly.serialization.blocks.append(payload.block, ws2)
    expect(ws2.getAllBlocks(false).some((b) => b.type === 'sz_val_text')).toBe(true)
    ws1.dispose()
    ws2.dispose()
  })

  test('runCopyBlocks avisa via handler da instância', () => {
    const ws = new Blockly.Workspace()
    const { handlers, notices } = makeHandlers()
    registerPasteTarget(ws, handlers)
    runCopyBlocks(ws.newBlock('sz_val_text') as Blockly.BlockSvg)
    expect(hasClipboard()).toBe(true)
    expect(notices.some((n) => /copiados/i.test(n))).toBe(true)
    unregisterPasteTarget(ws)
    ws.dispose()
  })

  test('runPasteBlocks cola quando o tipo é conhecido', () => {
    const src = new Blockly.Workspace()
    copyBlockToClipboard(src.newBlock('sz_val_text'))
    src.dispose()

    const ws = new Blockly.Workspace()
    const { handlers, notices } = makeHandlers({ isBlockTypeKnown: () => true })
    registerPasteTarget(ws, handlers)
    runPasteBlocks(ws as unknown as Blockly.WorkspaceSvg)
    expect(ws.getAllBlocks(false).some((b) => b.type === 'sz_val_text')).toBe(true)
    expect(notices.some((n) => /colados/i.test(n))).toBe(true)
    unregisterPasteTarget(ws)
    ws.dispose()
  })

  test('runPasteBlocks RECUSA tipo desconhecido (não cola bloco quebrado)', () => {
    localStorage.setItem(
      CLIPBOARD_KEY,
      JSON.stringify({
        version: 1,
        block: { type: 'sz_inexistente_999' },
        requiredExtensions: [],
        copiedAt: 1,
      }),
    )
    const ws = new Blockly.Workspace()
    const { handlers, notices } = makeHandlers({ isBlockTypeKnown: () => false })
    registerPasteTarget(ws, handlers)
    runPasteBlocks(ws as unknown as Blockly.WorkspaceSvg)
    expect(ws.getAllBlocks(false).length).toBe(0)
    expect(notices.some((n) => /não consegui colar/i.test(n))).toBe(true)
    unregisterPasteTarget(ws)
    ws.dispose()
  })

  test('colar a MESMA cópia duas vezes não colide (ids novos)', () => {
    const src = new Blockly.Workspace()
    copyBlockToClipboard(src.newBlock('sz_val_text'))
    src.dispose()

    const ws = new Blockly.Workspace()
    const { handlers } = makeHandlers()
    registerPasteTarget(ws, handlers)
    runPasteBlocks(ws as unknown as Blockly.WorkspaceSvg)
    runPasteBlocks(ws as unknown as Blockly.WorkspaceSvg)
    expect(ws.getAllBlocks(false).filter((b) => b.type === 'sz_val_text').length).toBe(2)
    unregisterPasteTarget(ws)
    ws.dispose()
  })

  test('preserva como rascunho somente o ramo cuja conexão ficou incompatível', () => {
    localStorage.setItem(
      CLIPBOARD_KEY,
      JSON.stringify({
        version: 1,
        block: {
          type: 'sz_frame_start',
          inputs: {
            CHILDREN: {
              block: {
                type: 'sz_js_on_click_anywhere',
                inputs: {
                  DO: {
                    block: {
                      type: 'sz_js_console_log_text',
                      fields: { VALUE: 'preservado' },
                    },
                  },
                },
              },
            },
          },
        },
        requiredExtensions: [],
        copiedAt: 1,
      }),
    )
    const ws = new Blockly.Workspace(
      new Blockly.Options({ plugins: { connectionChecker: HTMLConnectionChecker } }),
    )
    const { handlers, notices } = makeHandlers()
    registerPasteTarget(ws, handlers)

    // O Blockly mantém uma fila de eventos global entre workspaces. Este teste
    // valida a recuperação estrutural, então isola seus eventos para não apagar
    // o histórico de undo de outro arquivo que o Bun execute em paralelo.
    Blockly.Events.disable()
    try {
      runPasteBlocks(ws as unknown as Blockly.WorkspaceSvg)
    } finally {
      Blockly.Events.enable()
    }

    expect(ws.getBlocksByType('sz_frame_start', false)).toHaveLength(1)
    const [event] = ws.getBlocksByType('sz_js_on_click_anywhere', false)
    expect(event?.getParent()).toBeNull()
    expect(event?.getInputTargetBlock('DO')?.type).toBe('sz_js_console_log_text')
    expect(notices.some((notice) => /preservada como rascunho/i.test(notice))).toBe(true)
    expect(Blockly.Events.isEnabled()).toBe(true)
    expect(Blockly.Events.getGroup()).toBe('')
    expect(Blockly.Events.getRecordUndo()).toBe(true)
    unregisterPasteTarget(ws)
    ws.dispose()
  })
})
