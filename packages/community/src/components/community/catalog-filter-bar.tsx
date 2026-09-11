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
          // Em cima do chão da página o campo precisa do branco do cartão (senão some nele).
          className="bg-card pl-9"
          aria-label="Buscar curso"
        />
      </div>
      {/* A ordem mais longa ("Mais recentes primeiro") pede 145 px de texto, e o seletor gasta 44
          de respiro: com 176 px ela saía cortada. No celular os dois dividem a linha em 2:3 (com
          larguras fixas eles passavam dos 343 px da tela); do `sm` em diante voltam ao fixo. */}
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3 sm:flex">
        <Select
          value={filters.acesso}
          onChange={(e) => onChange('acesso', e.target.value)}
          aria-label="Filtrar por acesso"
          className="bg-card sm:w-36"
        >
          <option value="todos">Todos</option>
          <option value="liberados">Liberados</option>
          <option value="bloqueados">Bloqueados</option>
        </Select>
        <Select
          value={filters.ordem}
          onChange={(e) => onChange('ordem', e.target.value)}
          aria-label="Ordenar"
          className="bg-card sm:w-52"
        >
          <option value="antigos">Mais antigos primeiro</option>
          <option value="recentes">Mais recentes primeiro</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
        </Select>
        {hasActiveFilters ? (
          <Button variant="ghost" onClick={onClear} className="shrink-0 justify-self-start">
            <X className="size-4" />
            Limpar
          </Button>
        ) : null}
      </div>
    </div>
  )
}
