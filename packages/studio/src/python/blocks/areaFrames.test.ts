import { expect, test } from 'bun:test'
import * as Blockly from 'blockly/core'
import {
  appendToPythonAreaFrame,
  ensurePythonAreaFrame,
  executablePythonAreaFrames,
  PYTHON_AREA_INPUT,
  pythonAreaFrames,
  pythonScratchRoots,
} from './areaFrames'
import type { PythonAreaKind } from './areas'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual } from './blockly'
import { expression, integer, moduleNode, name, node } from './nodes'
import { pythonASTToVisual, pythonVisualToAST } from './projection'
import { readPythonWorkspaceState } from './readWorkspaceState'
import { preparePythonScratchRestore } from './restoreWorkspace'
import { splitPythonWorkspace } from './workspaceParts'
import { orderPythonWorkspaceRoots } from './workspacePresentation'
import { samePythonWorkspaceProgram, savePythonWorkspace } from './workspaceState'

const assign = (target: string, value = integer('1')) =>
  node('Assign', { targets: [name(target, 'Store')], value, type_comment: null })
const imp = (id: string) => node('Import', { names: [node('alias', { name: id, asname: null })] })

function project(statements: ReturnType<typeof assign>[], areas: PythonAreaKind[]) {
  const ws = new Blockly.Workspace()
  const projection = pythonASTToVisual(moduleNode(statements))
  const rootIds = pythonVisualToWorkspace(projection, ws, undefined, { areas })
  return { ws, rootIds, projection }
}

test('cada área recebe as linhas dela, na ordem do arquivo, e a leitura devolve o mesmo programa', () => {
  const statements = [imp('random'), assign('VEL', integer('2')), expression(integer('7'))]
  const { ws, rootIds, projection } = project(statements, ['libraries', 'settings', 'start'])
  try {
    expect([...pythonAreaFrames(ws).keys()]).toEqual(['libraries', 'settings', 'start'])
    expect(rootIds).toEqual(executablePythonAreaFrames(ws).map((frame) => frame.id))
    const read = pythonWorkspaceToVisual(ws, rootIds)
    expect(read.areas).toEqual(['libraries', 'settings', 'start'])
    expect(pythonVisualToAST(read)).toEqual(pythonVisualToAST(projection))
  } finally {
    ws.dispose()
  }
})

test('a ordem entre as áreas é a do arquivo, nunca a posição na tela', () => {
  const { ws, rootIds } = project([imp('random'), expression(integer('7'))], ['libraries', 'start'])
  try {
    const [libraries, start] = executablePythonAreaFrames(ws)
    start!.moveBy(-500, -500)
    libraries!.moveBy(400, 400)
    expect(orderPythonWorkspaceRoots(ws, new Map(), rootIds)).toEqual(rootIds)
  } finally {
    ws.dispose()
  }
})

test('rascunho e área vazia não mudam o programa; trocar uma linha de área muda', () => {
  const { ws, rootIds } = project(
    [assign('VEL', integer('2')), expression(integer('7'))],
    ['settings', 'start'],
  )
  try {
    const saved = savePythonWorkspace(ws, new Map())
    ws.newBlock('sz_py_assign')
    ensurePythonAreaFrame(ws, 'events')
    expect(samePythonWorkspaceProgram(saved, savePythonWorkspace(ws, new Map()))).toBe(true)
    expect(pythonVisualToAST(pythonWorkspaceToVisual(ws, rootIds))).toEqual(
      pythonVisualToAST(pythonWorkspaceToVisual(ws, rootIds)),
    )
    // A configuração desce para o Ao iniciar: o código é o mesmo, mas a divisão (e o comentário
    // de área) muda, então o editor precisa gravar.
    const frames = pythonAreaFrames(ws)
    const setting = frames.get('settings')!.getInputTargetBlock(PYTHON_AREA_INPUT)!
    setting.unplug(false)
    const start = frames.get('start')!
    appendToPythonAreaFrame(start, setting)
    expect(samePythonWorkspaceProgram(saved, savePythonWorkspace(ws, new Map()))).toBe(false)
  } finally {
    ws.dispose()
  }
})

test('o estado salvo separa as áreas com linhas (programa) do resto (rascunho e áreas vazias)', () => {
  const { ws } = project([expression(integer('7'))], ['start'])
  try {
    ensurePythonAreaFrame(ws, 'events')
    ws.newBlock('sz_py_assign')
    const { program, scratch } = splitPythonWorkspace(savePythonWorkspace(ws, new Map()))
    const types = (state: Record<string, unknown> | null | undefined) =>
      ((state?.blocks as { blocks: { type: string }[] } | undefined)?.blocks ?? []).map(
        (block) => block.type,
      )
    expect(types(program)).toEqual(['sz_py_area_start'])
    expect(types(scratch).sort()).toEqual(['sz_py_area_events', 'sz_py_assign'])
  } finally {
    ws.dispose()
  }
})

