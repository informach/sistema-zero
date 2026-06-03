/**
 * Entidade: objeto com identidade própria e estável ao longo do tempo.
 * Igualdade é por identidade (id), não por atributos.
 */
export abstract class Entity<TId> {
  protected constructor(public readonly id: TId) {}

  equals(other?: Entity<TId>): boolean {
    if (other === undefined || other === null) return false
    if (this === other) return true
    return this.id === other.id
  }
}
