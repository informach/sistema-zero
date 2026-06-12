import { describe, expect, test } from 'bun:test'
import {
  canCancelInvoice,
  canDownloadPdf,
  canEmitNow,
  canRetryInvoice,
  canSubstituteInvoice,
  extractExistingInvoiceId,
  formatDateOnly,
  formatDocument,
  formatDps,
  invoiceMainDate,
  invoiceStatusLabel,
  invoiceStatusVariant,
  isValidCancelReason,
  isValidUuid,
  summarizeEventDetail,
  sumStatusCounts,
  truncateAccessKey,
} from '../src/lib/nfse'
import { INVOICE_STATUSES } from '../src/lib/types'

describe('invoiceStatusLabel / invoiceStatusVariant', () => {
  test('todos os status do contrato têm label PT-BR (≠ do código cru)', () => {
    for (const status of INVOICE_STATUSES) {
      expect(invoiceStatusLabel(status)).not.toBe(status)
    }
  })

  test('cores por estado: EMITTED=sucesso, FAILED=erro, CANCEL_PENDING=alerta, neutros', () => {
    expect(invoiceStatusVariant('EMITTED')).toBe('success')
    expect(invoiceStatusVariant('FAILED')).toBe('destructive')
    expect(invoiceStatusVariant('CANCEL_PENDING')).toBe('default')
    expect(invoiceStatusVariant('SCHEDULED')).toBe('outline')
    expect(invoiceStatusVariant('SKIPPED')).toBe('muted')
    expect(invoiceStatusVariant('CANCELLED')).toBe('muted')
    expect(invoiceStatusVariant('SUBSTITUTED')).toBe('muted')
  })

  test('status desconhecido degrada p/ o próprio código + variant muted', () => {
    expect(invoiceStatusLabel('NOVO_STATUS')).toBe('NOVO_STATUS')
    expect(invoiceStatusVariant('NOVO_STATUS')).toBe('muted')
  })
})

describe('formatDocument', () => {
  test('CPF (11 dígitos) ganha máscara', () => {
    expect(formatDocument('52998224725')).toBe('529.982.247-25')
  })

  test('CPF já mascarado é re-normalizado (extrai dígitos)', () => {
    expect(formatDocument('529.982.247-25')).toBe('529.982.247-25')
  })

  test('CNPJ (14 dígitos) ganha máscara', () => {
    expect(formatDocument('11222333000181')).toBe('11.222.333/0001-81')
  })

  test('tamanho inesperado volta como veio', () => {
    expect(formatDocument('123')).toBe('123')
    expect(formatDocument('')).toBe('')
  })
})

describe('truncateAccessKey', () => {
  test('chave longa: 8 primeiros…6 últimos', () => {
    const key = '35240611222333000181550010000001231000001234'
    expect(truncateAccessKey(key)).toBe('35240611…001234')
  })

  test('chave curta (≤16) volta inteira', () => {
    expect(truncateAccessKey('abc123')).toBe('abc123')
    expect(truncateAccessKey('1234567890123456')).toBe('1234567890123456')
  })
})

describe('formatDps', () => {
  test('série e número presentes', () => {
    expect(formatDps('900', '42')).toBe('42 · série 900')
  })

  test('ambos ausentes → —', () => {
    expect(formatDps(null, null)).toBe('—')
  })

  test('parcial degrada com —', () => {
    expect(formatDps('900', null)).toBe('— · série 900')
    expect(formatDps(null, '42')).toBe('42 · série —')
  })
})

describe('invoiceMainDate', () => {
  test('nota emitida → "Emitida em" com emittedAt', () => {
    const d = invoiceMainDate({
      emittedAt: '2026-06-10T12:00:00Z',
      scheduledFor: '2026-06-01T00:00:00Z',
    })
    expect(d.label).toBe('Emitida em')
    expect(d.iso).toBe('2026-06-10T12:00:00Z')
  })

  test('sem emissão → "Agendada para" com scheduledFor', () => {
    const d = invoiceMainDate({ emittedAt: null, scheduledFor: '2026-06-20T00:00:00Z' })
    expect(d.label).toBe('Agendada para')
    expect(d.iso).toBe('2026-06-20T00:00:00Z')
  })
})

describe('formatDateOnly', () => {
  test('data civil sem deslocamento de fuso', () => {
    expect(formatDateOnly('2026-06-01')).toBe('01/06/2026')
  })

  test('ISO completo usa só a parte da data', () => {
    expect(formatDateOnly('2026-06-01T23:59:00-03:00')).toBe('01/06/2026')
  })

  test('ausente/inválido → —', () => {
    expect(formatDateOnly(null)).toBe('—')
    expect(formatDateOnly(undefined)).toBe('—')
    expect(formatDateOnly('não-é-data')).toBe('—')
  })
})

