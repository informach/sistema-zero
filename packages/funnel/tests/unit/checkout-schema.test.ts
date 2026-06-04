import { describe, expect, test } from 'bun:test'
import {
  CardChargeSchema,
  CardFormSchema,
  CheckoutContactSchema,
  PixChargeSchema,
} from '../../src/lib/checkout-schema'

// CPF de teste com dígitos verificadores válidos (gerado pelo algoritmo mod 11).
const VALID_CPF = '529.982.247-25'

const validContact = { nome: 'Fulano de Tal', email: 'fulano@example.com', cpf: VALID_CPF }

const validForm = {
  number: '4242 4242 4242 4242',
  holderName: 'Fulano de Tal',
  expirationMonth: '12',
  expirationYear: '2030',
  cvv: '123',
  installments: 1,
}

describe('CardFormSchema', () => {
  test('aceita um form válido (visa de teste) e normaliza o número', () => {
    const r = CardFormSchema.safeParse(validForm)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.number).toBe('4242424242424242')
  })

  test('aceita amex de teste (15 dígitos, CVV 4)', () => {
    const r = CardFormSchema.safeParse({
      ...validForm,
      number: '3782 822463 10005',
      cvv: '1234',
    })
    expect(r.success).toBe(true)
  })

  test('rejeita número que falha no Luhn', () => {
    const r = CardFormSchema.safeParse({ ...validForm, number: '4242 4242 4242 4241' })
    expect(r.success).toBe(false)
  })

  test('rejeita número com poucos dígitos ou não-numérico', () => {
    expect(CardFormSchema.safeParse({ ...validForm, number: '4242 4242' }).success).toBe(false)
    expect(CardFormSchema.safeParse({ ...validForm, number: 'abcd' }).success).toBe(false)
  })

  test('rejeita mês/ano fora do formato', () => {
    expect(CardFormSchema.safeParse({ ...validForm, expirationMonth: '13' }).success).toBe(false)
    expect(CardFormSchema.safeParse({ ...validForm, expirationMonth: '0' }).success).toBe(false)
    expect(CardFormSchema.safeParse({ ...validForm, expirationYear: '30' }).success).toBe(false)
  })

  test('rejeita CVV fora de 3-4 dígitos', () => {
    expect(CardFormSchema.safeParse({ ...validForm, cvv: '12' }).success).toBe(false)
    expect(CardFormSchema.safeParse({ ...validForm, cvv: '12345' }).success).toBe(false)
    expect(CardFormSchema.safeParse({ ...validForm, cvv: '12a' }).success).toBe(false)
  })

  test('rejeita parcelas fora de 1..12', () => {
    expect(CardFormSchema.safeParse({ ...validForm, installments: 0 }).success).toBe(false)
    expect(CardFormSchema.safeParse({ ...validForm, installments: 13 }).success).toBe(false)
  })
})

describe('CheckoutContactSchema (dados pessoais compartilhados)', () => {
  test('aceita contato válido', () => {
    expect(CheckoutContactSchema.safeParse(validContact).success).toBe(true)
  })

  test('rejeita CPF inválido', () => {
    expect(
      CheckoutContactSchema.safeParse({ ...validContact, cpf: '111.111.111-11' }).success,
    ).toBe(false)
  })

  test('rejeita e-mail/nome inválidos', () => {
    expect(CheckoutContactSchema.safeParse({ ...validContact, email: 'foo' }).success).toBe(false)
    expect(CheckoutContactSchema.safeParse({ ...validContact, nome: 'X' }).success).toBe(false)
  })
})

describe('PixChargeSchema (corpo do POST /api/checkout/pix)', () => {
  test('exige contact (Pix não é gerado sem os dados pessoais)', () => {
    expect(PixChargeSchema.safeParse({}).success).toBe(false)
    expect(PixChargeSchema.safeParse({ contact: validContact }).success).toBe(true)
  })

  test('cupom é opcional', () => {
    expect(
      PixChargeSchema.safeParse({ contact: validContact, couponCode: 'PROMO10' }).success,
    ).toBe(true)
  })
})

const validCharge = {
  token: 'tok_abc123',
  brand: 'visa',
  last4: '4242',
  installments: 3,
  attemptId: 'attempt-1',
  contact: validContact,
}

describe('CardChargeSchema', () => {
  test('aceita um corpo válido', () => {
    expect(CardChargeSchema.safeParse(validCharge).success).toBe(true)
  })

  test('aceita todas as bandeiras suportadas pela Efí', () => {
    for (const brand of ['visa', 'mastercard', 'amex', 'elo', 'hipercard']) {
      expect(CardChargeSchema.safeParse({ ...validCharge, brand }).success).toBe(true)
    }
  })

  test('rejeita bandeira fora do enum', () => {
    expect(CardChargeSchema.safeParse({ ...validCharge, brand: 'foo' }).success).toBe(false)
    expect(CardChargeSchema.safeParse({ ...validCharge, brand: 'undefined' }).success).toBe(false)
    expect(CardChargeSchema.safeParse({ ...validCharge, brand: '' }).success).toBe(false)
  })

  test('rejeita last4 que não seja exatamente 4 dígitos', () => {
    expect(CardChargeSchema.safeParse({ ...validCharge, last4: '424' }).success).toBe(false)
    expect(CardChargeSchema.safeParse({ ...validCharge, last4: '42424' }).success).toBe(false)
    expect(CardChargeSchema.safeParse({ ...validCharge, last4: 'abcd' }).success).toBe(false)
  })

  test('rejeita parcelas fora de 1..12', () => {
    expect(CardChargeSchema.safeParse({ ...validCharge, installments: 0 }).success).toBe(false)
    expect(CardChargeSchema.safeParse({ ...validCharge, installments: 13 }).success).toBe(false)
  })
})
