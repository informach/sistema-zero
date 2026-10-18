'use client'
import type { HelpCollectionView, HelpTutorialEntry } from '@sistemazero/core/help'
import { Button } from '@sistemazero/ui/button'
import { Input } from '@sistemazero/ui/input'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
export function HelpLibrary({
  collections,
  tutorials,
  unavailable = false,
}: {
  collections: HelpCollectionView[]
  tutorials: HelpTutorialEntry[]
  unavailable?: boolean
}) {
  const [query, setQuery] = useState('')
  const router = useRouter()
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  const needle = normalize(query.trim())
  const matches = tutorials.filter((item) =>
    normalize(`${item.title} ${item.summary} ${item.searchText}`).includes(needle),
  )
  return (
    <div className="space-y-6">
      <header>
        <h1 className="sz-display text-3xl">Como fazer</h1>
        <p className="mt-2 text-muted-foreground">
          Consulte tutoriais sobre a plataforma e as ferramentas.
        </p>
      </header>
      {unavailable ? (
        <div role="alert">
          <p>A biblioteca está indisponível agora.</p>
          <Button variant="outline" onClick={() => router.refresh()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          <label className="grid gap-2">
            Buscar tutorial
            <Input value={query} onChange={(event) => setQuery(event.target.value)} type="search" />
          </label>
          <nav className="flex flex-wrap gap-4">
            {collections
              .filter((item) => item.publishedCount > 0)
              .map((item) => (
                <Link
                  key={item.id}
                  className="text-primary underline"
                  href={`/como-fazer/colecao/${encodeURIComponent(item.slug)}`}
                >
                  {item.title}
                </Link>
              ))}
          </nav>
          {matches.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {matches.map((item) => (
                <Link
                  key={item.id}
                  href={`/como-fazer/${encodeURIComponent(item.slug)}`}
                  className="rounded-2xl bg-card p-5"
                >
                  <p className="text-sm text-muted-foreground">
                    {collections.find((collection) => collection.id === item.collectionId)?.title}
                  </p>
                  <h2 className="font-semibold text-lg">{item.title}</h2>
                  <p className="mt-2 text-sm">{item.summary}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p role="status">
              {needle
                ? 'Nenhum tutorial encontrado.'
                : 'Os tutoriais ainda não foram publicados. Você pode enviar sua dúvida pela área de ajuda.'}
            </p>
          )}
        </>
      )}
      <Link href="/ajuda" className="text-primary underline">
        Falar com a equipe
      </Link>
    </div>
  )
}
