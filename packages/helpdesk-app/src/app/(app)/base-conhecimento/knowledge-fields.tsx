'use client'

import type { KnowledgeAudience, KnowledgeProduct } from '@sistemazero/helpdesk-contracts'
export const audienceLabels: Record<KnowledgeAudience, string> = {
  staff_only: 'Somente equipe',
  customer_adult: 'Cliente adulto',
  customer_parent: 'Responsável infantil',
  customer_all: 'Todos os clientes',
}
export const productLabels: Record<KnowledgeProduct, string> = {
  all: 'Todos os produtos',
  community: 'Comunidade',
  kids: 'Curso infantil',
  studio: 'Estúdio',
}

export function KnowledgeFields({
  audience,
  product,
  onAudience,
  onProduct,
}: {
  audience: KnowledgeAudience
  product: KnowledgeProduct
  onAudience: (value: KnowledgeAudience) => void
  onProduct: (value: KnowledgeProduct) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm">
        Público
        <select
          className="block w-full rounded-md border border-input bg-background p-2"
          value={audience}
          onChange={(e) => {
            const value = e.target.value
            if (value in audienceLabels) onAudience(value as KnowledgeAudience)
          }}
        >
          {Object.entries(audienceLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        Produto
        <select
          className="block w-full rounded-md border border-input bg-background p-2"
          value={product}
          onChange={(e) => {
            const value = e.target.value
            if (value in productLabels) onProduct(value as KnowledgeProduct)
          }}
        >
          {Object.entries(productLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}
