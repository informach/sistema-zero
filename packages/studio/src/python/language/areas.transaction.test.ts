/**
 * O caminho do editor com as áreas do projeto (abrir → gesto nos blocos → transação visual), com o
 * analisador CPython de verdade: os comentários de área, a codificação, a ida de uma linha para
 * dentro de uma função e a exclusão da última área. Sem Python 3.13+ no PATH, pula com aviso.
 */
import { afterEach, describe, expect, test } from 'bun:test'
import { fileURLToPath } from 'node:url'
import * as Blockly from 'blockly/core'
import { executablePythonAreaFrames, pythonAreaFrames } from '../blocks/areaFrames'
import { organizePythonWorkspace } from '../blocks/areaOrganize'
import {
  analyzePythonModuleAreas,
  PYTHON_AREA_BY_KIND,
  type PythonAreaKind,
  pythonDisplayAreas,
} from '../blocks/areas'
import { pythonVisualToWorkspace, pythonWorkspaceToVisual } from '../blocks/blockly'
import { PYTHON_PROGRAMMING_CODECS as codecs } from '../blocks/catalog'
import { pythonASTToVisual } from '../blocks/projection'
import { bindPythonVisualOrigins, type PythonWorkspaceOrigins } from '../blocks/provenance'
import { orderPythonWorkspaceRoots } from '../blocks/workspacePresentation'
import type { PythonAnalysisIdentity, PythonNode, PythonParsedDocument } from './types'
import { preparePythonVisualTransaction } from './visualTransaction'

const DRIVER = fileURLToPath(new URL('../blocks/areas.differential.py', import.meta.url))

/**
 * O analisador do Estúdio (`analyzer.py`) usa `ast.parse(..., optimize=0)`, que só existe a partir do
 * Python 3.13 (o do Pyodide): num 3.12 ele recusa tudo, e a prova não diria nada.
 */
function findPython(): string | undefined {
  for (const command of ['python3', 'python']) {
    try {
      const probe = Bun.spawnSync([command, '-c', 'import sys; print(sys.version_info >= (3, 13))'])
      if (probe.exitCode === 0 && probe.stdout.toString().trim() === 'True') return command
    } catch {
      // sem este comando: tenta o próximo
    }
  }
  return undefined
}
const PYTHON = findPython()
if (!PYTHON) console.warn('[areas.transaction] sem Python 3.13+ no PATH: prova do editor pulada')

function service(request: Record<string, unknown>) {
  const result = Bun.spawnSync([PYTHON!, '-I', DRIVER], {
    stdin: new TextEncoder().encode(JSON.stringify({ op: 'service', request })),
  })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return JSON.parse(result.stdout.toString())
}
const identity = (generation: number): PythonAnalysisIdentity => ({
  projectId: 'p',
  instanceId: 'i',
  path: 'main.py',
  revision: 'a'.repeat(64),
  generation,
})
const analysis = {
  async parse(id: PythonAnalysisIdentity, source: string): Promise<PythonParsedDocument> {
    const result = service({ operation: 'parse', path: 'main.py', source, compilable: true })
    if (!result.ok) throw new Error(result.message)
    return {
      version: 1,
      language: 'python',
      identity: id,
      source,
      tree: result.tree,
      tokens: result.tokens,
      diagnostics: result.diagnostics,
    }
  },
  async render(node: PythonNode) {
    const result = service({ operation: 'render', node })
    if (!result.ok) throw new Error(result.message)
    return result.source as string
  },
}
const marker = (kind: PythonAreaKind) => PYTHON_AREA_BY_KIND.get(kind)!.marker

interface Editor {
  ws: Blockly.Workspace
  rootIds: string[]
  origins: PythonWorkspaceOrigins
  document: PythonParsedDocument
}
let editor: Editor | undefined
afterEach(() => editor?.ws.dispose())

async function open(source: string): Promise<Editor> {
  const document = await analysis.parse(identity(1), source)
  if (!document.tree || document.diagnostics.length) throw new Error('não analisou')
  const projection = pythonASTToVisual(document.tree, { codecs })
  const areas = pythonDisplayAreas(
    analyzePythonModuleAreas(
      document.tree,
      projection.body.map((value) => (value.kind === 'block' ? value.codecId : undefined)),
    ).statements,
  )
  const ws = new Blockly.Workspace()
  Blockly.Events.disable()
  let rootIds: string[]
  try {
    rootIds = pythonVisualToWorkspace(projection, ws, codecs, { areas })
  } finally {
    Blockly.Events.enable()
  }
  const origins = bindPythonVisualOrigins(
    pythonWorkspaceToVisual(ws, rootIds, projection.typeIgnores, codecs),
    document.tree,
    codecs,
  )
  editor = { ws, rootIds, origins, document }
  return editor
}

async function commit({ ws, origins, document, rootIds }: Editor) {
  const roots = orderPythonWorkspaceRoots(ws, origins, rootIds)
  const projection = pythonWorkspaceToVisual(
    ws,
    roots,
    (document.tree!.fields.type_ignores as PythonNode[]) ?? [],
    codecs,
    origins,
  )
  const result = await preparePythonVisualTransaction({
    document,
    projection,
    codecs,
    nextIdentity: identity(2),
    current: () => ({ identity: document.identity, source: document.source }),
    analysis,
  })
  return result.parsed.source
}
const blockWith = (ws: Blockly.Workspace, type: string, field?: string, value?: string) =>
  ws
    .getBlocksByType(type, false)
    .find((block) => field === undefined || String(block.getFieldValue(field)) === value)!

