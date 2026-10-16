'use client'
import {
  type ImportInventory,
  type ImportProductBinding,
  importProductBindingSchema,
  type Project,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { useId, useState } from 'react'
import type { WorkbenchPort } from './port'

export function ImportProductPanel({
  port,
  project,
  origin,
  products,
  binding,
  busy,
  onBound,
  run,
}: {
  port: WorkbenchPort
  project: Project
  origin: ImportInventory['origin']
  products: string[]
  binding: ImportProductBinding | null
  busy: boolean
  onBound(value: ImportProductBinding): void
  run(work: () => Promise<void>): void
}) {
  const field = useId()
  const [product, setProduct] = useState(binding?.product ?? '')
  const [includeShared, setIncludeShared] = useState(binding?.includeShared ?? false)
  const options = [...new Set([...products, ...(binding ? [binding.product] : [])])].sort()
  const admin = project.permissions.includes('admin')
  return (
    <fieldset disabled={busy || !admin} className="space-y-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">Produto de destino</legend>
      <p className="text-sm">
        Projeto: {project.name} · Produto: {project.product}
      </p>
      <p className="text-xs text-muted-foreground">
        Escolha qual produto desta origem corresponde ao projeto. O vínculo vale para todos os
        inventários desta origem. Materiais dos demais produtos devem entrar em projetos separados.
        Isso prepara o acervo; não ativa o produto nem aprova peças.
      </p>
      {!admin ? <p className="text-sm">Um administrador do projeto define este vínculo.</p> : null}
      <label htmlFor={field} className="block text-sm">
        Produto na origem {origin === 'sistema-zero' ? 'Sistema Zero' : 'Fluxo Criativo'}
      </label>
      <Select
        id={field}
        value={product}
        onChange={(event) => {
          setProduct(event.target.value)
          if (event.target.value === 'shared') setIncludeShared(false)
        }}
      >
        <option value="">Escolha o produto correspondente</option>
        {options.map((value) => (
          <option key={value} value={value}>
            {value === 'shared' ? 'Somente referências compartilhadas' : value}
          </option>
        ))}
      </Select>
      {product && product !== 'shared' ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={includeShared}
            onChange={(event) => setIncludeShared(event.target.checked)}
          />
          Permitir também referências compartilhadas desta origem
        </label>
      ) : null}
      <Button
        size="sm"
        disabled={
          busy ||
          !admin ||
          !product ||
          (binding?.product === product && binding.includeShared === includeShared)
        }
        onClick={() =>
          run(async () => {
            const result = importProductBindingSchema.parse(
              await port.request(`/projects/${project.id}/import-products`, 'PUT', {
                operationId: crypto.randomUUID(),
                origin,
                product,
                includeShared,
                expectedRevisionId: binding?.revisionId ?? null,
              }),
            )
            onBound(result)
          })
        }
      >
        {binding ? 'Atualizar vínculo' : 'Vincular produto ao projeto'}
      </Button>
      {binding ? (
        <p className="text-xs text-muted-foreground">
          Vínculo confirmado: {binding.product}
          {binding.includeShared ? ' e referências compartilhadas' : ''}.
        </p>
      ) : null}
    </fieldset>
  )
}
