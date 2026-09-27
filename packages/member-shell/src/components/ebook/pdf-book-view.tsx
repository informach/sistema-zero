'use client'

import { Button } from '@sistemazero/ui/button'
import dynamic from 'next/dynamic'
import { Component, type ReactNode, useState } from 'react'

const EbookBook = dynamic(() => import('./ebook-book.impl'), {
  ssr: false,
  loading: () => (
    <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-muted/30 text-sm text-muted-foreground">
      Carregando o livro 3D…
    </div>
  ),
})

const EbookReader = dynamic(() => import('./ebook-reader'), { ssr: false })

class BookBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

/** A mesma leitura 3D/páginas para e-books e PDFs de materiais da aula. */
export function PdfBookView({
  pdfUrl,
  title,
  onOpened,
}: {
  pdfUrl: string
  title: string | null
  onOpened?: () => void
}) {
  const [reader, setReader] = useState(false)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          variant={reader ? 'outline' : 'default'}
          aria-pressed={!reader}
          onClick={() => setReader(false)}
        >
          Livro 3D
        </Button>
        <Button
          variant={reader ? 'default' : 'outline'}
          aria-pressed={reader}
          onClick={() => setReader(true)}
        >
          Ler por páginas
        </Button>
      </div>
      {reader ? (
        <EbookReader pdfUrl={pdfUrl} onOpened={() => onOpened?.()} />
      ) : (
        <BookBoundary
          fallback={
            <div className="rounded-xl border p-4">
              <p>O livro 3D não abriu neste dispositivo.</p>
              <Button variant="outline" onClick={() => setReader(true)}>
                Ler por páginas
              </Button>
            </div>
          }
        >
          <EbookBook pdfUrl={pdfUrl} title={title} onOpened={onOpened} />
        </BookBoundary>
      )}
    </div>
  )
}