describe.skipIf(!PYTHON)('áreas do projeto no caminho do editor (CPython)', () => {
  test('trocar um número escreve o comentário de cada área', async () => {
    const opened = await open('import math\nprint(1)\n')
    blockWith(opened.ws, 'sz_py_integer', 'NUMBER', '1').setFieldValue('2', 'NUMBER')
    const source = await commit(opened)
    expect(source).toBe(`${marker('libraries')}\nimport math\n\n${marker('start')}\nprint(2)\n`)
  }, 30_000)

  test('a declaração de codificação na linha 2 fica no topo, e o gesto funciona', async () => {
    for (const header of ['# meu jogo\n# -*- coding: utf-8 -*-\n', '\n# coding: utf-8\n']) {
      const opened = await open(`${header}import math\nprint(1)\n`)
      blockWith(opened.ws, 'sz_py_integer', 'NUMBER', '1').setFieldValue('2', 'NUMBER')
      const source = await commit(opened)
      // A declaração continua nas linhas 1–2; o comentário de área vem depois dela.
      expect(source.startsWith(header)).toBe(true)
      expect(source.slice(header.length).trimStart().startsWith(marker('libraries'))).toBe(true)
      opened.ws.dispose()
      editor = undefined
    }
  }, 30_000)

  test('levar a primeira linha de uma área para dentro de uma função deixa o comentário de área no módulo', async () => {
    const source = [
      marker('molds'),
      'def f():',
      '    pass',
      '',
      marker('start'),
      '# mostra o número',
      'print(1)',
      'f()',
      '',
    ].join('\n')
    const opened = await open(source)
    const print = blockWith(opened.ws, 'sz_py_print')
    const definition = blockWith(opened.ws, 'sz_py_def')
    print.unplug(true)
    definition.getInput('body')!.connection!.connect(print.previousConnection!)
    const after = await commit(opened)
    const lines = after.split('\n')
    // O comentário de área continua na coluna 0, e só o comentário da linha foi junto.
    expect(lines.filter((line) => line.trim() === marker('start'))).toEqual([marker('start')])
    expect(lines).toContain('    # mostra o número')
  }, 30_000)

  test('comentário de área com espaço no fim é reconhecido (não duplica)', async () => {
    const opened = await open(`${marker('start')}  \nprint(1)\n`)
    blockWith(opened.ws, 'sz_py_integer', 'NUMBER', '1').setFieldValue('2', 'NUMBER')
    const source = await commit(opened)
    expect(source.split(marker('start')).length - 1).toBe(1)
  }, 30_000)

  test('o comentário recuado que fecha uma função fica com ela, acima do comentário da área seguinte', async () => {
    const opened = await open('def f():\n    return 1\n    # fim de f\nprint(7)\n')
    blockWith(opened.ws, 'sz_py_integer', 'NUMBER', '7').setFieldValue('8', 'NUMBER')
    const source = await commit(opened)
    expect(source).toBe(
      `${marker('molds')}\ndef f():\n    return 1\n    # fim de f\n\n${marker('start')}\nprint(8)\n`,
    )
  }, 30_000)

  test('uma linha com dois comandos não tira os comentários de área do arquivo', async () => {
    const opened = await open('import math\nA = 1; b = 2\nprint(7)\n')
    blockWith(opened.ws, 'sz_py_integer', 'NUMBER', '7').setFieldValue('8', 'NUMBER')
    const source = await commit(opened)
    // O Ao iniciar começa no meio da linha (`b = 2`): o comentário dele vai para a próxima linha.
    expect(source).toBe(
      `${marker('libraries')}\nimport math\n\n${marker('settings')}\nA = 1; b = 2\n\n${marker('start')}\nprint(8)\n`,
    )
  }, 30_000)

  test('organizar e desfazer não deixam linha em branco no começo do arquivo', async () => {
    const typed = 'print(1)\ndef pular():\n    pass\n'
    const opened = await open(typed)
    expect(organizePythonWorkspace(opened.ws, codecs).changed).toBe(true)
    const organized = await commit(opened)
    opened.ws.dispose()
    // O desfazer: a função volta para depois do print, no Ao iniciar.
    const again = await open(organized)
    const definition = blockWith(again.ws, 'sz_py_def')
    const print = blockWith(again.ws, 'sz_py_print')
    definition.unplug(true)
    print.nextConnection!.connect(definition.previousConnection!)
    const undone = await commit(again)
    expect(undone).toBe(`${marker('start')}\n${typed}`)
  }, 30_000)

  test('excluir a última área com linhas apaga o programa e deixa o rascunho de fora', async () => {
    const opened = await open('print(7)\n')
    opened.ws.newBlock('sz_py_assign')
    pythonAreaFrames(opened.ws).get('start')!.dispose()
    expect(executablePythonAreaFrames(opened.ws)).toEqual([])
    const source = await commit(opened)
    expect(source.trim()).toBe('')
  }, 30_000)
})
