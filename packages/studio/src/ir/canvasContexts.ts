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

export interface CanvasNumericIssue {
  blockId?: string
  nodeType: string
  field: string
  label: string
  value: number
}

function visitCanvasRecords(
  statements: JSStatement[],
  visitor: (record: Record<string, unknown>, blockId: string | undefined) => void,
): void {
  const visited = new WeakSet<object>()
  const visit = (value: unknown, ownerBlockId?: string): void => {
    if (Array.isArray(value)) {
      for (const child of value) visit(child, ownerBlockId)
      return
    }
    if (!value || typeof value !== 'object' || visited.has(value)) return
    visited.add(value)

    const record = value as Record<string, unknown>
    const blockId = typeof record.__id === 'string' ? record.__id : ownerBlockId
    visitor(record, blockId)
    for (const [key, child] of Object.entries(record)) {
      if (key !== '__id') visit(child, blockId)
    }
  }

  visit(statements)
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
  visitCanvasRecords(statements, (record, blockId) => {
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
      uses.push({ name: record.ctxVar.trim(), nodeType, blockId })
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
