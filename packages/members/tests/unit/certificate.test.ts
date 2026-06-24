import { describe, expect, test } from 'bun:test'
import {
  eligibleForCertificate,
  generateSerial,
  SERIAL_RE,
} from '../../src/domain/certificate/certificate'

describe('eligibleForCertificate', () => {
  const cert = 'cert'
  test('elegível quando todas as outras aulas publicadas estão concluídas', () => {
    expect(eligibleForCertificate([cert, 'a', 'b'], cert, ['a', 'b'])).toBe(true)
  })
  test('não elegível com aula pendente', () => {
    expect(eligibleForCertificate([cert, 'a', 'b'], cert, ['a'])).toBe(false)
  })
  test('a própria aula do certificado não é exigida', () => {
    expect(eligibleForCertificate([cert, 'a'], cert, ['a'])).toBe(true)
  })
  test('curso só com a aula do certificado NÃO é elegível (certifica zero trabalho)', () => {
    expect(eligibleForCertificate([cert], cert, [])).toBe(false)
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
