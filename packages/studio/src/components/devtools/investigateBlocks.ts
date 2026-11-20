import * as Blockly from 'blockly/core'
import { findIdAtLine, reverseSourceMap, type SourceMap } from '#generators'

/**
 * Do que o jogo diz (um nome de variável, uma linha do script) até o bloco da criança, para o
 * "Mostrar o bloco" e o caminho até o erro da aba Investigar. O mapa de linhas é o mesmo que o
 * sinal vermelho do erro já usa (`sourcemapStore`).
 */

const escapeName = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * A linha (1 em diante) onde o script cria a variável: a declaração (`let`, `var`, `const`,
 * `function`) e, sem ela, a primeira atribuição. `null` quando o nome não aparece.
 */
export function declarationLine(script: string, name: string): number | null {
  if (!/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) return null
  const lines = script.split('\n')
  const declared = new RegExp(`(?:\\b(?:var|let|const)\\s+|\\bfunction\\s+)${escapeName(name)}\\b`)
  const assigned = new RegExp(`(?:^|[^.\\w$])${escapeName(name)}\\s*=(?!=)`)
  for (const pattern of [declared, assigned]) {
    const index = lines.findIndex((line) => pattern.test(line))
    if (index >= 0) return index + 1
  }
  return null
}

/** O bloco daquela linha do script gerado (o mais estreito que a contém). */
export function blockAtScriptLine(map: SourceMap, line: number): string | null {
  return findIdAtLine(reverseSourceMap(map), 'script.js', line)
}

type BlockJson = { id: string; type: string; [key: string]: unknown }

const isBlockWithId = (record: Record<string, unknown>, id: string): record is BlockJson =>
  record.id === id && typeof record.type === 'string'

/** O JSON de um bloco dentro do estado salvo dos blocos (procura em toda a árvore). */
export function findBlockJson(state: unknown, id: string): BlockJson | null {
  const stack: unknown[] = [state]
  let visited = 0
  while (stack.length && visited < 200_000) {
    const node = stack.pop()
    visited++
    if (!node || typeof node !== 'object') continue
    if (Array.isArray(node)) {
      for (const item of node) stack.push(item)
      continue
    }
    const record = node as Record<string, unknown>
    if (isBlockWithId(record, id)) return record
    for (const value of Object.values(record))
      if (value && typeof value === 'object') stack.push(value)
  }
  return null
}

/**
 * O texto do bloco como a criança o lê ("Somar 1 à variável vidas"), sem os blocos de baixo nem
 * os de dentro dos encaixes de comandos: um bloco "Se" diz só a condição. Monta o bloco num
 * espaço de trabalho sem tela, com as definições que o editor já registrou. `null` quando não dá
 * (bloco que não existe mais, tipo desconhecido).
 */
export function blockLabel(state: unknown, id: string, maxLength = 70): string | null {
  const json = findBlockJson(state, id)
  if (!json) return null
  const { next: _next, x: _x, y: _y, ...own } = json
  const workspace = new Blockly.Workspace()
  try {
    const block = Blockly.serialization.blocks.append(own, workspace, { recordUndo: false })
    for (const input of block.inputList) {
      if (input.type === Blockly.inputs.inputTypes.STATEMENT)
        input.connection?.targetBlock()?.dispose(false)
    }
    const text = block.toString(maxLength).replace(/\s+/g, ' ').trim()
    return text || null
  } catch {
    return null
  } finally {
    workspace.dispose()
  }
}
