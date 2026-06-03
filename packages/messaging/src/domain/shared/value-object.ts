/**
 * Value Object: imutável e comparado por valor (estrutura), não por identidade.
 * A igualdade trata `bigint` (que `JSON.stringify` não suporta nativamente).
 */
export abstract class ValueObject<TProps extends object> {
  protected readonly props: Readonly<TProps>

  protected constructor(props: TProps) {
    this.props = Object.freeze({ ...props })
  }

  equals(other?: ValueObject<TProps>): boolean {
    if (other === undefined || other === null) return false
    if (this === other) return true
    return ValueObject.stringify(this.props) === ValueObject.stringify(other.props)
  }

  private static stringify(props: object): string {
    return JSON.stringify(props, (_key, value) =>
      typeof value === 'bigint' ? `${value.toString()}n` : value,
    )
  }
}
