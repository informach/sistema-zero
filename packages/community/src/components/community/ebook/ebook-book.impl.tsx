'use client'

import { OrbitControls } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Book3D } from './book-3d'
import { usePdfPages } from './use-pdf-pages'

/**
 * Livro 3D interativo do bloco e-book: baixa o PDF (já com a marca d'água do
 * aluno), renderiza as páginas como texturas e deixa o aluno virar as folhas
 * (clique nas páginas ou botões) e inclinar levemente o livro (drag —
 * OrbitControls com ângulos restritos). `Canvas flat` (sem tone mapping) mantém
 * o texto com contraste total. Fullscreen custom no CONTAINER (Fullscreen API,
 * mesmo padrão do player de vídeo); zoom por scroll SÓ em tela cheia (fora dela
 * o wheel rolaria a página da aula). Carregado via `dynamic ssr:false`.
 */
export default function EbookBookImpl({ pdfUrl, title }: { pdfUrl: string; title: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pdf = usePdfPages(pdfUrl)
  /** Folhas viradas: 0 = capa fechada … totalSheets = contracapa. */
  const [page, setPage] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const totalSheets = Math.ceil(pdf.numPages / 2)

  // Janela de texturas acompanha a folha atual (render lazy ±2 folhas).
  useEffect(() => {
    if (pdf.status === 'ready') pdf.setWindowCenter(page)
  }, [page, pdf.status, pdf.setWindowCenter])

  // Sincroniza o estado do botão com a Fullscreen API (Esc, F11, etc.).
  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await containerRef.current?.requestFullscreen()
    } catch {
      // navegador pode bloquear sem gesto válido — silencioso
    }
  }

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
      <div
        ref={containerRef}
        className={`group/ebook relative w-full overflow-hidden border border-border bg-[radial-gradient(120%_120%_at_50%_0%,#26303f_0%,#161c27_50%,#0c1118_100%)] ${
          isFullscreen ? 'h-full rounded-none' : 'aspect-video rounded-lg'
        }`}
      >
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
            {/* `flat` = sem tone mapping (ACES lavaria o branco do papel e o contraste do texto). */}
            <Canvas flat dpr={[1, 2]} camera={{ position: [0, 0.1, 3.1], fov: 40 }}>
              <ambientLight intensity={1.25} />
              <directionalLight position={[1.5, 3, 4]} intensity={0.55} />
              <Book3D pdf={pdf} page={page} onFlip={flipTo} />
              <OrbitControls
                enablePan={false}
                enableZoom={isFullscreen}
                minDistance={1.4}
                maxDistance={4.2}
                minPolarAngle={Math.PI / 2 - 0.45}
                maxPolarAngle={Math.PI / 2 + 0.3}
                minAzimuthAngle={-Math.PI / 6}
                maxAzimuthAngle={Math.PI / 6}
              />
            </Canvas>

            <button
              type="button"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
              className="absolute right-3 top-3 rounded-lg bg-black/50 p-2 text-white/90 opacity-0 transition-opacity hover:bg-black/70 focus-visible:opacity-100 group-hover/ebook:opacity-100"
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>

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
