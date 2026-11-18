import { expect, test } from 'bun:test'
import {
  isPintaVersionedKind,
  PINTA_MAP_WRITE_FORMAT_VERSION,
  PINTA_MAX_READ_FORMAT_VERSION,
  pintaCanReadFormatVersion,
  pintaCanWriteNativeSchema,
  pintaWriteFormatVersion,
} from './pinta-format'

test('o rollout só do leitor nunca envia documento 6 declarando nuvem 4', () => {
  expect(pintaCanWriteNativeSchema(6, 4)).toBe(false)
  expect(pintaCanWriteNativeSchema(6, 5)).toBe(true)
  expect(pintaCanWriteNativeSchema(5, 3)).toBe(false)
  expect(pintaCanWriteNativeSchema(5, 4)).toBe(true)
  expect(pintaCanWriteNativeSchema(4, 3)).toBe(true)
  expect(pintaCanWriteNativeSchema(0, 1)).toBe(true)
  for (const schema of [-1, 1.5, NaN, 7]) expect(pintaCanWriteNativeSchema(schema, 5)).toBe(false)
})

test('a versão declarada depende só do tipo do desenho', () => {
  for (const kind of ['tilemap', 'tileset', 'vector-tileset', 'map-set']) {
    expect(isPintaVersionedKind(kind)).toBe(true)
    expect(pintaWriteFormatVersion(kind)).toBe(PINTA_MAP_WRITE_FORMAT_VERSION)
  }
  for (const kind of [
    'sprite',
    'background',
    'vector-background',
    'palette-library',
    'deleted',
    '',
  ])
    expect(pintaWriteFormatVersion(kind)).toBe(1)
})

test('nunca se declara uma versão que este código não lê', () => {
  expect(PINTA_MAP_WRITE_FORMAT_VERSION).toBeLessThanOrEqual(PINTA_MAX_READ_FORMAT_VERSION)
  expect(PINTA_MAP_WRITE_FORMAT_VERSION).toBeGreaterThanOrEqual(1)
})

test('a capacidade 4 protege documentos nativos 5 do cliente completo que declara 3', () => {
  expect(PINTA_MAX_READ_FORMAT_VERSION).toBeGreaterThanOrEqual(4)
  for (const kind of ['tilemap', 'map-set', 'tileset', 'vector-tileset']) {
    expect(pintaWriteFormatVersion(kind)).toBe(4)
    expect(3 >= pintaWriteFormatVersion(kind)).toBe(false)
  }
  expect(pintaCanReadFormatVersion(4)).toBe(true)
  expect(pintaCanReadFormatVersion(PINTA_MAX_READ_FORMAT_VERSION + 1)).toBe(false)
})

test('o gravador completo supera o cliente intermediário que só entende camadas', () => {
  const intermediateMaxRead = 2,
    intermediateWrite = 2
  for (const kind of ['tilemap', 'tileset', 'vector-tileset', 'map-set']) {
    const current = pintaWriteFormatVersion(kind)
    expect(current).toBeGreaterThan(intermediateMaxRead)
    // A reserva/remoção do Members exige declaração >= versão já guardada.
    expect(intermediateWrite >= current).toBe(false)
  }
})

test('item sem versão conta como 1; acima do teto não é lido', () => {
  expect(pintaCanReadFormatVersion(undefined)).toBe(true)
  expect(pintaCanReadFormatVersion(null)).toBe(true)
  expect(pintaCanReadFormatVersion(1)).toBe(true)
  expect(pintaCanReadFormatVersion(PINTA_MAX_READ_FORMAT_VERSION)).toBe(true)
  expect(pintaCanReadFormatVersion(PINTA_MAX_READ_FORMAT_VERSION + 1)).toBe(false)
})

test('os números de hoje estão travados: mudar é seguir o procedimento do pinta-format.ts', () => {
  // Leitura e escrita iguais é o desvio conhecido desta entrega (ver o comentário do arquivo).
  // A escrita nunca pode passar da leitura; a próxima subida é leitura primeiro, escrita depois.
  expect(PINTA_MAX_READ_FORMAT_VERSION).toBeGreaterThanOrEqual(PINTA_MAP_WRITE_FORMAT_VERSION)
  expect({
    leitura: PINTA_MAX_READ_FORMAT_VERSION as number,
    escrita: PINTA_MAP_WRITE_FORMAT_VERSION as number,
  }).toEqual({ leitura: 5, escrita: 4 })
  expect(pintaCanReadFormatVersion(PINTA_MAP_WRITE_FORMAT_VERSION)).toBe(true)
})
