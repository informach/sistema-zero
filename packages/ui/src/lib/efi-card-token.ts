import type { EfiPay } from 'payment-token-efi'

export interface EfiCardConfig {
  accountIdentifier: string
  environment: 'sandbox' | 'production'
}

/** Importado apenas ao abrir os campos do cartão no navegador, nunca no render SSR. */
export async function loadEfi() {
  return (await import('payment-token-efi')).default
}

/** Compartilhado pelo checkout e pelas assinaturas; não envia PAN/CVV aos nossos BFFs. */
export async function tokenizeEfiCard(
  config: EfiCardConfig,
  card: Parameters<typeof EfiPay.CreditCard.setCreditCardData>[0],
): Promise<{ payment_token: string; card_mask: string }> {
  try {
    if (!config.accountIdentifier) throw new Error('Configuração indisponível')
    const sdk = await loadEfi()
    const result = await sdk.CreditCard.setAccount(config.accountIdentifier)
      .setEnvironment(config.environment)
      .setCreditCardData(card)
      .getPaymentToken()
    if (
      !('payment_token' in result) ||
      typeof result.payment_token !== 'string' ||
      !result.payment_token ||
      result.payment_token.length > 255
    ) {
      throw new Error('Token não retornado')
    }
    const last4 = card.number.replace(/\D/g, '').slice(-4)
    if (
      last4.length !== 4 ||
      typeof result.card_mask !== 'string' ||
      !result.card_mask.endsWith(last4)
    ) {
      throw new Error('Cartão retornado divergente')
    }
    return { payment_token: result.payment_token, card_mask: result.card_mask }
  } catch {
    // A exceção do SDK pode conter dados do cartão. Não anexar cause nem logar o objeto.
    throw new Error('Não foi possível validar o cartão. Confira os dados e tente novamente.')
  }
}
