import { expect, test } from 'bun:test'
import reference from '../../../runtime/python/raylib/api-reference.json'
import { PYTHON_RAYLIB_2D_CODECS } from '../raylib2d/catalog'
import { PYTHON_RAYLIB_3D_CODECS } from '../raylib3d/catalog'

type Reference = { functions: Record<string, { params: [string, string][] }> }
const functions = (reference as unknown as Reference).functions

/**
 * pyray renames a parameter that is a Python builtin or keyword (`min` → `min_1`, `from` →
 * `from_0`). The parameters are positional, so the block shows the plain name.
 */
const plain = (name: string) => name.replace(/^(min|max|from|list)_\d+$/, '$1')

/** A block that calls a pyray function: `draw_circle(centerX, centerY, radius, color)`. */
const CALL = /^([a-z_0-9]+)\(([^)]*)\)$/

for (const [label, codecs] of [
  ['Raylib 2D', PYTHON_RAYLIB_2D_CODECS],
  ['Raylib 3D', PYTHON_RAYLIB_3D_CODECS],
] as const)
  test(`${label}: cada bloco de função chama o nome e a lista de parâmetros do raylib 6.0.1.0`, () => {
    const calls = codecs.flatMap((codec) => {
      const match = typeof codec.api === 'string' ? CALL.exec(codec.api) : null
      return match ? [{ id: codec.id, fn: match[1]!, params: match[2]! }] : []
    })
    // Anti-vácuo: o catálogo tem mais de cem blocos de função.
    expect(calls.length).toBeGreaterThan(100)
    const wrong = calls.flatMap(({ id, fn, params }) => {
      const real = functions[fn]
      if (!real) return [`${id}: ${fn} não existe no pyray`]
      const expected = real.params.map(([name]) => plain(name)).join(', ')
      return params === expected ? [] : [`${id}: ${fn}(${params}) — o real é ${fn}(${expected})`]
    })
    expect(wrong).toEqual([])
  })

test('a régua morde: um parâmetro trocado aparece', () => {
  const real = functions.draw_circle!.params.map(([name]) => name).join(', ')
  expect(real).toBe('centerX, centerY, radius, color')
  expect('centerX, centerY, raio, color').not.toBe(real)
})
