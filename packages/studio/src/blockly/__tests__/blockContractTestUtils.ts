import type * as Blockly from 'blockly/core'
import { FRAME_EVENTS, FRAME_LOOPS, FRAME_START, requireBlockContract } from '../blockContracts'

interface AttachOptions {
  workspace: Blockly.Workspace
  type: string
  kind: 'statement' | 'expr'
  expressionHost: string
  expressionInput: string
  loopHost: string
}

const ROOT_FRAME = {
  start: FRAME_START,
  events: FRAME_EVENTS,
  loops: FRAME_LOOPS,
} as const

/** Monta um bloco no contexto físico que seu contrato permite. */
export function attachBlockInContractContext(options: AttachOptions): Blockly.Block {
  const { workspace, type, kind, expressionHost, expressionInput, loopHost } = options
  const statementType = kind === 'expr' ? expressionHost : type
  const contract = requireBlockContract(statementType)
  const root = contract.placement?.root[0]

  let slot: Blockly.Connection | null | undefined
  if (root) {
    const frame = workspace.newBlock(ROOT_FRAME[root])
    slot = frame.getInput('CHILDREN')?.connection
  } else if (contract.placement?.nested.includes('loop-body')) {
    const frame = workspace.newBlock(FRAME_LOOPS)
    const host = workspace.newBlock(loopHost)
    frame.getInput('CHILDREN')?.connection?.connect(host.previousConnection as Blockly.Connection)
    slot = host.getInput('BODY')?.connection
  } else {
    throw new Error(`${statementType}: o teste não conhece um contexto raiz permitido`)
  }

  if (!slot) throw new Error(`${statementType}: contexto sem conexão de statements`)
  if (kind === 'statement') {
    const block = workspace.newBlock(type)
    if (!block.previousConnection) throw new Error(`${type}: statement sem previousConnection`)
    slot.connect(block.previousConnection)
    return block
  }

  const host = workspace.newBlock(expressionHost)
  if (!host.previousConnection) throw new Error(`${expressionHost}: host sem previousConnection`)
  slot.connect(host.previousConnection)
  const socket = host.getInput(expressionInput)?.connection
  const block = workspace.newBlock(type)
  if (!socket || !block.outputConnection) {
    throw new Error(`${type}: reporter sem outputConnection (ou host sem ${expressionInput})`)
  }
  socket.connect(block.outputConnection)
  return block
}
