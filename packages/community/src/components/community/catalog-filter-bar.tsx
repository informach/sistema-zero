'use client'

import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import { Select } from '@sistemazero/ui/select'
import { Search, X } from 'lucide-react'
import type { CatalogFilters } from '@/lib/use-catalog-filters'

interface Props {
  filters: CatalogFilters
  onChange: (name: keyof CatalogFilters, value: string) => void
  onClear: () => void
  hasActiveFilters: boolean
}

/** Busca + filtros do catálogo (persistidos na URL pelo hook). */
export function CatalogFilterBar({ filters, onChange, onClear, hasActiveFilters }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar curso..."
          value={filters.q}
          onChange={(e) => onChange('q', e.target.value)}
          className="pl-9"
          aria-label="Buscar curso"
        />
      </div>
      <div className="flex items-center gap-3">
        <Select
          value={filters.acesso}
          onChange={(e) => onChange('acesso', e.target.value)}
          aria-label="Filtrar por acesso"
          className="w-36"
        >
          <option value="todos">Todos</option>
          <option value="liberados">Liberados</option>
          <option value="bloqueados">Bloqueados</option>
        </Select>
        <Select
          value={filters.ordem}
          onChange={(e) => onChange('ordem', e.target.value)}
          aria-label="Ordenar"
          className="w-44"
        >
          <option value="antigos">Mais antigos primeiro</option>
          <option value="recentes">Mais recentes primeiro</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
        </Select>
        {hasActiveFilters ? (
          <Button variant="ghost" onClick={onClear} className="shrink-0">
            <X className="size-4" />
            Limpar
          </Button>
        ) : null}
      </div>
    </div>
  )
}
