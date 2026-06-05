import { ValidationError } from '../shared/errors'
import { ValueObject } from '../shared/value-object'

export type DocumentType = 'CPF' | 'CNPJ'

interface DocumentProps {
  value: string // somente dígitos
  type: DocumentType
}

/**
 * Documento fiscal brasileiro (CPF ou CNPJ) com validação de dígitos
 * verificadores. Necessário, por exemplo, para emissão de boleto.
 */
export class Document extends ValueObject<DocumentProps> {
  private constructor(props: DocumentProps) {
    super(props)
  }

  static create(raw: string): Document {
    const digits = (raw ?? '').replace(/\D/g, '')

    if (digits.length === 11) {
      if (!Document.isValidCpf(digits)) {
        throw new ValidationError('CPF inválido')
      }
      return new Document({ value: digits, type: 'CPF' })
    }

    if (digits.length === 14) {
      if (!Document.isValidCnpj(digits)) {
        throw new ValidationError('CNPJ inválido')
      }
      return new Document({ value: digits, type: 'CNPJ' })
    }

    throw new ValidationError('Documento deve ser um CPF (11) ou CNPJ (14) válido')
  }

  /**
   * Reidrata do estado persistido SEM revalidar dígitos verificadores —
   * reconstituição confia no que já foi validado na entrada. Se a regra de
   * validação endurecer no futuro, um documento legado não pode tornar o
   * pagamento ilegível/inestornável.
   */
  static restore(value: string): Document {
    return new Document({ value, type: value.length === 14 ? 'CNPJ' : 'CPF' })
  }

  get value(): string {
    return this.props.value
  }

  get type(): DocumentType {
    return this.props.type
  }

  private static isValidCpf(cpf: string): boolean {
    if (/^(\d)\1{10}$/.test(cpf)) return false
    const nums = cpf.split('').map(Number)

    const calcDigit = (length: number): number => {
      let sum = 0
      for (let i = 0; i < length; i++) {
        sum += nums[i]! * (length + 1 - i)
      }
      const rest = (sum * 10) % 11
      return rest === 10 ? 0 : rest
    }

    return calcDigit(9) === nums[9]! && calcDigit(10) === nums[10]!
  }

  private static isValidCnpj(cnpj: string): boolean {
    if (/^(\d)\1{13}$/.test(cnpj)) return false
    const nums = cnpj.split('').map(Number)

    const calcDigit = (length: number): number => {
      // Pesos: 5,4,3,2,9,8,7,6,5,4,3,2 (deslocados para 13 dígitos no 2º cálculo)
      let weight = length - 7
      let sum = 0
      for (let i = 0; i < length; i++) {
        sum += nums[i]! * weight
        weight = weight === 2 ? 9 : weight - 1
      }
      const rest = sum % 11
      return rest < 2 ? 0 : 11 - rest
    }

    return calcDigit(12) === nums[12]! && calcDigit(13) === nums[13]!
  }
}
