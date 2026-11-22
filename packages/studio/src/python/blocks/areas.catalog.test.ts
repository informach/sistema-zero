/**
 * As regras das áreas citam blocos pelo id: um id errado (ou um bloco renomeado) faria a regra
 * calar sem erro nenhum. Toda lista de `areas.ts` só pode citar blocos que existem.
 */
import { expect, test } from 'bun:test'
import { PYTHON_PGZERO_CODECS } from '../extensions/pgzero/catalog'
import { PYTHON_PYGAME_CODECS } from '../extensions/pygame/catalog'
import { PYTHON_RAYLIB_2D_CODECS } from '../extensions/raylib2d/catalog'
import { PYTHON_RAYLIB_3D_CODECS } from '../extensions/raylib3d/catalog'
import { PYTHON_TURTLE_CODECS } from '../extensions/turtle/catalog'
import * as areas from './areas'
import { PYTHON_PROGRAMMING_CODECS } from './catalog'

test('toda lista de blocos das áreas cita só blocos que existem', () => {
  const known = new Set(
    [
      ...PYTHON_PROGRAMMING_CODECS,
      ...PYTHON_TURTLE_CODECS,
      ...PYTHON_PGZERO_CODECS,
      ...PYTHON_PYGAME_CODECS,
      ...PYTHON_RAYLIB_2D_CODECS,
      ...PYTHON_RAYLIB_3D_CODECS,
    ].map((codec) => codec.id),
  )
  const cited: string[] = []
  for (const value of Object.values(areas))
    if (value instanceof Set)
      for (const id of value)
        if (typeof id === 'string' && id.startsWith('sz_py_') && !id.startsWith('sz_py_area_'))
          cited.push(id)
  // Anti-vácuo: as listas exportadas existem e não estão vazias.
  expect(cited.length).toBeGreaterThan(20)
  // O "repetir a cada" do Turtle entra junto com a requalificação dos exemplos do Turtle (o
  // catálogo novo muda o recibo deles). Quando entrar, esta linha reprova: tire a exceção.
  expect(known.has(areas.PYTHON_TURTLE_REPEAT_CODEC)).toBe(false)
  const pending = new Set([areas.PYTHON_TURTLE_REPEAT_CODEC])
  expect(cited.filter((id) => !known.has(id) && !pending.has(id))).toEqual([])
})
