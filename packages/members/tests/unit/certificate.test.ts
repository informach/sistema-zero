import { describe, expect, test } from 'bun:test'
import {
  eligibleForCertificate,
  generateSerial,
  precedingPublishedLessonIds,
  SERIAL_RE,
} from '../../src/domain/certificate/certificate'

describe('precedingPublishedLessonIds', () => {
  test('só as aulas ANTES do certificado (ordem do curso); as de depois ficam de fora', () => {
    expect(precedingPublishedLessonIds(['a', 'b', 'cert', 'c', 'd'], 'cert')).toEqual(['a', 'b'])
  })
  test('certificado na 1ª aula → nenhuma anterior', () => {
    expect(precedingPublishedLessonIds(['cert', 'a'], 'cert')).toEqual([])
  })
  test('aula do certificado não encontrada → fallback conservador "todas as outras"', () => {
    expect(precedingPublishedLessonIds(['a', 'b'], 'cert')).toEqual(['a', 'b'])
  })
})

describe('eligibleForCertificate', () => {
  test('elegível quando todas as aulas ANTERIORES estão concluídas', () => {
    expect(eligibleForCertificate(['a', 'b'], ['a', 'b'])).toBe(true)
  })
  test('não elegível com aula anterior pendente', () => {
    expect(eligibleForCertificate(['a', 'b'], ['a'])).toBe(false)
  })
  test('aulas DEPOIS do certificado não entram (o caller já as removeu)', () => {
    // O caller passa SÓ as anteriores; concluir as posteriores é irrelevante.
    expect(eligibleForCertificate(['a'], ['a', 'qualquer-posterior'])).toBe(true)
  })
  test('sem aula anterior (certificado na 1ª aula) NÃO é elegível (certifica zero trabalho)', () => {
    expect(eligibleForCertificate([], [])).toBe(false)
  })
})

describe('generateSerial', () => {
  test('formato SZ-<ano>-XXXXXXXXXXXXXXXX, com o ano da emissão', () => {
    const serial = generateSerial(new Date('2026-06-23T00:00:00.000Z'))
    expect(serial).toMatch(SERIAL_RE)
    expect(serial.startsWith('SZ-2026-')).toBe(true)
  })
  test('séries diferentes a cada chamada', () => {
    expect(generateSerial(new Date())).not.toBe(generateSerial(new Date()))
  })
})
