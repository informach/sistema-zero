'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/** Largura-alvo das texturas (px) — legível no livro sem estourar a memória. */
const TEXTURE_WIDTH = 1280
/** Folhas (sheets) ao redor da atual com textura garantida. */
const RENDER_WINDOW = 2
/** Folhas além das quais a textura é descartada (evita thrash no limiar). */
const KEEP_WINDOW = 4

type PdfStatus = 'loading' | 'ready' | 'error'

export interface PdfPages {
  status: PdfStatus
  error: string | null
  numPages: number
  /** altura/largura da página 1 — define a proporção da geometria do livro. */
  pageAspect: number
  /** Bumpa quando texturas entram/saem — força o re-render dos materiais. */
  version: number
  /** Textura da página do PDF (1-based) — `null` se fora da janela/renderizando. */
  getTexture: (pdfPageNumber: number) => THREE.Texture | null
  /** Centraliza a janela de render na folha atual (folha = 2 páginas). */
  setWindowCenter: (sheet: number) => void
}

// pdf.js exige UM worker global — singleton de módulo (HMR/remontagens não vazam).
let workerReady = false
async function loadPdfjs() {
  const pdfjs = await import('pdfjs-dist')
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url),
      { type: 'module' },
    )
    workerReady = true
  }
  return pdfjs
}

/** Páginas do PDF cobertas pelas folhas [center-w, center+w] (folha i = páginas 2i+1 e 2i+2). */
function pagesForWindow(center: number, w: number, total: number): number[] {
  const from = Math.max(1, 2 * (center - w) + 1)
  const to = Math.min(total, 2 * (center + w) + 2)
  const pages: number[] = []
  for (let p = from; p <= to; p++) pages.push(p)
  return pages
}

/**
 * Baixa o PDF (rota autenticada do BFF — já vem com a marca d'água do aluno),
 * renderiza páginas em canvases via pdf.js e as expõe como texturas three.js,
 * com janela deslizante (folha atual ±2) + dispose das distantes — PDFs grandes
 * não explodem a memória de GPU.
 */
export function usePdfPages(pdfUrl: string): PdfPages {
  const [status, setStatus] = useState<PdfStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const [numPages, setNumPages] = useState(0)
  const [pageAspect, setPageAspect] = useState(Math.SQRT2) // A4 retrato até o PDF abrir
  const [version, setVersion] = useState(0)

  // biome-ignore lint/suspicious/noExplicitAny: tipo do pdf.js carregado dinamicamente
  const pdfRef = useRef<any>(null)
  // O destroy fica no loadingTask (PDFDocumentProxy não expõe mais destroy no v6).
  // biome-ignore lint/suspicious/noExplicitAny: tipo do pdf.js carregado dinamicamente
  const taskRef = useRef<any>(null)
  const texturesRef = useRef(new Map<number, THREE.CanvasTexture>())
  const renderingRef = useRef(new Set<number>())
  const centerRef = useRef(0)
  const disposedRef = useRef(false)

  const ensureWindow = useCallback(async () => {
    const pdf = pdfRef.current
    if (!pdf || disposedRef.current) return

    const needed = pagesForWindow(centerRef.current, RENDER_WINDOW, pdf.numPages)
    const keep = new Set(pagesForWindow(centerRef.current, KEEP_WINDOW, pdf.numPages))

    // Descarta texturas longe da janela (back-pressure de memória de GPU).
    let changed = false
    for (const [num, tex] of texturesRef.current) {
      if (!keep.has(num)) {
        tex.dispose()
        texturesRef.current.delete(num)
        changed = true
      }
    }

    // Renderiza as que faltam — sequencial (não compete com o frame loop do three).
    for (const num of needed) {
      if (disposedRef.current) return
      if (texturesRef.current.has(num) || renderingRef.current.has(num)) continue
      renderingRef.current.add(num)
      try {
        const page = await pdf.getPage(num)
        const base = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({ scale: TEXTURE_WIDTH / base.width })
        const canvas = document.createElement('canvas')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('canvas 2d indisponível')
        await page.render({ canvasContext: ctx, viewport }).promise
        page.cleanup()
        if (disposedRef.current) return
        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = 4
        texturesRef.current.set(num, tex)
        changed = true
        setVersion((v) => v + 1) // textura nova → materiais re-aplicam o map
      } catch (err) {
        console.warn('[ebook] falha ao renderizar página', { page: num, err })
      } finally {
        renderingRef.current.delete(num)
      }
    }
    if (changed) setVersion((v) => v + 1)
  }, [])

  useEffect(() => {
    disposedRef.current = false
    let cancelled = false

    async function load() {
      try {
        const [pdfjs, res] = await Promise.all([loadPdfjs(), fetch(pdfUrl)])
        if (!res.ok) throw new Error(`Falha ao baixar o e-book (${res.status})`)
        const data = new Uint8Array(await res.arrayBuffer())
        const task = pdfjs.getDocument({ data })
        taskRef.current = task
        const pdf = await task.promise
        if (cancelled) {
          void task.destroy()
          return
        }
        pdfRef.current = pdf
        const first = await pdf.getPage(1)
        const vp = first.getViewport({ scale: 1 })
        setPageAspect(vp.height / vp.width)
        setNumPages(pdf.numPages)
        setStatus('ready')
        void ensureWindow()
      } catch (err) {
        if (cancelled) return
        console.error('[ebook] falha ao carregar o PDF', err)
        setError(err instanceof Error ? err.message : 'Falha ao carregar o e-book.')
        setStatus('error')
      }
    }
    void load()

    return () => {
      cancelled = true
      disposedRef.current = true
      for (const tex of texturesRef.current.values()) tex.dispose()
      texturesRef.current.clear()
      void taskRef.current?.destroy()
      taskRef.current = null
      pdfRef.current = null
    }
  }, [pdfUrl, ensureWindow])

  const setWindowCenter = useCallback(
    (sheet: number) => {
      centerRef.current = sheet
      void ensureWindow()
    },
    [ensureWindow],
  )

  const getTexture = useCallback(
    (pdfPageNumber: number) => texturesRef.current.get(pdfPageNumber) ?? null,
    [],
  )

  return { status, error, numPages, pageAspect, version, getTexture, setWindowCenter }
}
