import { ValidationError } from '../shared/errors'
import { ValueObject } from '../shared/value-object'

export type PaymentMethodType = 'PIX' | 'BOLETO' | 'CREDIT_CARD'

/**
 * Dados de cartão SEGUROS para persistência. Nunca armazenamos o PAN — apenas o
 * token gerado pela Efí, a bandeira e os 4 últimos dígitos (compliance PCI-DSS).
 *
 * `token` é opcional: cobranças de cartão **avulsas** sempre o carregam (é usado
 * para chamar a Efí), mas um ciclo de **assinatura** não — o token de vida curta
 * é consumido ao criar a assinatura e a Efí passa a cobrar o cartão guardado por
 * conta própria, então o ciclo persiste apenas bandeira/últimos dígitos.
 */
export interface CardData {
  token?: string
  brand: string
  last4: string
  installments: number
}

type Variant = { type: 'PIX' } | { type: 'BOLETO' } | { type: 'CREDIT_CARD'; card: CardData }

/**
 * Forma de pagamento como união discriminada. O método `match` força o
 * tratamento de todos os casos em tempo de compilação (dispatch type-safe),
 * evitando `switch` espalhados pelo código.
 */
export class PaymentMethod extends ValueObject<{ variant: Variant }> {
  private constructor(variant: Variant) {
    super({ variant })
  }

  static pix(): PaymentMethod {
    return new PaymentMethod({ type: 'PIX' })
  }

  static boleto(): PaymentMethod {
    return new PaymentMethod({ type: 'BOLETO' })
  }

  static creditCard(card: CardData): PaymentMethod {
    if (!card.token) throw new ValidationError('Token do cartão é obrigatório')
    if (!/^\d{4}$/.test(card.last4)) throw new ValidationError('last4 inválido')
    if (!Number.isInteger(card.installments) || card.installments < 1) {
      throw new ValidationError('Número de parcelas inválido')
    }
    return new PaymentMethod({ type: 'CREDIT_CARD', card })
  }

  /**
   * Cartão de um ciclo de **assinatura**: SEM token (a Efí já cobra o cartão
   * guardado) e sempre 1 parcela. Usado para representar cada cobrança recorrente
   * como um pagamento de cartão, reaproveitando todo o pipeline de pagamento.
   */
  static recurringCard(card: { brand: string; last4: string }): PaymentMethod {
    if (!/^\d{4}$/.test(card.last4)) throw new ValidationError('last4 inválido')
    return new PaymentMethod({
      type: 'CREDIT_CARD',
      card: { brand: card.brand, last4: card.last4, installments: 1 },
    })
  }

  get type(): PaymentMethodType {
    return this.props.variant.type
  }

  match<R>(handlers: { pix: () => R; boleto: () => R; creditCard: (card: CardData) => R }): R {
    const variant = this.props.variant
    switch (variant.type) {
      case 'PIX':
        return handlers.pix()
      case 'BOLETO':
        return handlers.boleto()
      case 'CREDIT_CARD':
        return handlers.creditCard(variant.card)
    }
  }
}
