'use client'

import { ChevronDown, Search } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { CatalogFilters } from '@/lib/use-catalog-filters'

interface Props {
  filters: CatalogFilters
  onChange: (name: keyof CatalogFilters, value: string) => void
}

const ACCESS_OPTIONS = [
  { value: 'todos', label: 'Todos' },
  { value: 'liberados', label: 'Liberados' },
  { value: 'bloqueados', label: 'Bloqueados' },
] as const

const ORDER_OPTIONS = [
  { value: 'antigos', label: 'mais antigos primeiro' },
  { value: 'recentes', label: 'mais recentes primeiro' },
  { value: 'az', label: 'de A a Z' },
  { value: 'za', label: 'de Z a A' },
] as const

const field =
  'flex min-h-[2.8rem] items-center gap-2.5 rounded-[0.6rem] border-2 border-input bg-card px-4 focus-within:outline-3 focus-within:outline-(--ring) focus-within:outline-offset-2'

/**
 * A busca e os filtros de "Todos os cursos" (direção de arte de 18/10/2026), com o estado na URL
 * pelo hook (`?q=&acesso=&ordem=`): o campo com a lupa, o acesso em botões visíveis (não mais numa
 * lista suspensa) e a ordem.
 */
export function CatalogFilterBar({ filters, onChange }: Props) {
  return (
    <div className="sz-card-sm flex flex-wrap items-center gap-3 p-3 sm:gap-4 sm:p-4">
      <label className={cn(field, 'min-w-0 flex-[1_1_16rem]')}>
        <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="sr-only">Buscar curso</span>
        <input
          type="search"
          value={filters.q}
          onChange={(event) => onChange('q', event.target.value)}
          placeholder="Buscar curso pelo nome"
          className="min-w-0 flex-1 bg-transparent py-2 text-foreground outline-none placeholder:text-muted-foreground"
        />
      </label>
      <div
        role="group"
        aria-label="Filtrar por acesso"
        className="sz-soft grid w-full grid-cols-3 gap-1 p-1 sm:flex sm:w-auto sm:gap-1.5 sm:p-1.5"
      >
        {ACCESS_OPTIONS.map((option) => {
          const pressed = filters.acesso === option.value
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={pressed}
              onClick={() => onChange('acesso', option.value)}
              className={cn(
                'sz-btn-sm px-1 text-[0.85rem] sm:px-[0.9rem] sm:text-[0.9rem]',
                pressed ? 'sz-btn' : 'sz-btn-quiet bg-transparent hover:bg-muted',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      <label
        className={cn(
          field,
          'relative min-w-0 flex-[1_1_16rem] px-3 text-[0.9rem] sm:flex-[0_0_19rem] sm:px-4 sm:text-base',
        )}
      >
        <span className="shrink-0 text-muted-foreground">Ordem:</span>
        <select
          value={filters.ordem}
          onChange={(event) => onChange('ordem', event.target.value)}
          className="min-w-0 flex-1 cursor-pointer appearance-none bg-transparent py-2 pr-7 text-foreground outline-none"
        >
          {ORDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 size-5 text-muted-foreground sm:right-3.5"
          aria-hidden
        />
      </label>
    </div>
  )
}
