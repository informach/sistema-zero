import { ValueObject } from '../shared/value-object'
import { ValidationError } from '../shared/errors'
import { Document } from './document'

export interface Address {
  street: string
  number: string
  neighborhood: string
  zipcode: string
  city: string
  state: string
  complement?: string
}

interface CustomerProps {
  name: string
  email: string
  document: Document
  phone?: string
  address?: Address
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Pagador. Para Pix imediato muitos campos são opcionais; para boleto o
 * documento e o endereço passam a ser exigidos pelo provedor (validado no
 * adapter correspondente, não aqui).
 */
export class Customer extends ValueObject<CustomerProps> {
  private constructor(props: CustomerProps) {
    super(props)
  }

  static create(input: {
    name: string
    email: string
    document: string
    phone?: string
    address?: Address
  }): Customer {
    const name = input.name?.trim()
    if (!name) throw new ValidationError('Nome do pagador é obrigatório')

    const email = input.email?.trim().toLowerCase()
    if (!email || !EMAIL_REGEX.test(email)) {
      throw new ValidationError('E-mail do pagador inválido')
    }

    return new Customer({
      name,
      email,
      document: Document.create(input.document),
      phone: input.phone?.replace(/\D/g, '') || undefined,
      address: input.address,
    })
  }

  get name(): string {
    return this.props.name
  }

  get email(): string {
    return this.props.email
  }

  get document(): Document {
    return this.props.document
  }

  get phone(): string | undefined {
    return this.props.phone
  }

  get address(): Address | undefined {
    return this.props.address
  }
}