describe('sumStatusCounts', () => {
  const byStatus = { EMITTED: 10, SCHEDULED: 3, CANCEL_PENDING: 1, CANCELLED: 2 }

  test('soma o grupo pedido, ignorando ausentes', () => {
    expect(sumStatusCounts(byStatus, ['EMITTED'])).toBe(10)
    expect(sumStatusCounts(byStatus, ['CANCEL_PENDING', 'CANCELLED', 'SUBSTITUTED'])).toBe(3)
    expect(sumStatusCounts(byStatus, ['FAILED'])).toBe(0)
    expect(sumStatusCounts({}, ['EMITTED'])).toBe(0)
  })
})

describe('gates de ação por estado', () => {
  test('PDF: só EMITTED com pdfStoredAt', () => {
    expect(canDownloadPdf({ status: 'EMITTED', pdfStoredAt: '2026-06-10T12:00:00Z' })).toBe(true)
    expect(canDownloadPdf({ status: 'EMITTED', pdfStoredAt: null })).toBe(false)
    expect(canDownloadPdf({ status: 'FAILED', pdfStoredAt: '2026-06-10T12:00:00Z' })).toBe(false)
  })

  test('reprocessar: só FAILED', () => {
    expect(canRetryInvoice({ status: 'FAILED' })).toBe(true)
    expect(canRetryInvoice({ status: 'EMITTED' })).toBe(false)
    expect(canRetryInvoice({ status: 'SCHEDULED' })).toBe(false)
  })

  test('cancelar/substituir: só EMITTED', () => {
    expect(canCancelInvoice({ status: 'EMITTED' })).toBe(true)
    expect(canCancelInvoice({ status: 'CANCELLED' })).toBe(false)
    expect(canSubstituteInvoice({ status: 'EMITTED' })).toBe(true)
    expect(canSubstituteInvoice({ status: 'CANCEL_PENDING' })).toBe(false)
  })

  test('emitir agora (antecipar): só SCHEDULED', () => {
    expect(canEmitNow({ status: 'SCHEDULED' })).toBe(true)
    expect(canEmitNow({ status: 'EMITTED' })).toBe(false)
    expect(canEmitNow({ status: 'FAILED' })).toBe(false)
    expect(canEmitNow({ status: 'SKIPPED' })).toBe(false)
  })
})

describe('isValidUuid', () => {
  test('uuid canônico é válido (qualquer caixa)', () => {
    expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    expect(isValidUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true)
  })

  test('formatos errados são rejeitados', () => {
    expect(isValidUuid('')).toBe(false)
    expect(isValidUuid('123e4567e89b12d3a456426614174000')).toBe(false) // sem hífens
    expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400')).toBe(false) // curto
    expect(isValidUuid('123e4567-e89b-12d3-a456-4266141740zz')).toBe(false) // não-hex
    expect(isValidUuid(' 123e4567-e89b-12d3-a456-426614174000')).toBe(false) // espaço (caller trima)
  })
})

describe('extractExistingInvoiceId', () => {
  const invoiceId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'
  const paymentId = '123e4567-e89b-12d3-a456-426614174000'

  test('extrai o id da mensagem do fiscal', () => {
    expect(
      extractExistingInvoiceId(`Já existe nota ativa para este pagamento (${invoiceId})`),
    ).toBe(invoiceId)
  })

  test('ignora o paymentId se a mensagem o incluir (caixa indiferente)', () => {
    expect(
      extractExistingInvoiceId(
        `pagamento ${paymentId.toUpperCase()} já tem a nota ${invoiceId}`,
        paymentId,
      ),
    ).toBe(invoiceId)
  })

  test('sem uuid extraível → null', () => {
    expect(extractExistingInvoiceId('Já existe nota ativa para este pagamento')).toBeNull()
    expect(extractExistingInvoiceId(`pagamento ${paymentId}`, paymentId)).toBeNull()
  })
})

describe('isValidCancelReason', () => {
  test('3..500 chars após trim', () => {
    expect(isValidCancelReason('ok!')).toBe(true)
    expect(isValidCancelReason('  ab  ')).toBe(false)
    expect(isValidCancelReason('a'.repeat(500))).toBe(true)
    expect(isValidCancelReason('a'.repeat(501))).toBe(false)
    expect(isValidCancelReason('')).toBe(false)
  })
})

describe('summarizeEventDetail', () => {
  test('vazio/ausente → null', () => {
    expect(summarizeEventDetail(null)).toBeNull()
    expect(summarizeEventDetail(undefined)).toBeNull()
    expect(summarizeEventDetail({})).toBeNull()
  })

  test('pares chave: valor separados por " · ", objetos viram JSON', () => {
    expect(summarizeEventDetail({ status: 'ok', attempts: 2 })).toBe('status: ok · attempts: 2')
    expect(summarizeEventDetail({ extra: { a: 1 } })).toBe('extra: {"a":1}')
  })

  test('trunca no limite com reticências', () => {
    const summary = summarizeEventDetail({ message: 'x'.repeat(300) }, 50)
    expect(summary?.length).toBe(50)
    expect(summary?.endsWith('…')).toBe(true)
  })
})
