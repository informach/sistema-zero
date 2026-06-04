'use client'

import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Book3D } from './book-3d'
import { usePdfPages } from './use-pdf-pages'

/**
 * Livro 3D interativo do bloco e-book: baixa o PDF (já com a marca d'água do
 * aluno), renderiza as páginas como texturas e deixa o aluno virar as folhas
 * (clique nas páginas ou botões) e rotacionar levemente o livro (drag —
 * OrbitControls com ângulos restritos). Carregado via `dynamic ssr:false`.
 */
export default function EbookBookImpl({ pdfUrl, title }: { pdfUrl: string; title: string | null }) {
  const pdf = usePdfPages(pdfUrl)
  /** Folhas viradas: 0 = capa fechada … totalSheets = contracapa. */
  const [page, setPage] = useState(0)
  const totalSheets = Math.ceil(pdf.numPages / 2)

  // Janela de texturas acompanha a folha atual (render lazy ±2 folhas).
  useEffect(() => {
    if (pdf.status === 'ready') pdf.setWindowCenter(page)
  }, [page, pdf.status, pdf.setWindowCenter])

  function flipTo(next: number) {
    setPage(Math.max(0, Math.min(totalSheets, next)))
  }

  // Rótulo do spread atual: capa → "Capa"; miolo → "2–3 de 24"; fim → última.
  const leftPage = 2 * page
  const rightPage = 2 * page + 1
  const label =
    page === 0
      ? 'Capa'
      : rightPage <= pdf.numPages
        ? `${leftPage}–${rightPage} de ${pdf.numPages}`
        : `${Math.min(leftPage, pdf.numPages)} de ${pdf.numPages}`

  return (
    <figure className="w-full">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-gradient-to-b from-zinc-800 to-zinc-950">
        {pdf.status === 'error' ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-300">
            {pdf.error ?? 'Não foi possível carregar o e-book.'}
          </div>
        ) : pdf.status === 'loading' ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-zinc-300">
            <div className="size-6 animate-spin rounded-full border-2 border-zinc-500 border-t-white" />
            Preparando seu e-book…
          </div>
        ) : (
          <>
            <Canvas dpr={[1, 2]} camera={{ position: [0, 0.4, 2.6], fov: 42 }}>
              <ambientLight intensity={1.1} />
              <directionalLight position={[2, 4, 3]} intensity={1.4} />
              <directionalLight position={[-2, 2, -2]} intensity={0.4} />
              <Book3D pdf={pdf} page={page} onFlip={flipTo} />
              <OrbitControls
                enablePan={false}
                enableZoom={false}
                minPolarAngle={Math.PI / 3}
                maxPolarAngle={Math.PI / 1.7}
                minAzimuthAngle={-Math.PI / 5}
                maxAzimuthAngle={Math.PI / 5}
              />
            </Canvas>

            {/* Controles HTML (acessíveis por teclado — o clique nas páginas é atalho) */}
            <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3">
              <button
                type="button"
                aria-label="Página anterior"
                disabled={page === 0}
                onClick={() => flipTo(page - 1)}
                className="rounded-full bg-black/55 p-2 text-white backdrop-blur transition-opacity hover:bg-black/75 disabled:opacity-35"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="min-w-24 rounded-full bg-black/55 px-3 py-1.5 text-center text-xs text-white backdrop-blur">
                {label}
              </span>
              <button
                type="button"
                aria-label="Próxima página"
                disabled={page >= totalSheets}
                onClick={() => flipTo(page + 1)}
                className="rounded-full bg-black/55 p-2 text-white backdrop-blur transition-opacity hover:bg-black/75 disabled:opacity-35"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </>
        )}
      </div>
      {title ? (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">{title}</figcaption>
      ) : null}
    </figure>
  )
}
