import { AggregateRoot } from '../shared/aggregate-root'
import { ValidationError } from '../shared/errors'
import type { Currency } from '../value-objects/money'
import type { Sku } from '../value-objects/sku'
import type { Slug } from '../value-objects/slug'
import type { FulfillmentSpec } from './fulfillment'
import { ProductCreatedEvent, ProductUpdatedEvent } from './product.events'
import { DEFAULT_PRODUCT_KIND, type ProductKind } from './product.kind'
import { DEFAULT_PRODUCT_STATUS, type ProductStatus } from './product.status'

/**
 * Item de composição de um combo: o produto `componentProductId` faz parte deste
 * produto (que é um `bundle`). `isPrimary` marca o "principal" (destacado na
 * página de vendas); os demais aparecem como inclusos.
 */
export interface ProductComponent {
  componentProductId: string
  sortOrder: number
  isPrimary: boolean
}

/** Estado serializável do produto (ida/volta ao banco). */
export interface ProductSnapshot {
  id: string
  version: number
  sku: string
  slug: string
  name: string
  kind: ProductKind
  description: string | null
  status: ProductStatus
  sellable: boolean
  currency: Currency
  fulfillment: FulfillmentSpec | null
  metadata: Record<string, unknown> | null
  components: ProductComponent[]
  createdAt: Date
  updatedAt: Date
}

export interface CreateProductInput {
  id: string
  sku: Sku
  slug: Slug
  name: string
  kind?: ProductKind
  description?: string | null
  status?: ProductStatus
  sellable?: boolean
  currency?: Currency
  fulfillment?: FulfillmentSpec | null
  metadata?: Record<string, unknown> | null
  components?: ProductComponent[]
  now?: Date
}

export interface UpdateProductDetails {
  name?: string
  kind?: ProductKind
  description?: string | null
  sellable?: boolean
  fulfillment?: FulfillmentSpec | null
  metadata?: Record<string, unknown> | null
  now?: Date
}

interface ProductProps {
  version: number
  sku: string
  slug: string
  name: string
  kind: ProductKind
  description: string | null
  status: ProductStatus
  sellable: boolean
  currency: Currency
  fulfillment: FulfillmentSpec | null
  metadata: Record<string, unknown> | null
  components: ProductComponent[]
  createdAt: Date
  updatedAt: Date
}

/**
 * Agregado de produto: o entregável e fonte da verdade do conteúdo (SEM preço —
 * o preço vive na `Offer`). Um produto `bundle` (combo) inclui outros produtos
 * via `components`, um deles marcado `isPrimary`. Identidade = `id` (uuid).
 */
export class ProductAggregate extends AggregateRoot<string> {
  private constructor(
    id: string,
    private props: ProductProps,
  ) {
    super(id)
  }

  static create(input: CreateProductInput): ProductAggregate {
    const now = input.now ?? new Date()
    const name = input.name.trim()
    if (!name) throw new ValidationError('Nome do produto é obrigatório')

    const components = normalizeComponents(input.id, input.components ?? [])

    const product = new ProductAggregate(input.id, {
      version: 0,
      sku: input.sku.value,
      slug: input.slug.value,
      name,
      kind: input.kind ?? DEFAULT_PRODUCT_KIND,
      description: normalizeOptional(input.description),
      status: input.status ?? DEFAULT_PRODUCT_STATUS,
      sellable: input.sellable ?? true,
      currency: input.currency ?? 'BRL',
      fulfillment: input.fulfillment ?? null,
      metadata: input.metadata ?? null,
      components,
      createdAt: now,
      updatedAt: now,
    })
    product.assertCoherent()
    product.addEvent(new ProductCreatedEvent(product.id, product.props.sku, product.props.kind))
    return product
  }

  static restore(snapshot: ProductSnapshot): ProductAggregate {
    const { id, ...rest } = snapshot
    return new ProductAggregate(id, { ...rest })
  }

  toSnapshot(): ProductSnapshot {
    return { id: this.id, ...this.props, components: [...this.props.components] }
  }

  updateDetails(details: UpdateProductDetails): void {
    if (details.name !== undefined) {
      const name = details.name.trim()
      if (!name) throw new ValidationError('Nome do produto é obrigatório')
      this.props.name = name
    }
    if (details.kind !== undefined) this.props.kind = details.kind
    if (details.description !== undefined)
      this.props.description = normalizeOptional(details.description)
    if (details.sellable !== undefined) this.props.sellable = details.sellable
    if (details.fulfillment !== undefined) this.props.fulfillment = details.fulfillment
    if (details.metadata !== undefined) this.props.metadata = details.metadata
    this.touch(details.now)
    this.addEvent(new ProductUpdatedEvent(this.id, 'details'))
  }

