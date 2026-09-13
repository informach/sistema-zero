import { isDocumentRecord } from '../core/projectDocument'

type Argument = {
  field: string
  ir: string
  kind: 'number' | 'text' | 'variable'
  fallback: string | number
}
type Rule = { block: string; ir: string; method: string; args: readonly Argument[] }

/** Estas operações públicas continuam úteis; só as definições históricas são retiradas. */
const RULES: readonly Rule[] = [
  {
    block: 'sz_g2d_camera_follow',
    ir: 'g2d:cameraFollow',
    method: 'cameraFollow',
    args: [
      { field: 'SPRITE', ir: 'spriteVar', kind: 'variable', fallback: 'jogador' },
      { field: 'WORLDW', ir: 'worldW', kind: 'number', fallback: 800 },
      { field: 'WORLDH', ir: 'worldH', kind: 'number', fallback: 600 },
    ],
  },
  {
    block: 'sz_g2d_set_camera',
    ir: 'g2d:setCamera',
    method: 'setCamera',
    args: [
      { field: 'X', ir: 'x', kind: 'number', fallback: 0 },
      { field: 'Y', ir: 'y', kind: 'number', fallback: 0 },
    ],
  },
  {
    block: 'sz_g2d_draw_hearts',
    ir: 'g2d:drawHearts',
    method: 'drawHearts',
    args: [
      { field: '', ir: 'ctxVar', kind: 'variable', fallback: 'ctx' },
      { field: 'COUNT', ir: 'count', kind: 'number', fallback: 3 },
      { field: 'X', ir: 'x', kind: 'number', fallback: 10 },
      { field: 'Y', ir: 'y', kind: 'number', fallback: 10 },
      { field: 'SIZE', ir: 'size', kind: 'number', fallback: 22 },
      { field: 'COLOR', ir: 'color', kind: 'text', fallback: '#ff5d5d' },
    ],
  },
]

export function migrateCameraHudBlock(node: Record<string, unknown>): boolean {
  const rule = RULES.find((rule) => rule.block === node.type)
  if (!rule) return false
  const fields = isDocumentRecord(node.fields) ? node.fields : {}
  const oldInputs = isDocumentRecord(node.inputs) ? node.inputs : {}
  const inputs: Record<string, unknown> = {
    OBJ: { block: { type: 'sz_val_variable', fields: { NAME: 'SZGame2D' } } },
  }
  rule.args.forEach((arg, index) => {
    const value = fields[arg.field] ?? arg.fallback
    inputs[`ARG${index}`] =
      arg.kind === 'number'
        ? (oldInputs[arg.field] ?? { shadow: { type: 'sz_val_number', fields: { NUM: value } } })
        : arg.kind === 'text'
          ? { shadow: { type: 'sz_val_text', fields: { TEXT: value } } }
          : { block: { type: 'sz_val_variable', fields: { NAME: value } } }
  })
  node.type = 'sz_js_method_on'
  node.fields = { METHOD: rule.method }
  node.extraState = { items: rule.args.length }
  node.inputs = inputs
  return true
}

export function migrateCameraHudIR(
  node: Record<string, unknown>,
): Record<string, unknown> | undefined {
  const rule = RULES.find((rule) => rule.ir === node.type)
  if (!rule) return
  const result = { ...node }
  for (const arg of rule.args) delete result[arg.ir]
  return {
    ...result,
    type: 'memberCall',
    object: { type: 'var', name: 'SZGame2D' },
    method: rule.method,
    args: rule.args.map((arg) => {
      const value = node[arg.ir]
      if (arg.kind === 'variable') return { type: 'var', name: value }
      if (arg.kind === 'text') return { type: 'str', value }
      return typeof value === 'number' ? { type: 'num', value } : value
    }),
  }
}

export function cameraHudTools(type: string): string[] | undefined {
  if (RULES.some((rule) => rule.block === type))
    return ['sz_js_method_on', 'sz_val_variable', 'sz_val_number', 'sz_val_text']
}
