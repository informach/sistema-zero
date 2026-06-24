import { describe, expect, mock, test } from 'bun:test'

// `server-only` lança fora do React Server — neutraliza para testar o renderizador puro.
mock.module('server-only', () => ({}))

const { renderCertificatePdf } = await import('../src/server/certificate-pdf')

const CERT = {
  id: '11111111-1111-1111-1111-111111111111',
  serial: 'SZ-2026-ABCDEFGH',
  studentName: 'Maria Silva',
  courseTitle: 'Curso de Lógica',
  courseRef: 'curso-logica',
  completedAt: '2026-06-23T00:00:00.000Z',
  issuedAt: '2026-06-23T00:00:00.000Z',
  revokedAt: null,
}

function pdfHeader(bytes: Uint8Array): string {
  return Buffer.from(bytes.slice(0, 5)).toString('latin1')
}

describe('renderCertificatePdf', () => {
  test('gera um PDF válido com QR (config + verifyUrl)', async () => {
    const bytes = await renderCertificatePdf({
      certificate: CERT,
      config: { issuerName: 'Equipe Sistema Zero', accentColor: '#0891B2', message: 'Parabéns!' },
      verifyUrl: 'https://comunidade.sistemazero.com.br/validar/abc',
    })
    expect(pdfHeader(bytes)).toBe('%PDF-')
    // QR + texto + moldura → bem acima do PDF vazio.
    expect(bytes.byteLength).toBeGreaterThan(2000)
  })

  test('tolera config vazia e verifyUrl vazio (sem QR)', async () => {
    const bytes = await renderCertificatePdf({ certificate: CERT, config: {}, verifyUrl: '' })
    expect(pdfHeader(bytes)).toBe('%PDF-')
  })

  test('cor de destaque inválida não quebra (cai no padrão)', async () => {
    const bytes = await renderCertificatePdf({
      certificate: CERT,
      config: { accentColor: 'roxo' },
      verifyUrl: 'https://x/validar/abc',
    })
    expect(pdfHeader(bytes)).toBe('%PDF-')
  })
})
