'use client'
import {
  type ImportSelection,
  importCategorySchema,
  type PreparedImport,
  type Project,
} from '@sistemazero/marketing-contracts'
import { Button } from '@sistemazero/ui/button'
import { Select } from '@sistemazero/ui/select'
import { useId, useState } from 'react'
import type { WorkbenchPort } from './port'

export function ImportBatchControls({
  prepared,
  project,
  inventory,
  busy,
  labels,
  run,
}: {
  prepared: PreparedImport
  project: Project
  inventory: NonNullable<WorkbenchPort['inventory']>
  busy: boolean
  labels: Record<ImportSelection['categories'][number], string>
  run(work: () => Promise<string>): void
}) {
  const field = useId()
  const [selection, setSelection] = useState<ImportSelection>({
    product: prepared.products.includes(project.product)
      ? project.product
      : (prepared.products[0] ?? null),
    categories: ['direction', 'calendar', 'copy', 'research'],
    includeReview: false,
  })
  return (
    <fieldset disabled={busy} className="space-y-3 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">Carregar ou retomar um conjunto</legend>
      <p className="text-xs text-muted-foreground">
        A seleção abrange todo este inventário. O destino é o projeto {project.name}. Os registros
        já carregados são preservados; arquivos em conferência podem ser retomados depois.
      </p>
      <label htmlFor={`${field}-product`} className="text-sm">
        Produto da origem
      </label>
      <Select
        id={`${field}-product`}
        value={selection.product ?? ''}
        onChange={(event) =>
          setSelection((previous) => ({ ...previous, product: event.target.value || null }))
        }
      >
        {prepared.products.map((product) => (
          <option key={product} value={product}>
            {product}
          </option>
        ))}
        <option value="">Todos os produtos deste inventário</option>
      </Select>
      <div className="grid gap-2 text-sm sm:grid-cols-2">
        {importCategorySchema.options.map((category) => (
          <label key={category} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selection.categories.includes(category)}
              onChange={(event) =>
                setSelection((previous) => ({
                  ...previous,
                  categories: event.target.checked
                    ? [...previous.categories, category]
                    : previous.categories.filter((item) => item !== category),
                }))
              }
            />
            {labels[category]}
          </label>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={selection.includeReview}
          onChange={(event) =>
            setSelection((previous) => ({ ...previous, includeReview: event.target.checked }))
          }
        />
        Incluir origens que requerem conferência
      </label>
      <p className="text-xs text-muted-foreground">
        Todas entram como referências em preparação. Código e arquivos de produção são guardados
        como anexos; não são executados nem viram direção vigente.
      </p>
      <Button
        size="sm"
        disabled={busy || !selection.categories.length}
        onClick={() =>
          run(async () => {
            const result = await inventory.loadSelection(project.id, prepared.id, selection)
            return `${result.selected} origens selecionadas: ${result.loaded} carregadas, ${result.reused} já preservadas e ${result.verifying} aguardando conferência de arquivos no servidor.`
          })
        }
      >
        Carregar seleção ou retomar
      </Button>
    </fieldset>
  )
}
