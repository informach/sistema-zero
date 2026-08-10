import type * as Blockly from 'blockly/core'
import type { JSExpr, JSStatement } from '#ir'
import type { ExprMapContext, IdentifierResolver, IdentifierScope } from '../../generators/expr'
import type { SerializedBlocklyBlock } from '../types'
import {
  PROGRAMMING_CODEC_UNHANDLED,
  type ProgrammingBlockToIRContext,
  type ProgrammingStatementRoutedNode,
  programmingBlockToExpression,
  programmingBlockToStatement,
} from './blockToIR'
import {
  PROGRAMMING_IR_TO_BLOCK_UNHANDLED,
  type ProgrammingIRToBlockContext,
  programmingExpressionIRToBlock,
  programmingStatementIRToBlock,
} from './irToBlock'
import {
  isProgrammingExpressionIR,
  isProgrammingStatementIR,
  type ProgrammingExpressionToCodeContext,
  type ProgrammingStatementMapContext,
  type ProgrammingStatementToCodeContext,
  programmingExpressionIRToCode,
  programmingStatementIRToCode,
} from './irToCode'

export interface ProgrammingBlockToIRExpressionRequest {
  kind: 'expression'
  block: Blockly.Block
  context: ProgrammingBlockToIRContext
}

export interface ProgrammingBlockToIRStatementRequest {
  kind: 'statement'
  block: Blockly.Block
  seen: Set<string>
  context: ProgrammingBlockToIRContext
}

export type ProgrammingBlockToIRRequest =
  | ProgrammingBlockToIRExpressionRequest
  | ProgrammingBlockToIRStatementRequest

export type ProgrammingBlockToIRExpressionResult =
  | JSExpr
  | null
  | typeof PROGRAMMING_CODEC_UNHANDLED

export type ProgrammingBlockToIRStatementResult =
  | ProgrammingStatementRoutedNode
  | null
  | typeof PROGRAMMING_CODEC_UNHANDLED

export type ProgrammingBlockToIRResult =
  | ProgrammingBlockToIRExpressionResult
  | ProgrammingBlockToIRStatementResult

export type ProgrammingIRToBlockRequest =
  | { kind: 'expression'; node: JSExpr; context: ProgrammingIRToBlockContext }
  | { kind: 'statement'; node: JSStatement; context: ProgrammingIRToBlockContext }

export type ProgrammingIRToBlockResult =
  | SerializedBlocklyBlock
  | null
  | typeof PROGRAMMING_IR_TO_BLOCK_UNHANDLED

export type ProgrammingIRToCodeRequest =
  | {
      kind: 'expression'
      node: JSExpr
      parentPrecedence: number
      identifiers: IdentifierResolver
      mapContext?: ExprMapContext
      context: ProgrammingExpressionToCodeContext
    }
  | {
      kind: 'statement'
      node: JSStatement
      indent: number
      identifiers: IdentifierScope
      mapContext?: ProgrammingStatementMapContext
      context: ProgrammingStatementToCodeContext
    }

export type ProgrammingCodeToIRAdapter = <Result>(
  source: string,
  parse: (source: string) => Result,
) => Result

export interface ProgrammingBlockToIRAdapter {
  (request: ProgrammingBlockToIRExpressionRequest): ProgrammingBlockToIRExpressionResult
  (request: ProgrammingBlockToIRStatementRequest): ProgrammingBlockToIRStatementResult
}

export interface ProgrammingCodecAdapters {
  blockToIR: ProgrammingBlockToIRAdapter
  irToBlock(request: ProgrammingIRToBlockRequest): ProgrammingIRToBlockResult
  irToCode(request: ProgrammingIRToCodeRequest): string | typeof PROGRAMMING_CODEC_UNHANDLED
  codeToIR: ProgrammingCodeToIRAdapter
}

export function executeProgrammingCodeToIR<Result>(
  source: string,
  parse: (source: string) => Result,
): Result {
  return parse(source)
}

export function createProgrammingFamilyAdapters(
  blockTypes: readonly string[],
): ProgrammingCodecAdapters {
  const ownedBlockTypes = new Set(blockTypes)

  function blockToIR(
    request: ProgrammingBlockToIRExpressionRequest,
  ): ProgrammingBlockToIRExpressionResult
  function blockToIR(
    request: ProgrammingBlockToIRStatementRequest,
  ): ProgrammingBlockToIRStatementResult
  function blockToIR(request: ProgrammingBlockToIRRequest): ProgrammingBlockToIRResult {
    if (!ownedBlockTypes.has(request.block.type)) return PROGRAMMING_CODEC_UNHANDLED
    return request.kind === 'expression'
      ? programmingBlockToExpression(request.block, request.context)
      : programmingBlockToStatement(request.block, request.seen, request.context)
  }

  return Object.freeze({
    blockToIR,
    irToBlock(request: ProgrammingIRToBlockRequest) {
      const result =
        request.kind === 'expression'
          ? programmingExpressionIRToBlock(request.node, request.context)
          : programmingStatementIRToBlock(request.node, request.context)
      if (
        result === PROGRAMMING_IR_TO_BLOCK_UNHANDLED ||
        result === null ||
        ownedBlockTypes.has(result.type)
      ) {
        return result
      }
      return PROGRAMMING_IR_TO_BLOCK_UNHANDLED
    },
    irToCode(request: ProgrammingIRToCodeRequest) {
      if (request.kind === 'expression') {
        if (!isProgrammingExpressionIR(request.node)) return PROGRAMMING_CODEC_UNHANDLED
        return programmingExpressionIRToCode(
          request.node,
          request.parentPrecedence,
          request.identifiers,
          request.mapContext,
          request.context,
        )
      }
      if (!isProgrammingStatementIR(request.node)) return PROGRAMMING_CODEC_UNHANDLED
      return programmingStatementIRToCode(
        request.node,
        request.indent,
        request.identifiers,
        request.mapContext,
        request.context,
      )
    },
    codeToIR: executeProgrammingCodeToIR,
  })
}
