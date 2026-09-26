'use client'

import {
  type HelpCollectionView,
  type HelpTutorialEntry,
  searchHelpTutorials,
} from '@sistemazero/core/help'
import { ArrowRight, Search } from 'lucide-react'
import Link from 'next/link'
import { type KeyboardEvent, useId, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/cn'

const MAX_RESULTS = 8

/**
 * A busca do "Como fazer": roda no navegador, sobre a lista publicada, com a régua do core
 * (`searchHelpTutorials`: sem acento, prefixo de palavra, título valendo mais que o corpo).
 * O resultado abre o TUTORIAL exato, nunca a coleção (critério de aceite da dona).
 *
 * Toque e teclado: cada resultado é um link de 44px; a seta para baixo no campo leva ao
 * primeiro resultado e o contador anuncia pelo leitor de tela (`aria-live`).
 */
export function HelpSearch({
  tutorials,
  collections,
}: {
  tutorials: HelpTutorialEntry[]
  collections: HelpCollectionView[]
}) {
  const [query, setQuery] = useState('')
  const inputId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const collectionTitle = useMemo(
    () => new Map(collections.map((c) => [c.id, c.title])),
    [collections],
  )
  const hits = useMemo(() => searchHelpTutorials(tutorials, query, MAX_RESULTS), [tutorials, query])
  const digitou = query.trim().length >= 2

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && hits.length > 0) {
      event.preventDefault()
      listRef.current?.querySelector<HTMLAnchorElement>('a')?.focus()
    }
    if (event.key === 'Escape' && query) {
      event.preventDefault()
      setQuery('')
    }
  }

  return (
    <div className="sz-help-search">
      <label htmlFor={inputId} className="mb-2 block font-bold text-base text-foreground">
        O que você quer fazer?
      </label>
      <div className="relative">
        <Search
          className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-4 size-5 text-muted-foreground"
          aria-hidden
        />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ex.: ver meu jogo, camada, salvar"
          autoComplete="off"
          enterKeyHint="search"
          aria-describedby={`${inputId}-status`}
          className="h-14 w-full rounded-2xl border-2 border-(--input) bg-card pr-4 pl-12 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
        />
      </div>
      <p id={`${inputId}-status`} aria-live="polite" className="mt-2 text-muted-foreground text-sm">
        {!digitou
          ? 'Escreva uma palavra e a lista aparece aqui.'
          : hits.length === 0
            ? 'Nada com essas palavras. Tente outra, ou olhe as coleções abaixo.'
            : hits.length === 1
              ? '1 tutorial encontrado'
              : `${hits.length} tutoriais encontrados`}
      </p>
      {digitou && hits.length > 0 ? (
        <ul ref={listRef} className="mt-3 flex flex-col gap-2" aria-label="Resultados da busca">
          {hits.map(({ entry }) => (
            <li key={entry.id}>
              <Link
                href={`/como-fazer/${encodeURIComponent(entry.slug)}`}
                prefetch={false}
                className={cn(
                  'kids-card flex min-h-11 items-center gap-3 rounded-2xl bg-card px-4 py-3 text-left',
                  'transition-[transform,filter] hover:brightness-[1.02] focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 active:translate-y-[2px]',
                )}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-base text-foreground">{entry.title}</span>
                  <span className="block text-muted-foreground text-sm">
                    <span className="font-semibold">
                      {collectionTitle.get(entry.collectionId) ?? entry.collectionSlug}
                    </span>
                    {entry.summary ? ` · ${entry.summary}` : ''}
                  </span>
                </span>
                <ArrowRight className="size-5 shrink-0 text-primary" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
