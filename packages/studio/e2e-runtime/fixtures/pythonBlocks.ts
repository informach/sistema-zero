import * as Blockly from 'blockly/core'
import * as PtBr from 'blockly/msg/pt-br'
import { szTheme } from '../../src/blockly/theme'
import {
  type PythonBlocklyBlock,
  pythonVisualToWorkspace,
  pythonWorkspaceToVisual,
  registerPythonBlocks,
} from '../../src/python/blocks/blockly'
import { PYTHON_PROGRAMMING_CODECS } from '../../src/python/blocks/catalog'
import { pythonSemanticTree } from '../../src/python/blocks/nodes'
import { pythonASTToVisual, pythonVisualToAST } from '../../src/python/blocks/projection'
import { PYTHON_TURTLE_CODECS } from '../../src/python/extensions/turtle/catalog'
import type { PythonNode } from '../../src/python/language/types'

let renderedWorkspace: Blockly.WorkspaceSvg | undefined
let renderedRoots: string[] = []
let container: HTMLDivElement | undefined
export function mountPythonBlocks(tree: PythonNode) {
  disposePythonBlocks()
  registerPythonBlocks()
  const messages: Record<string, string> = {}
  for (const [key, value] of Object.entries(PtBr.default ?? PtBr))
    if (typeof value === 'string') messages[key] = value
  Blockly.setLocale(messages)
  container = document.createElement('div')
  container.id = 'python-blocks-proof'
  container.style.cssText = 'height:520px;width:100%;position:relative'
  document.body.append(container)
  renderedWorkspace = Blockly.inject(container, {
    theme: szTheme,
    renderer: 'zelos',
    sounds: false,
    trashcan: true,
    scrollbars: true,
    toolbox: {
      kind: 'flyoutToolbox',
      contents: [
        { kind: 'block', type: 'sz_py_integer' },
        { kind: 'block', type: 'sz_py_text' },
        { kind: 'block', type: 'sz_py_if' },
      ],
    },
  })
  renderedRoots = pythonVisualToWorkspace(pythonASTToVisual(tree), renderedWorkspace)
  renderedWorkspace.getBlockById(renderedRoots[0]!)?.moveBy(350, 40)
  Blockly.svgResize(renderedWorkspace)
}
export function renderedPythonBlockState() {
  const print = renderedWorkspace!
    .getAllBlocks(false)
    .find((block) => block.type === 'sz_py_print') as
    | (PythonBlocklyBlock & Blockly.BlockSvg)
    | undefined
  if (!print) throw new Error('O bloco de saída não foi encontrado na prova visual.')
  return {
    count: print.pythonState.layout.extra?.['args:count'],
    original: print.getInputTargetBlock('args:0')?.getFieldValue('TEXT'),
    connections: print.inputList.filter((input) => input.connection).length,
    blocks: renderedWorkspace!.getAllBlocks(false).length,
  }
}
export function undoRenderedPythonBlock(redo = false) {
  renderedWorkspace!.undo(redo)
}
export function disposePythonBlocks() {
  renderedWorkspace?.dispose()
  renderedWorkspace = undefined
  container?.remove()
  container = undefined
}

export function roundtripPythonBlockly(tree: PythonNode, turtle = false) {
  const codecs = turtle
    ? [...PYTHON_TURTLE_CODECS, ...PYTHON_PROGRAMMING_CODECS]
    : PYTHON_PROGRAMMING_CODECS
  const first = new Blockly.Workspace(),
    restored = new Blockly.Workspace()
  try {
    const projection = pythonASTToVisual(tree, {
      codecs,
      officialModules: new Set(turtle ? ['math', 'random', 'turtle'] : ['math', 'random']),
    })
    const roots = pythonVisualToWorkspace(projection, first, codecs)
    const saved = Blockly.serialization.workspaces.save(first)
    Blockly.serialization.workspaces.load(saved, restored)
    const result = pythonVisualToAST(
      pythonWorkspaceToVisual(restored, roots, projection.typeIgnores, codecs),
      codecs,
    )
    if (JSON.stringify(pythonSemanticTree(tree)) !== JSON.stringify(pythonSemanticTree(result)))
      throw new Error('Blockly mudou a estrutura Python.')
    return {
      tree: result,
      types: restored.getAllBlocks(false).map((block) => block.type),
      blocks: restored.getAllBlocks(false).length,
      opaque: restored.getAllBlocks(false).filter((block) => block.type.startsWith('sz_py_source_'))
        .length,
    }
  } finally {
    first.dispose()
    restored.dispose()
  }
}
