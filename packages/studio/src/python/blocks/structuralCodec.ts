import type { PythonNode, PythonValue } from '../language/types'
import type { PythonBlockCodec, PythonBlockRole, PythonBlockShape } from './contract'
import { isNode, node, nodes } from './nodes'
import { pythonPlaceholderNode } from './placeholders'
import { samePythonValue } from './semantic'
import { PYTHON_MAX_ITEMS, pythonInputsByName, resizePythonShape } from './shapeControls'

export interface StructuralSlot {
  field: string
  label: string
  role: PythonBlockRole
  kind: 'node' | 'list' | 'body' | 'text'
  optional?: boolean
  minimum?: number
  /** A required Python suite cannot be empty; pass is a visible, portable no-op. */
  empty?: 'pass'
}
/** Shared mechanics; each codec still declares its full Python syntax and defaults. */
export function structuralCodec(
  options: Omit<PythonBlockCodec, 'decode' | 'encode'> & {
    slots: StructuralSlot[]
    accepts?(value: PythonNode): boolean
    contexts?: readonly ('Load' | 'Store' | 'Del')[]
  },
): PythonBlockCodec {
  const { slots, accepts, contexts, ...metadata } = options
  const handled = new Set(slots.map((slot) => slot.field))
  // Decoding only reads the template; encoding builds from a fresh default node.
  let template: PythonNode | undefined
  const templateFields = () => {
    template ??= metadata.defaultNode()
    return template
  }
  return {
    ...metadata,
    help: slots.some((slot) => slot.empty === 'pass')
      ? `${metadata.help} Um corpo vazio usa pass (não fazer nada).`
      : metadata.help,
    controls: slots.flatMap<NonNullable<PythonBlockCodec['controls']>[number]>((slot) =>
      slot.optional
        ? [{ key: `${slot.field}:present`, label: slot.label, kind: 'optional' as const }]
        : slot.kind === 'list'
          ? [
              {
                key: `${slot.field}:count`,
                label: slot.label,
                kind: 'count' as const,
                minimum: slot.minimum ?? 0,
                maximum: PYTHON_MAX_ITEMS,
              },
            ]
          : [],
    ),
    reshape(shape, key, value) {
      const slot = slots.find(
        (slot) =>
          key === `${slot.field}:${slot.optional ? 'present' : 'count'}` &&
          (slot.optional || slot.kind === 'list'),
      )
      if (!slot) throw new Error('Opção desconhecida do bloco Python.')
      if (shape.extra?.[key] === value) return structuredClone(shape)
      if (slot.kind === 'list' && !slot.optional) {
        if (typeof value !== 'number' || value < (slot.minimum ?? 0))
          throw new Error('Quantidade de itens inválida.')
        return resizePythonShape(
          shape,
          key,
          value,
          {
            fields: [],
            inputs: [
              {
                name: `${slot.field}:0`,
                label: `${slot.label} 1`,
                role: slot.role,
                nodes: [pythonPlaceholderNode(slot.role)],
              },
            ],
          },
          [slot.field],
        )
      }
      if (typeof value !== 'boolean') throw new Error('Opção inválida do bloco Python.')
      const result = structuredClone(shape)
      result.extra = { ...result.extra, [key]: value }
      result.fields = result.fields.filter((field) => field.name !== slot.field)
      result.inputs = result.inputs.filter((input) => input.name !== slot.field)
      if (value) {
        if (slot.kind === 'text')
          result.fields.push({ name: slot.field, label: slot.label, value: 'valor' })
        else if (slot.kind === 'body')
          result.inputs.push({ name: slot.field, label: slot.label, role: 'statement', nodes: [] })
        else
          result.inputs.push({
            name: slot.field,
            label: slot.label,
            role: slot.role,
            nodes: [pythonPlaceholderNode(slot.role)],
          })
      }
      return result
    },
    decode(value) {
      const template = templateFields()
      if (
        value.kind !== template.kind ||
        (accepts && !accepts(value)) ||
        Object.keys(value.fields).length !== Object.keys(template.fields).length
      )
        return
      for (const [key, expected] of Object.entries(template.fields)) {
        if (!Object.hasOwn(value.fields, key)) return
        if (key === 'ctx' && contexts) {
          const context = value.fields.ctx
          if (!isNode(context) || !contexts.some((kind) => kind === context.kind)) return
          continue
        }
        if (!handled.has(key) && !samePythonValue(value.fields[key], expected)) return
      }
      const shape: PythonBlockShape = { fields: [], inputs: [], extra: {} }
      if (contexts && isNode(value.fields.ctx)) shape.extra!.context = value.fields.ctx.kind
      for (const slot of slots) {
        const child = value.fields[slot.field]
        if (slot.optional) {
          // An optional suite (else/finally) is absent when empty; other slots when None.
          const present = slot.kind === 'body' ? nodes(child) && child.length > 0 : child !== null
          shape.extra![`${slot.field}:present`] = present
          if (!present) continue
        }
        if (slot.kind === 'text') {
          if (typeof child !== 'string') return
          shape.fields.push({ name: slot.field, label: slot.label, value: child })
        } else if (slot.kind === 'node') {
          if (!isNode(child)) return
          shape.inputs.push({
            name: slot.field,
            label: slot.label,
            role: slot.role,
            nodes: [child],
          })
        } else {
          if (!nodes(child) || child.length > (slot.kind === 'list' ? PYTHON_MAX_ITEMS : 10000))
            return
          if (slot.kind === 'body')
            shape.inputs.push({
              name: slot.field,
              label: slot.label,
              role: slot.role,
              nodes: child,
            })
          else {
            shape.extra![`${slot.field}:count`] = child.length
            child.forEach((item, index) => {
              shape.inputs.push({
                name: `${slot.field}:${index}`,
                label: `${slot.label} ${index + 1}`,
                role: slot.role,
                nodes: [item],
              })
            })
          }
        }
      }
      return shape
    },
    encode(shape) {
      const template = metadata.defaultNode()
      const fields: Record<string, PythonValue> = { ...template.fields }
      if (contexts) {
        const context = shape.extra?.context
        if (!contexts.some((kind) => kind === context)) throw new Error('Destino Python inválido.')
        fields.ctx = node(String(context))
      }
      const inputs = pythonInputsByName(shape)
      for (const slot of slots) {
        if (slot.optional) {
          const present = shape.extra?.[`${slot.field}:present`]
          if (typeof present !== 'boolean') throw new Error('Opção do bloco Python inválida.')
          if (!present) {
            fields[slot.field] = slot.kind === 'body' ? [] : null
            continue
          }
        }
        if (slot.kind === 'text') {
          const value = shape.fields.find((item) => item.name === slot.field)
          if (!value) throw new Error('Preencha o texto do bloco Python.')
          fields[slot.field] = value.value
        } else if (slot.kind === 'body') {
          const value = inputs.get(slot.field)
          if (!value || value.nodes.length > 10000)
            throw new Error('Corpo do bloco Python inválido.')
          fields[slot.field] =
            value.nodes.length || (slot.empty !== 'pass' && !slot.optional)
              ? value.nodes
              : [node('Pass')]
        } else {
          const count = slot.kind === 'node' ? 1 : shape.extra?.[`${slot.field}:count`]
          if (
            typeof count !== 'number' ||
            !Number.isSafeInteger(count) ||
            count < 0 ||
            count > PYTHON_MAX_ITEMS
          )
            throw new Error('Quantidade de itens inválida.')
          const values: PythonNode[] = []
          for (let index = 0; index < count; index++) {
            const key = slot.kind === 'node' ? slot.field : `${slot.field}:${index}`
            const value = inputs.get(key)
            if (value?.nodes.length !== 1) throw new Error('Preencha o valor do bloco Python.')
            values.push(value.nodes[0]!)
          }
          fields[slot.field] = slot.kind === 'node' ? values[0]! : values
        }
      }
      const result = node(template.kind, fields)
      if (accepts && !accepts(result))
        throw new Error('A combinação de entradas do bloco Python não é válida.')
      return result
    },
  }
}
