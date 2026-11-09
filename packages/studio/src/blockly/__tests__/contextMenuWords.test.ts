import { beforeAll, describe, expect, it } from 'bun:test'
import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { ensureBlocklyInitialized } from '../setup'

/**
 * Palavras de criança no botão direito (redesenho do clássico, 11/2026): o texto muda, o
 * comportamento é o do Blockly; "Organizar blocos" (âncora do robô das aulas) fica e o
 * "Arrumar blocos" nativo sai; "Perguntar ao Zappy" só aparece onde o Estúdio ligou o abridor.
 */
const registry = Blockly.ContextMenuRegistry.registry
type Action = Exclude<Blockly.ContextMenuRegistry.RegistryItem, { separator: true }>
const item = (id: string) => registry.getItem(id) as Action | null
const text = (id: string, scope: Blockly.ContextMenuRegistry.Scope) => {
  const display = item(id)?.displayText
  return typeof display === 'function' ? display(scope) : display
}

beforeAll(() => ensureBlocklyInitialized())

describe('menu do botão direito', () => {
  it('troca as palavras e mantém o "Organizar blocos"', () => {
    const workspace = new Blockly.Workspace()
    const block = workspace.newBlock('controls_if')
    expect(text('blockDuplicate', { block })).toBe('Duplicar')
    expect(text('blockCollapseExpand', { block })).toBe('Fechar o bloco')
    expect(text('blockDisable', { block })).toBe('Desligar o bloco')
    block.setDisabledReason(true, 'manually_disabled')
    expect(text('blockDisable', { block })).toBe('Ligar o bloco')
    expect(text('sz_copy_blocks', { block })).toBe('Copiar')
    expect(text('blockComment', { block })).toBe('Escrever um recado')
    // Um recado vazio ainda é um recado: o clique nativo o tira, então o rótulo diz "Tirar".
    block.setCommentText('')
    expect(text('blockComment', { block })).toBe('Tirar o recado')
    expect(text('sz_organize', { workspace })).toBe('Organizar blocos')
    // O "Arrumar blocos" nativo só sai no espaço do JavaScript (que tem o "Organizar blocos").
    // (Um espaço de mentira com o que a precondição nativa lê: o headless não tem `isMovable`.)
    const other = { isMovable: () => true, getTopBlocks: () => [block, block] }
    expect(item('cleanWorkspace')?.preconditionFn?.({ workspace: other } as never)).toBe('enabled')
    const studio = { ...other, __szOrganizes: true }
    expect(item('cleanWorkspace')?.preconditionFn?.({ workspace: studio } as never)).toBe('hidden')
    workspace.dispose()
  })

  it('"Perguntar ao Zappy" só com o abridor do Estúdio, e chama com o bloco', () => {
    const workspace = new Blockly.Workspace()
    const block = workspace.newBlock('controls_if')
    expect(item('sz_ask_zappy')?.preconditionFn?.({ block } as never)).toBe('hidden')
    const asked: string[] = []
    ;(workspace as unknown as { __szAskZappy?: (b: Blockly.Block) => void }).__szAskZappy = (b) =>
      asked.push(b.id)
    expect(item('sz_ask_zappy')?.preconditionFn?.({ block } as never)).toBe('enabled')
    item('sz_ask_zappy')?.callback?.(
      { block } as never,
      new PointerEvent('pointerdown'),
      null as never,
      null as never,
    )
    expect(asked).toEqual([block.id])
    workspace.dispose()
  })
})
