import type { PythonBlockShape } from './contract'

/**
 * Most items a repeated socket holds: list, tuple, set and dict literals, call values and
 * other "Adicionar ..." counts. Games keep data tables (levels, tiles, animations) far longer
 * than a hand-built list; every lookup over these items is by name (a Map), never a scan per
 * item, so a full block stays linear.
 */
export const PYTHON_MAX_ITEMS = 512

/** Resize the repeated fields/inputs from an explicit prototype, retaining existing values. */
export function resizePythonShape(
  shape: PythonBlockShape,
  key: string,
  size: number,
  prototype: PythonBlockShape,
  prefixes?: readonly string[],
): PythonBlockShape {
  if (!Number.isSafeInteger(size) || size < 0 || size > PYTHON_MAX_ITEMS)
    throw new Error(`Use de zero a ${PYTHON_MAX_ITEMS} itens.`)
  const next = structuredClone(shape)
  next.extra = { ...next.extra, [key]: size }
  const matches = (name: string) =>
    /:\d+$/.test(name) && (!prefixes || prefixes.some((prefix) => name.startsWith(`${prefix}:`)))
  const fields = prototype.fields.filter(
    (field) => matches(field.name) && field.name.endsWith(':0'),
  )
  const inputs = prototype.inputs.filter(
    (input) => matches(input.name) && input.name.endsWith(':0'),
  )
  const oldFields = new Map(next.fields.map((field) => [field.name, field]))
  const oldInputs = new Map(next.inputs.map((input) => [input.name, input]))
  next.fields = next.fields.filter((field) => !matches(field.name))
  next.inputs = next.inputs.filter((input) => !matches(input.name))
  for (let index = 0; index < size; index++) {
    for (const field of fields) {
      const name = field.name.replace(/:0$/, `:${index}`)
      next.fields.push(oldFields.get(name) ?? { ...structuredClone(field), name })
    }
    for (const input of inputs) {
      const name = input.name.replace(/:0$/, `:${index}`)
      next.inputs.push(
        oldInputs.get(name) ?? {
          ...structuredClone(input),
          name,
          label: input.label.replace(/ 1$/, ` ${index + 1}`),
        },
      )
    }
  }
  return next
}

/** Inputs by name, for codecs that read many numbered sockets. */
export function pythonInputsByName(shape: PythonBlockShape) {
  return new Map(shape.inputs.map((input) => [input.name, input]))
}

/**
 * Most named fields and sockets one block may carry: a dict of PYTHON_MAX_ITEMS pairs has two
 * sockets per entry, plus room for the block's own parts. The Blockly layer refuses anything
 * larger, so projection keeps a larger node as its exact Python text instead of a block that
 * could never load.
 */
export const PYTHON_MAX_BLOCK_FIELDS = PYTHON_MAX_ITEMS + 64
export const PYTHON_MAX_BLOCK_INPUTS = 2 * PYTHON_MAX_ITEMS + 64
export function pythonShapeFitsBlock(shape: { fields: unknown[]; inputs: unknown[] }) {
  return (
    shape.fields.length <= PYTHON_MAX_BLOCK_FIELDS && shape.inputs.length <= PYTHON_MAX_BLOCK_INPUTS
  )
}
