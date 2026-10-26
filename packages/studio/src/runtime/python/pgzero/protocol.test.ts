import { expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { PGZERO_OP, PGZERO_OP_ARITY } from './protocol'

test('Pygame Zero shapes and Pygame-ce pixels have distinct wire commands', async () => {
  const values = Object.values(PGZERO_OP)
  expect(new Set(values).size).toBe(values.length)
  const python = await readFile(new URL('./py/pgzero/_sz.py', import.meta.url), 'utf8')
  const emitted = Object.fromEntries(
    [...python.matchAll(/^OP_(\w+) = (\d+)$/gm)].map(([, name, opcode]) => [name, Number(opcode)]),
  )
  expect(emitted).toEqual(PGZERO_OP)
  for (const opcode of values) {
    // Polygons carry their own point count; every other command has a fixed arity.
    if (opcode !== PGZERO_OP.POLY) expect(PGZERO_OP_ARITY[opcode]).toBeGreaterThan(0)
  }
})
