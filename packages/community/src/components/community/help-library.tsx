'use client'
import type { HelpCollectionView, HelpTutorialEntry } from '@sistemazero/core/help'
import { Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'
import { HelpCollectionGrid, HelpTutorialRows } from './help/help-presentation'

const normalize = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/**
 * A biblioteca "Como fazer" (direção de arte de 18/10/2026): a busca por palavra, as coleções em
 * cartões e os tutoriais em linhas. A busca começa com o `?q=` que a página Ajuda manda.
 */
export function HelpLibrary({
  collections,
  tutorials,
  unavailable = false,
  initialQuery = '',
  showCollections = true,
}: {
  collections: HelpCollectionView[]
  tutorials: HelpTutorialEntry[]
  unavailable?: boolean
  initialQuery?: string
  showCollections?: boolean
}) {
  const [query, setQuery] = useState(initialQuery)
  const router = useRouter()
  const searchId = useId()
  const needle = normalize(query.trim())
  const matches = tutorials.filter((item) =>
    normalize(`${item.title} ${item.summary} ${item.searchText}`).includes(needle),
  )

  if (unavailable)
    return (
      <div role="alert" className="sz-card flex flex-col items-start gap-4 p-6">
        <p className="m-0 font-bold">A biblioteca está indisponível agora.</p>
        <button type="button" className="sz-btn-outline" onClick={() => router.refresh()}>
          Tentar novamente
        </button>
      </div>
    )

  return (
    <div className="flex flex-col gap-10">
      <div className="flex max-w-[43rem] flex-col gap-2">
        <label htmlFor={searchId} className="sz-label">
          Buscar tutorial
        </label>
        <div className="flex min-h-[2.8rem] items-center gap-3 rounded-[0.6rem] border-2 border-input bg-card px-4 focus-within:outline focus-within:outline-3 focus-within:outline-(--ring) focus-within:outline-offset-2">
          <Search className="size-5 flex-none text-muted-foreground" aria-hidden />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ex.: aumentar a letra dos blocos"
            className="min-h-[2.6rem] w-full min-w-0 border-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {showCollections && !needle ? <HelpCollectionGrid collections={collections} /> : null}

      <section
        aria-label={needle ? 'Resultados da busca' : 'Tutoriais'}
        className="flex flex-col gap-4"
      >
        {needle ? (
          <p role="status" className="m-0 text-muted-foreground">
            {matches.length
              ? `${matches.length} ${matches.length === 1 ? 'tutorial encontrado' : 'tutoriais encontrados'}`
              : 'Nenhum tutorial encontrado.'}
          </p>
        ) : null}
        {matches.length ? (
          <HelpTutorialRows tutorials={matches} collections={collections} showCollection />
        ) : !needle ? (
          <p role="status" className="m-0 text-muted-foreground">
            Os tutoriais ainda não foram publicados. Você pode enviar sua dúvida pela página Ajuda.
          </p>
        ) : null}
      </section>

      <p className="m-0">
        Não encontrou o que procurava?{' '}
        <Link href="/ajuda" prefetch={false} className="sz-link">
          Falar com a equipe
        </Link>
      </p>
    </div>
  )
}
