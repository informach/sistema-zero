import * as Blockly from 'blockly/core'
import 'blockly/blocks'
import { beforeAll, describe, expect, it, spyOn } from 'bun:test'
import { applyDraftDiagnostics, findDraftStacks } from '../draftDiagnostics'
import { ensureBlocklyInitialized } from '../setup'

describe('diagnósticos de rascunho', () => {
  beforeAll(() => ensureBlocklyInitialized())

  it('identifica pilhas executáveis fora das Áreas do projeto', () => {
    const workspace = new Blockly.Workspace()
    const area = workspace.newBlock('sz_frame_start')
    const inside = workspace.newBlock('sz_js_console_log_text')
    const draft = workspace.newBlock('sz_js_console_log_text')
    const areaConnection = area.getInput('CHILDREN')?.connection
    if (!areaConnection || !inside.previousConnection) throw new Error('Conexões ausentes')
    areaConnection.connect(inside.previousConnection)

    expect(findDraftStacks(workspace).map((block) => block.id)).toEqual([draft.id])
    expect(applyDraftDiagnostics(workspace)).toEqual([draft.id])
  })

  it('não acusa blocos de valor soltos e remove o rascunho ao encaixar a pilha', () => {
    const workspace = new Blockly.Workspace()
    const area = workspace.newBlock('sz_frame_start')
    const draft = workspace.newBlock('sz_js_console_log_text')
    workspace.newBlock('sz_val_number')

    expect(applyDraftDiagnostics(workspace)).toEqual([draft.id])

    const areaConnection = area.getInput('CHILDREN')?.connection
    if (!areaConnection || !draft.previousConnection) throw new Error('Conexões ausentes')
    areaConnection.connect(draft.previousConnection)
    expect(applyDraftDiagnostics(workspace)).toEqual([])
  })

  it('não percorre todos os blocos para atualizar duas raízes de rascunho', () => {
    const workspace = new Blockly.Workspace()
    workspace.newBlock('sz_js_console_log_text')
    for (let index = 0; index < 200; index += 1) workspace.newBlock('sz_val_number')
    const allBlocks = spyOn(workspace, 'getAllBlocks')

    expect(applyDraftDiagnostics(workspace)).toHaveLength(1)
    expect(allBlocks).not.toHaveBeenCalled()
  })

  /**
   * O defeito que a criança via: o bloco está ENCAIXADO dentro da Área do
   * projeto, gera código e é salvo, e mesmo assim segue com o contorno tracejado
   * e o aviso "Rascunho" — e nenhuma edição limpava, só recarregar a página.
   */
  describe('a marca se cura sozinha quando o rastreio em memória se perde', () => {
    /** Canvas de verdade (happy-dom): é dele que sai a marca de HOJE. */
    function withCanvas(workspace: Blockly.Workspace) {
      const canvas = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      ;(workspace as unknown as Record<string, unknown>).getCanvas = () => canvas
      return canvas
    }

    /** Dá ao bloco um `<g data-id>` no canvas, como o Blockly faz. */
    function withSvgRoot(block: Blockly.Block, canvas: SVGGElement) {
      const root = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      root.setAttribute('data-id', block.id)
      canvas.appendChild(root)
      ;(block as unknown as Record<string, unknown>).getSvgRoot = () => root
      return root
    }

    const isMarked = (root: SVGGElement) => root.classList.contains('sz-draft-block')

    it('limpa um bloco já encaixado cuja marca o conjunto em memória esqueceu', () => {
      const workspace = new Blockly.Workspace()
      const canvas = withCanvas(workspace)
      const area = withSvgRoot(workspace.newBlock('sz_frame_start'), canvas)
      const draft = workspace.newBlock('sz_js_console_log_text')
      const draftId = draft.id
      const draftRoot = withSvgRoot(draft, canvas)

      applyDraftDiagnostics(workspace)
      expect(isMarked(draftRoot)).toBe(true)
      expect(isMarked(area)).toBe(false)

      // O bloco sai da bancada no meio de uma varredura (recarga do projeto,
      // desfazer, troca de projeto): aqui o id some do rastreio em memória.
      draft.dispose(false)
      applyDraftDiagnostics(workspace)

      // Volta com o MESMO id, já encaixado, e com a marca da vida anterior.
      const restored = workspace.newBlock('sz_js_console_log_text', draftId)
      const restoredRoot = withSvgRoot(restored, canvas)
      restoredRoot.classList.add('sz-draft-block')
      const areaConnection = workspace.getBlockById(area.getAttribute('data-id') ?? '')
      const connection = areaConnection?.getInput('CHILDREN')?.connection
      if (!connection || !restored.previousConnection) throw new Error('Conexões ausentes')
      connection.connect(restored.previousConnection)

      expect(applyDraftDiagnostics(workspace)).toEqual([])
      expect(isMarked(restoredRoot)).toBe(false)
    })

    it('não mexe em bloco que nunca foi marcado', () => {
      const workspace = new Blockly.Workspace()
      const canvas = withCanvas(workspace)
      const area = workspace.newBlock('sz_frame_start')
      withSvgRoot(area, canvas)
      const inside = workspace.newBlock('sz_js_console_log_text')
      const insideRoot = withSvgRoot(inside, canvas)
      const connection = area.getInput('CHILDREN')?.connection
      if (!connection || !inside.previousConnection) throw new Error('Conexões ausentes')
      connection.connect(inside.previousConnection)
      const warned = spyOn(inside, 'setWarningText')

      expect(applyDraftDiagnostics(workspace)).toEqual([])
      expect(isMarked(insideRoot)).toBe(false)
      expect(warned).not.toHaveBeenCalled()
    })

    it('workspace sem canvas (headless) segue funcionando', () => {
      const workspace = new Blockly.Workspace()
      const draft = workspace.newBlock('sz_js_console_log_text')

      expect(applyDraftDiagnostics(workspace)).toEqual([draft.id])
    })
  })
})
