import { ValueObject } from '../shared/value-object'
import { ValidationError } from '../shared/errors'

interface IdempotencyKeyProps {
  value: string
}

/**
 * Chave de idempotência fornecida pelo consumidor para garantir que reenvios da
 * mesma operação de pagamento não gerem cobranças duplicadas.
 */
export class IdempotencyKey extends ValueObject<IdempotencyKeyProps> {
  private constructor(props: IdempotencyKeyProps) {
    super(props)
  }

  static create(raw: string): IdempotencyKey {
    const value = (raw ?? '').trim()
    if (value.length < 8 || value.length > 255) {
      throw new ValidationError('Idempotency-Key deve ter entre 8 e 255 caracteres')
    }
    return new IdempotencyKey({ value })
  }

  get value(): string {
    return this.props.value
  }
}