  /** Substitui os componentes do combo (idempotente). */
  setComponents(components: ProductComponent[], now?: Date): void {
    this.props.components = normalizeComponents(this.id, components)
    this.touch(now)
    this.addEvent(new ProductUpdatedEvent(this.id, 'components'))
  }

  setStatus(status: ProductStatus, now?: Date): void {
    if (status === this.props.status) return
    this.props.status = status
    this.touch(now)
    this.addEvent(new ProductUpdatedEvent(this.id, `status:${status}`))
  }

  /**
   * Coerência de cadastro (kind ↔ fulfillment ↔ components ↔ status), gated por
   * status: `draft`/`archived` são livres (cadastro progressivo); `active` exige o
   * produto pronto para entregar. Chamada no `create()` e, no update, UMA vez após
   * consolidar TODAS as mutações (updateDetails/setComponents/setStatus) — validar
   * dentro de cada setter falharia em estados intermediários legítimos. NUNCA é
   * chamada no `restore()`: produto legado precisa carregar para ser corrigido.
   */
  assertCoherent(): void {
    const { kind, fulfillment, components, status } = this.props
    if (kind === 'bundle') {
      if (fulfillment !== null) {
        throw new ValidationError('Combo não tem entrega própria — a entrega vem dos componentes')
      }
      if (status === 'active' && components.length === 0) {
        throw new ValidationError('Combo ativo precisa de pelo menos um componente')
      }
      return
    }
    if (components.length > 0) {
      throw new ValidationError('Apenas combos (tipo "Combo") podem ter componentes')
    }
    if (status !== 'active') return
    if (!fulfillment) {
      throw new ValidationError(
        'Produto ativo precisa de entrega definida (um curso ou todos os cursos)',
      )
    }
    if (fulfillment.accessType === 'course' && !fulfillment.courseRef?.trim()) {
      throw new ValidationError('Produto ativo com entrega por curso precisa do curso vinculado')
    }
    if (
      (fulfillment.accessType === 'all_courses' || fulfillment.accessType === 'all_kids_courses') &&
      fulfillment.courseRef
    ) {
      throw new ValidationError('Entrega "todos os cursos" não leva curso vinculado')
    }
    if (
      fulfillment.maxProfiles !== undefined &&
      (!Number.isInteger(fulfillment.maxProfiles) || fulfillment.maxProfiles < 1)
    ) {
      throw new ValidationError('Quantidade de perfis deve ser um inteiro ≥ 1')
    }
  }

  private touch(now?: Date): void {
    this.props.updatedAt = now ?? new Date()
  }

  get version(): number {
    return this.props.version
  }
  get sku(): string {
    return this.props.sku
  }
  get slug(): string {
    return this.props.slug
  }
  get name(): string {
    return this.props.name
  }
  get kind(): ProductKind {
    return this.props.kind
  }
  get description(): string | null {
    return this.props.description
  }
  get status(): ProductStatus {
    return this.props.status
  }
  get sellable(): boolean {
    return this.props.sellable
  }
  get currency(): Currency {
    return this.props.currency
  }
  get fulfillment(): FulfillmentSpec | null {
    return this.props.fulfillment
  }
  get metadata(): Record<string, unknown> | null {
    return this.props.metadata
  }
  get components(): readonly ProductComponent[] {
    return this.props.components
  }
  get createdAt(): Date {
    return this.props.createdAt
  }
  get updatedAt(): Date {
    return this.props.updatedAt
  }

  /** Um combo: tem componentes (produtos incluídos). */
  isBundle(): boolean {
    return this.props.components.length > 0
  }
}

function normalizeOptional(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Valida e ordena os componentes: sem auto-referência, sem duplicatas e no máximo
 * um `isPrimary`. Ordena por `sortOrder`.
 */
function normalizeComponents(
  productId: string,
  components: ProductComponent[],
): ProductComponent[] {
  const seen = new Set<string>()
  let primaryCount = 0
  for (const c of components) {
    if (c.componentProductId === productId) {
      throw new ValidationError('Um combo não pode incluir a si mesmo')
    }
    if (seen.has(c.componentProductId)) {
      throw new ValidationError('Componente duplicado no combo')
    }
    seen.add(c.componentProductId)
    if (c.isPrimary) primaryCount++
  }
  if (primaryCount > 1) {
    throw new ValidationError('Um combo só pode ter um componente principal')
  }
  return [...components].sort((a, b) => a.sortOrder - b.sortOrder)
}
