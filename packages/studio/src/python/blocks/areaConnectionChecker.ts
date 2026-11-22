/**
 * A regra de encaixe das áreas do projeto Python, só no ARRASTE (a carga, o desfazer e os menus
 * nunca passam por aqui): as cinco áreas especiais aceitam só os blocos delas; o ⚙️ Ao iniciar
 * aceita qualquer bloco; dentro de função, evento ou laço cabe tudo; nada encaixa embaixo do
 * bloco que liga ou desliga o jogo.
 */
import * as Blockly from 'blockly/core'
import { PYTHON_AREA_INPUT, pythonAreaKindOf } from './areaFrames'
import {
  isPythonGameSwitchStatement,
  PYTHON_TURTLE_REPEAT_CODEC,
  type PythonAreaKind,
  pythonStatementFitsArea,
} from './areas'
import { pythonBlockStatement } from './blockly'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'
import type { PythonBlockCodec } from './contract'

export const PYTHON_AREA_CHECKER = 'sz-python-area-checker'

interface AreaRules {
  codecs: readonly PythonBlockCodec[]
  /** Muda a cada alteração do workspace: o que foi calculado num arraste não vale no próximo. */
  version: number
  cache: Map<string, boolean>
  terminal: WeakMap<Blockly.Block, { version: number; value: boolean }>
  listener: (event: Blockly.Events.Abstract) => void
}
const rulesOf = new WeakMap<Blockly.Workspace, AreaRules>()

/** Liga a regra das áreas neste workspace (com os blocos da paleta do arquivo). */
export function setPythonAreaRules(
  workspace: Blockly.Workspace,
  codecs: readonly PythonBlockCodec[] = PYTHON_PROGRAMMING_CODECS,
) {
  const current = rulesOf.get(workspace)
  if (current) {
    current.codecs = codecs
    current.version++
    current.cache.clear()
    return
  }
  const rules: AreaRules = {
    codecs,
    version: 0,
    cache: new Map(),
    terminal: new WeakMap(),
    listener: (event) => {
      if (event.isUiEvent) return
      rules.version++
      rules.cache.clear()
    },
  }
  workspace.addChangeListener(rules.listener)
  rulesOf.set(workspace, rules)
}

export function clearPythonAreaRules(workspace: Blockly.Workspace) {
  const rules = rulesOf.get(workspace)
  if (!rules) return
  workspace.removeChangeListener(rules.listener)
  rulesOf.delete(workspace)
}

function repeatFunctions(workspace: Blockly.Workspace) {
  return new Set(
    workspace
      .getBlocksByType(PYTHON_TURTLE_REPEAT_CODEC, false)
      .map((block) => String(block.getFieldValue('NAME') ?? '')),
  )
}

export function isPythonGameSwitchBlock(block: Blockly.Block) {
  const rules = rulesOf.get(block.workspace)
  if (rules) return isTerminal(block, rules)
  const statement = pythonBlockStatement(block)
  return !!statement && isPythonGameSwitchStatement(statement, block.type)
}

function isTerminal(block: Blockly.Block, rules: AreaRules) {
  const cached = rules.terminal.get(block)
  if (cached?.version === rules.version) return cached.value
  const statement = pythonBlockStatement(block, rules.codecs)
  const value = !!statement && isPythonGameSwitchStatement(statement, block.type)
  rules.terminal.set(block, { version: rules.version, value })
  return value
}

/** O bloco cabe nesta área? (O nome de uma configuração ganha maiúsculas ao entrar.) */
function blockFits(block: Blockly.Block, kind: PythonAreaKind, rules: AreaRules): boolean {
  if (kind === 'start') return true
  const key = `${block.id}\u0000${kind}`
  const cached = rules.cache.get(key)
  if (cached !== undefined) return cached
  let statement = pythonBlockStatement(block, rules.codecs)
  // "guardar" de nome minúsculo entra em 🎛️ (o editor troca o nome para maiúsculas).
  if (kind === 'settings' && statement?.kind === 'Assign') {
    const target = Array.isArray(statement.fields.targets) ? statement.fields.targets[0] : undefined
    if (target && typeof target === 'object' && 'kind' in target && target.kind === 'Name') {
      const id = String(target.fields.id ?? '')
      statement = {
        ...statement,
        fields: {
          ...statement.fields,
          targets: [{ ...target, fields: { ...target.fields, id: id.toUpperCase() } }],
        },
      }
    }
  }
  const fits =
    !!statement &&
    pythonStatementFitsArea(kind, statement, block.type, {
      repeatFunctions: repeatFunctions(block.workspace),
    })
  rules.cache.set(key, fits)
  return fits
}

/** A área em que a conexão alvo põe a pilha, ou undefined fora das áreas (rascunho, função). */
function targetArea(target: Blockly.Connection): PythonAreaKind | 'outside' {
  const owner = target.getSourceBlock()
  if (target.type === Blockly.ConnectionType.NEXT_STATEMENT) {
    // A entrada da área (o começo da corrente) ou o "embaixo de" um bloco da corrente.
    const input = target.getParentInput()
    if (input?.name === PYTHON_AREA_INPUT) return pythonAreaKindOf(owner) ?? 'outside'
    if (input) return 'outside'
    return pythonAreaKindOf(owner.getSurroundParent()) ?? 'outside'
  }
  if (target.type === Blockly.ConnectionType.PREVIOUS_STATEMENT)
    return pythonAreaKindOf(owner.getSurroundParent()) ?? 'outside'
  return 'outside'
}

/**
 * Pode soltar a pilha que começa em `dragged` nesta conexão? É a regra inteira do arraste,
 * separada do Blockly para os testes.
 */
export function pythonAreaDropAllowed(
  dragging: Blockly.Connection,
  target: Blockly.Connection,
): boolean {
  const workspace = target.getSourceBlock().workspace
  const rules = rulesOf.get(workspace)
  if (!rules) return true
  const area = targetArea(target)
  if (area === 'outside') return true
  // Nada encaixa embaixo do bloco que liga ou desliga o jogo.
  if (
    target.type === Blockly.ConnectionType.NEXT_STATEMENT &&
    !target.getParentInput() &&
    isTerminal(target.getSourceBlock(), rules)
  )
    return false
  if (dragging.type !== Blockly.ConnectionType.PREVIOUS_STATEMENT) return true
  for (
    let block: Blockly.Block | null = dragging.getSourceBlock();
    block;
    block = block.getNextBlock()
  )
    if (!blockFits(block, area, rules)) return false
  return true
}

export class PythonAreaConnectionChecker extends Blockly.ConnectionChecker {
  override doDragChecks(
    a: Blockly.RenderedConnection,
    b: Blockly.RenderedConnection,
    distance: number,
  ): boolean {
    return super.doDragChecks(a, b, distance) && pythonAreaDropAllowed(a, b)
  }
}

export function registerPythonAreaChecker() {
  if (Blockly.registry.hasItem(Blockly.registry.Type.CONNECTION_CHECKER, PYTHON_AREA_CHECKER))
    return
  Blockly.registry.register(
    Blockly.registry.Type.CONNECTION_CHECKER,
    PYTHON_AREA_CHECKER,
    PythonAreaConnectionChecker,
  )
}
