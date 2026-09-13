import { isDocumentRecord } from '../core/projectDocument'
import type { MigrationChange } from './types'

const PARAMS = ['pincel', 'mapa', 'deslocamentoX', 'deslocamentoY', 'tamanho']
const variable = (name: unknown) => ({ type: 'var', name })
const inputVariable = (name: unknown) => ({
  block: { type: 'sz_val_variable', fields: { NAME: name } },
})
const literal = (value: unknown) => (typeof value === 'number' ? { type: 'num', value } : value)

/** Uma função editável captura todos os argumentos uma única vez, no ponto do desenho. */
export function migrateTileMaps(
  document: Record<string, unknown>,
  changes: MigrationChange[],
): void {
  const occupied = JSON.stringify(document)
  let name = 'desenharMapaCentralizado'
  for (let index = 2; occupied.includes(name); index++) name = `desenharMapaCentralizado${index}`
  const ir = isDocumentRecord(document.ir) ? document.ir : null
  let irChanged = false
  const pending: unknown[] = [ir]
  while (pending.length) {
    const node = pending.pop()
    if (Array.isArray(node)) {
      pending.push(...node)
      continue
    }
    if (!isDocumentRecord(node)) continue
    if (node.type === 'g2d:drawTileMap') {
      const args = [
        variable(node.ctxVar ?? 'ctx'),
        variable(node.mapVar),
        literal(node.x),
        literal(node.y),
        literal(node.size ?? 0),
      ]
      for (const key of ['ctxVar', 'mapVar', 'x', 'y', 'size']) delete node[key]
      Object.assign(node, { type: 'callFunction', name, args })
      irChanged = true
    } else if (
      node.type === 'memberCall' &&
      isDocumentRecord(node.object) &&
      node.object.type === 'var' &&
      node.object.name === 'SZGame2D' &&
      node.method === 'drawTileMap' &&
      Array.isArray(node.args) &&
      node.args.length > 2
    ) {
      delete node.object
      delete node.method
      Object.assign(node, { type: 'callFunction', name })
      irChanged = true
    }
    pending.push(...Object.values(node))
  }
  if (ir && irChanged) {
    const method = (method: string, args: string[]) => ({
      type: 'memberCall',
      object: variable('SZGame2D'),
      method,
      args: args.map(variable),
    })
    const helper = {
      type: 'funcDecl',
      name,
      params: PARAMS,
      body: [method('centerTileMap', PARAMS), method('drawTileMap', PARAMS.slice(0, 2))],
    }
    if (isDocumentRecord(ir.behavior)) {
      if (!Array.isArray(ir.behavior.molds)) ir.behavior.molds = []
      if (Array.isArray(ir.behavior.molds)) ir.behavior.molds.push(helper)
    } else if (Array.isArray(ir.js)) ir.js.unshift(helper)
    changes.push({ rule: 'g2d.explicit-map-layout', path: '$.ir' })
  }
  const state = isDocumentRecord(document.blocksState) ? document.blocksState : null
  if (!state || !isDocumentRecord(state.blocks) || !Array.isArray(state.blocks.blocks)) return
  const tops = state.blocks.blocks
  const blocks: unknown[] = [...tops]
  let changed = false
  while (blocks.length) {
    const node = blocks.pop()
    if (!isDocumentRecord(node)) continue
    const fields = isDocumentRecord(node.fields) ? node.fields : {}
    const inputs = isDocumentRecord(node.inputs) ? node.inputs : {}
    const obj = isDocumentRecord(inputs.OBJ) ? inputs.OBJ.block : null
    let args: unknown[] | undefined
    if (node.type === 'sz_g2d_draw_tilemap')
      args = [
        inputVariable('ctx'),
        inputVariable(fields.MAP ?? 'mapa'),
        ...['X', 'Y', 'SIZE'].map(
          (key) =>
            inputs[key] ?? { shadow: { type: 'sz_val_number', fields: { NUM: fields[key] ?? 0 } } },
        ),
      ]
    else if (
      node.type === 'sz_js_method_on' &&
      fields.METHOD === 'drawTileMap' &&
      isDocumentRecord(obj) &&
      obj.type === 'sz_val_variable' &&
      isDocumentRecord(obj.fields) &&
      obj.fields.NAME === 'SZGame2D' &&
      isDocumentRecord(node.extraState) &&
      typeof node.extraState.items === 'number' &&
      node.extraState.items > 2
    )
      args = Array.from({ length: node.extraState.items }, (_, i) => inputs[`ARG${i}`])
    if (args) {
      Object.assign(node, {
        type: 'sz_js_call_function',
        fields: { NAME: name },
        extraState: { items: args.length },
        inputs: Object.fromEntries(args.map((arg, i) => [`ARG${i}`, arg])),
      })
      changed = true
    }
    if (isDocumentRecord(node.next)) blocks.push(node.next.block)
    if (isDocumentRecord(node.inputs))
      for (const value of Object.values(node.inputs))
        if (isDocumentRecord(value)) blocks.push(value.block, value.shadow)
  }
  if (!changed) return
  const call = (method: string, params: string[]) => ({
    type: 'sz_js_method_on',
    fields: { METHOD: method },
    extraState: { items: params.length },
    inputs: {
      OBJ: inputVariable('SZGame2D'),
      ...Object.fromEntries(
        params.map((param, index) => [
          `ARG${index}`,
          { block: { type: 'sz_val_arg', fields: { NAME: param } } },
        ]),
      ),
    },
  })
  const helper = {
    type: 'sz_js_function',
    fields: { NAME: name },
    extraState: { params: PARAMS.map((name, index) => ({ name, id: `p${index}` })) },
    inputs: {
      BODY: {
        block: {
          ...call('centerTileMap', PARAMS),
          next: { block: call('drawTileMap', PARAMS.slice(0, 2)) },
        },
      },
    },
  }
  const frame = tops.find((node) => isDocumentRecord(node) && node.type === 'sz_frame_molds')
  if (isDocumentRecord(frame)) {
    if (!isDocumentRecord(frame.inputs)) frame.inputs = {}
    const inputs = frame.inputs as Record<string, unknown>
    const children = isDocumentRecord(inputs.CHILDREN) ? inputs.CHILDREN : {}
    inputs.CHILDREN = children
    if (!isDocumentRecord(children.block)) children.block = helper
    else {
      let tail = children.block
      while (isDocumentRecord(tail.next) && isDocumentRecord(tail.next.block))
        tail = tail.next.block
      tail.next = { block: helper }
    }
  } else tops.push({ type: 'sz_frame_molds', inputs: { CHILDREN: { block: helper } } })
  changes.push({ rule: 'g2d.explicit-map-layout', path: '$.blocksState' })
}
