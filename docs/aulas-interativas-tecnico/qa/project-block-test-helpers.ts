import type { Block } from './corre-dino-projetos-qa'

/** Visits authored fixture blocks; grading remains in the canonical evaluator. */
export function fixtureBlocks(value: unknown): Block[] {
  if (Array.isArray(value)) return value.flatMap(fixtureBlocks)
  if (!value || typeof value !== 'object') return []
  const node = value as Record<string, unknown>
  return [
    ...(typeof node.type === 'string' ? [value as Block] : []),
    ...Object.values(node).flatMap(fixtureBlocks),
  ]
}

export function setFixtureLiteral(block: Block, name: string, value: number | string) {
  const input = block.inputs?.[name]
  const literal = input?.block ?? input?.shadow
  if (!literal || !['sz_val_number', 'sz_val_text'].includes(literal.type))
    throw new Error(`Authored ${block.type}/${name} literal missing`)
  literal.fields = { ...literal.fields, [typeof value === 'number' ? 'NUM' : 'TEXT']: value }
}

export function fixtureBlock(value: unknown, type: string): Block {
  const block = fixtureBlocks(value).find((block) => block.type === type)
  if (!block) throw new Error(`Authored ${type} block missing`)
  return block
}
