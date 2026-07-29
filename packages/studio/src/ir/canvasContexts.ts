import { boundCanvasContextsForChild } from './programmingExecution'
import type { JSStatement } from './schema'

export interface CanvasContextSetupSymbol {
  name: string
  canvasId: string
  blockId?: string
}

export interface CanvasContextUseSymbol {
  name: string
  nodeType: string
  blockId?: string
}

export interface CanvasContextSymbols {
  setups: CanvasContextSetupSymbol[]
  uses: CanvasContextUseSymbol[]
}

/**
 * Pincéis ENTREGUES PRONTOS pelo runtime de uma extensão (globais preguiçosos):
 * o Jogo 2D define `ctx` no boot (runtime/stage.ts, `defineLazyGlobal`) —
 * justamente para os blocos não precisarem mostrar "o pincel". O diagnóstico e a
 * validação de referências tratam esses nomes como preparados quando a extensão
 * está instalada — sem isso, bloco de Canvas do núcleo num jogo 2D acusava
 * "pincel não preparado" apesar de funcionar (feedback 25/07).
 */
export const RUNTIME_PROVIDED_CANVAS_CONTEXTS: Readonly<Record<string, readonly string[]>> = {
  'game-2d': ['ctx'],
}

/** Une os pincéis prontos das extensões INSTALADAS (`ir.extensions`). */
export function runtimeProvidedCanvasContexts(
  extensions: ReadonlyArray<{ extensionId: string }> | undefined,
): Set<string> {
  const provided = new Set<string>()
  for (const extension of extensions ?? []) {
    for (const name of RUNTIME_PROVIDED_CANVAS_CONTEXTS[extension.extensionId] ?? []) {
      provided.add(name)
    }
  }
  return provided
}

export interface CanvasNumericIssue {
  blockId?: string
  nodeType: string
  field: string
  label: string
  value: number
}

const NO_BOUND_CONTEXTS: ReadonlySet<string> = new Set()

function visitCanvasRecords(
  statements: JSStatement[],
  visitor: (
    record: Record<string, unknown>,
    blockId: string | undefined,
    boundContexts: ReadonlySet<string>,
  ) => void,
): void {
  const visited = new WeakSet<object>()
  const visit = (
    value: unknown,
    ownerBlockId: string | undefined,
    boundContexts: ReadonlySet<string>,
  ): void => {
    if (Array.isArray(value)) {
      for (const child of value) visit(child, ownerBlockId, boundContexts)
      return
    }
    if (!value || typeof value !== 'object' || visited.has(value)) return
    visited.add(value)

    const record = value as Record<string, unknown>
    const blockId = typeof record.__id === 'string' ? record.__id : ownerBlockId
    visitor(record, blockId, boundContexts)
    for (const [key, child] of Object.entries(record)) {
      if (key === '__id') continue
      // Corpo que LIGA um pincel como parâmetro (figura do Jogo 2D, desenhar do
      // Jogo 2D Avançado): dentro dele o nome está em escopo — não é "uso órfão".
      const locals = boundCanvasContextsForChild(record as unknown as JSStatement, key)
      const childBound = locals.length > 0 ? new Set([...boundContexts, ...locals]) : boundContexts
      visit(child, blockId, childBound)
    }
  }

  visit(statements, undefined, NO_BOUND_CONTEXTS)
}

/**
 * Fonte comum das dependências de pincel da IR Canvas. A análise percorre
 * statements e expressões, propagando o id do bloco pai quando um valor não tem
 * id próprio. Assim novos consumidores que seguem o contrato `canvas* + ctxVar`
 * entram automaticamente no diagnóstico sem manter outra lista paralela.
 */
export function collectCanvasContextSymbols(statements: JSStatement[]): CanvasContextSymbols {
  const setups: CanvasContextSetupSymbol[] = []
  const uses: CanvasContextUseSymbol[] = []
  visitCanvasRecords(statements, (record, blockId, boundContexts) => {
    const nodeType = typeof record.type === 'string' ? record.type : ''

    if (
      nodeType === 'canvasSetup' &&
      typeof record.varName === 'string' &&
      typeof record.canvasId === 'string'
    ) {
      setups.push({ name: record.varName.trim(), canvasId: record.canvasId, blockId })
    } else if (
      nodeType.startsWith('canvas') &&
      typeof record.ctxVar === 'string' &&
      record.ctxVar.trim().length > 0
    ) {
      const name = record.ctxVar.trim()
      // Pincel ligado pelo corpo (parâmetro) não é uso órfão — o runtime entrega.
      if (!boundContexts.has(name)) uses.push({ name, nodeType, blockId })
    }
  })
  return { setups, uses }
}

const NON_NEGATIVE_CANVAS_FIELDS: Readonly<
  Record<string, ReadonlyArray<readonly [field: string, label: string]>>
> = {
  canvasArc: [['r', 'raio']],
  canvasRoundRect: [['r', 'raio dos cantos']],
  canvasEllipse: [
    ['rx', 'raio horizontal'],
    ['ry', 'raio vertical'],
  ],
  canvasArcSlice: [['r', 'raio']],
  canvasArcTo: [['r', 'raio']],
  canvasLineDash: [['segment', 'tamanho do tracejado']],
}

/**
 * Encontra apenas números literais inválidos. Expressões dinâmicas continuam
 * válidas e, se produzirem um raio negativo em execução, recebem o glossário
 * amigável do console sem alterar o JavaScript gerado ou o round-trip.
 */
export function collectCanvasNumericIssues(statements: JSStatement[]): CanvasNumericIssue[] {
  const issues: CanvasNumericIssue[] = []
  visitCanvasRecords(statements, (record, blockId) => {
    const nodeType = typeof record.type === 'string' ? record.type : ''
    for (const [field, label] of NON_NEGATIVE_CANVAS_FIELDS[nodeType] ?? []) {
      const expression = record[field]
      if (!expression || typeof expression !== 'object') continue
      const literal = expression as Record<string, unknown>
      if (literal.type !== 'num' || typeof literal.value !== 'number' || literal.value >= 0)
        continue
      issues.push({ blockId, nodeType, field, label, value: literal.value })
    }
  })
  return issues
}
