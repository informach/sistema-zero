import type { PythonBlockShape } from './contract'

/** Resize the repeated fields/inputs from an explicit prototype, retaining existing values. */
export function resizePythonShape(
  shape: PythonBlockShape,
  key: string,
  size: number,
  prototype: PythonBlockShape,
  prefixes?: readonly string[],
): PythonBlockShape {
  if (!Number.isSafeInteger(size) || size < 0 || size > 32)
    throw new Error('Use de zero a 32 itens.')
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
  next.fields = next.fields.filter((field) => !matches(field.name))
  next.inputs = next.inputs.filter((input) => !matches(input.name))
  for (let index = 0; index < size; index++) {
    for (const field of fields) {
      const name = field.name.replace(/:0$/, `:${index}`)
      next.fields.push(
        structuredClone(shape.fields.find((entry) => entry.name === name) ?? { ...field, name }),
      )
    }
    for (const input of inputs) {
      const name = input.name.replace(/:0$/, `:${index}`)
      next.inputs.push(
        structuredClone(
          shape.inputs.find((entry) => entry.name === name) ?? {
            ...input,
            name,
            label: input.label.replace(/ 1$/, ` ${index + 1}`),
          },
        ),
      )
    }
  }
  return next
}
