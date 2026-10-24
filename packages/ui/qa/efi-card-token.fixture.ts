import { beforeEach, expect, mock, test } from 'bun:test'

let response: unknown
let failure: unknown
let submissions = 0
const chain = {
  setAccount: () => chain,
  setEnvironment: () => chain,
  setCreditCardData: () => chain,
  getPaymentToken: async () => {
    submissions++
    if (failure) throw failure
    return response
  },
}
mock.module('payment-token-efi', () => ({ default: { CreditCard: chain } }))
const { tokenizeEfiCard } = await import('../src/lib/efi-card-token')
const card = {
  brand: 'visa',
  number: '4242424242424242',
  cvv: '123',
  expirationMonth: '12',
  expirationYear: '2030',
  holderName: 'QA',
  holderDocument: '52998224725',
  reuse: true,
}
const config = { accountIdentifier: 'qa-public', environment: 'sandbox' as const }
beforeEach(() => {
  submissions = 0
  failure = null
  response = {
    payment_token: 'qa-token',
    card_mask: '************4242',
    privateExtra: 'must-not-escape',
  }
})

test('retorna somente token e máscara, sem propagar dados extras da operadora', async () => {
  expect(await tokenizeEfiCard(config, card)).toEqual({
    payment_token: 'qa-token',
    card_mask: '************4242',
  })
  expect(submissions).toBe(1)
})
test.each([
  { payment_token: 'qa-token', card_mask: '************9999' },
  { payment_token: 123, card_mask: '************4242' },
  { payment_token: 'qa-token', card_mask: 4242 },
  { error: 'raw-sensitive-marker-qa' },
])('recusa resposta inválida sem expor conteúdo: %#', async (invalid) => {
  response = invalid
  await expect(tokenizeEfiCard(config, card)).rejects.toThrow('Não foi possível validar o cartão')
})
test('não devolve erro cru nem cause que contenha campos sensíveis', async () => {
  failure = new Error('raw-sensitive-marker-qa')
  try {
    await tokenizeEfiCard(config, card)
    throw new Error('Esperava recusa')
  } catch (error) {
    expect(String(error)).not.toContain('raw-sensitive-marker-qa')
    expect(error instanceof Error && error.cause).toBeUndefined()
  }
})
test('sem configuração não chama a operadora', async () => {
  await expect(tokenizeEfiCard({ ...config, accountIdentifier: '' }, card)).rejects.toThrow()
  expect(submissions).toBe(0)
})