test('área repetida é recusada na validação; área vazia volta com os rascunhos só se faltar', () => {
  const ws = new Blockly.Workspace()
  try {
    ensurePythonAreaFrame(ws, 'start')
    const duplicate = savePythonWorkspace(ws, new Map()) as {
      blocks: { blocks: Record<string, unknown>[] }
    }
    duplicate.blocks.blocks.push({ ...duplicate.blocks.blocks[0]!, id: 'outra-area' })
    expect(() => readPythonWorkspaceState(duplicate)).toThrow()

    const other = new Blockly.Workspace()
    try {
      ensurePythonAreaFrame(other, 'start')
      ensurePythonAreaFrame(other, 'events')
      const restore = preparePythonScratchRestore(savePythonWorkspace(other, new Map()))!
      restore(ws)
      expect([...pythonAreaFrames(ws).keys()].sort()).toEqual(['events', 'start'])
    } finally {
      other.dispose()
    }
  } finally {
    ws.dispose()
  }
})

test('rascunho salvo com a mesma área vazia duas vezes reabre com uma só', () => {
  const other = new Blockly.Workspace()
  const ws = new Blockly.Workspace()
  try {
    ensurePythonAreaFrame(other, 'events')
    const saved = savePythonWorkspace(other, new Map()) as {
      blocks: { blocks: Record<string, unknown>[] }
    }
    saved.blocks.blocks.push({ ...saved.blocks.blocks[0]!, id: 'outra-area' })
    const restore = preparePythonScratchRestore(saved)!
    restore(ws)
    expect(ws.getBlocksByType('sz_py_area_events', false)).toHaveLength(1)
  } finally {
    other.dispose()
    ws.dispose()
  }
})

test('rascunho com área cheia de linhas é recusado', () => {
  const { ws } = project([expression(integer('7'))], ['start'])
  try {
    expect(() => preparePythonScratchRestore(savePythonWorkspace(ws, new Map()))).toThrow()
  } finally {
    ws.dispose()
  }
})

test('excluir uma área manda as linhas para Rascunhos, e desfazer devolve', async () => {
  const { ws } = project([expression(integer('7')), expression(integer('8'))], ['start', 'start'])
  try {
    Blockly.Events.setGroup(false)
    const frame = pythonAreaFrames(ws).get('start')!
    const first = frame.getInputTargetBlock(PYTHON_AREA_INPUT)!
    frame.dispose()
    expect(first.isDeadOrDying()).toBe(false)
    expect(first.getParent()).toBeNull()
    expect(pythonScratchRoots(ws).map((block) => block.id)).toContain(first.id)
    // O Blockly entrega os eventos (e enche a pilha do desfazer) no tique seguinte.
    await new Promise((done) => setTimeout(done, 0))
    ws.undo(false)
    const restored = pythonAreaFrames(ws).get('start')
    expect(restored?.getInputTargetBlock(PYTHON_AREA_INPUT)?.id).toBe(first.id)
  } finally {
    ws.dispose()
  }
})

test('excluir a última área com linhas deixa o programa vazio: os rascunhos continuam rascunhos', () => {
  const { ws, rootIds } = project([expression(integer('7'))], ['start'])
  try {
    const scratch = ws.newBlock('sz_py_assign')
    const frame = pythonAreaFrames(ws).get('start')!
    frame.dispose()
    // As raízes de antes apontam para a área que sumiu: o modo antigo (pilhas soltas = programa)
    // não pode voltar por causa disso.
    const roots = orderPythonWorkspaceRoots(ws, new Map(), rootIds)
    expect(roots).toEqual([])
    expect(pythonWorkspaceToVisual(ws, roots).body).toEqual([])
    expect(() => pythonWorkspaceToVisual(ws, rootIds)).toThrow('atualizada')
    expect(pythonScratchRoots(ws).map((block) => block.id)).toContain(scratch.id)
    const { program } = splitPythonWorkspace(savePythonWorkspace(ws, new Map()))
    expect((program.blocks as { blocks: unknown[] }).blocks).toEqual([])
  } finally {
    ws.dispose()
  }
})

test('recolher um bloco ou mexer num rascunho não esconde a troca de um campo do programa', () => {
  const { ws } = project([expression(integer('1'))], ['start'])
  try {
    const original = savePythonWorkspace(ws, new Map())
    const literal = ws.getBlocksByType('sz_py_integer', false)[0]!
    const scratch = ws.newBlock('sz_py_integer')
    scratch.setFieldValue('99', 'NUMBER')
    literal.getParent()!.setCollapsed(true)
    pythonAreaFrames(ws).get('start')!.setCollapsed(true)
    expect(samePythonWorkspaceProgram(original, savePythonWorkspace(ws, new Map()))).toBe(true)
    literal.setFieldValue('2', 'NUMBER')
    expect(samePythonWorkspaceProgram(original, savePythonWorkspace(ws, new Map()))).toBe(false)
  } finally {
    ws.dispose()
  }
})

test('um bloco de outra área carregado por código entra sem erro (a regra é só do arraste)', () => {
  const ws = new Blockly.Workspace()
  try {
    const projection = pythonASTToVisual(moduleNode([expression(integer('1'))]))
    const rootIds = pythonVisualToWorkspace(projection, ws, undefined, { areas: ['libraries'] })
    expect(pythonWorkspaceToVisual(ws, rootIds).areas).toEqual(['libraries'])
    const block = ws.newBlock('sz_py_assign')
    expect(() =>
      appendToPythonAreaFrame(pythonAreaFrames(ws).get('libraries')!, block),
    ).not.toThrow()
  } finally {
    ws.dispose()
  }
})
