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
      {/* Mobile: grade 2-col (selects ocupam a célula, nunca estouram); sm+: linha que
          pode quebrar. Antes era `flex` sem wrap → o 3º select (nível) vazava no celular. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
        <Select
          value={filters.acesso}
          onChange={(e) => onChange('acesso', e.target.value)}
          aria-label="Filtrar por acesso"
          className="w-full sm:w-36"
        >
          <option value="todos">Todos</option>
          <option value="liberados">Liberados</option>
          <option value="bloqueados">Bloqueados</option>
        </Select>
        <Select
          value={filters.nivel}
          onChange={(e) => onChange('nivel', e.target.value)}
          aria-label="Filtrar por nível"
          className="w-full sm:w-40"
        >
          <option value="todos">Todos os níveis</option>
          <option value="iniciante">Iniciante</option>
          <option value="intermediario">Intermediário</option>
          <option value="avancado">Avançado</option>
        </Select>
        <Select
          value={filters.ordem}
          onChange={(e) => onChange('ordem', e.target.value)}
          aria-label="Ordenar"
          className="w-full sm:w-44"
        >
          <option value="antigos">Mais antigos primeiro</option>
          <option value="recentes">Mais recentes primeiro</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
        </Select>
        {hasActiveFilters ? (
          <Button variant="ghost" onClick={onClear} className="col-span-2 shrink-0 sm:col-auto">
            <X className="size-4" />
            Limpar
          </Button>
        ) : null}
      </div>
    </div>
  )
}
