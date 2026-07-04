'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/** Densidade da tela (cap 2×) — retina revela o detalhe, então renderizamos mais alto. */
const DPR = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1

/**
 * Largura-alvo das texturas BASE (px) — usada em TODA folha da janela (inclusive as
 * vizinhas, p/ a animação de virar). Ciente da densidade: retina (2×) sobe p/ 2048px
 * (~248 DPI numa A4, vs. ~186 antes), tela comum fica em 1536 (memória enxuta). Cap 2048.
 */
const TEXTURE_WIDTH = Math.min(2048, Math.round(1536 * DPR))
/**
 * Largura da textura de ALTA RESOLUÇÃO das 2 páginas VISÍVEIS (spread em leitura),
 * renderizada SOB DEMANDA quando o aluno para numa página — deixa a leitura quase na
 * nitidez do PDF vetorial. Só ~2 texturas de cada vez (as vizinhas seguem na base), então
 * a memória fica contida. `min(3072, 2048·DPR)`: retina 3072 (~372 DPI), tela comum 2048.
 */
const HI_RES_WIDTH = Math.min(3072, Math.round(2048 * DPR))
/** Espera após PARAR de virar antes de gerar a alta resolução (não dispara em flips rápidos). */
const HI_RES_DEBOUNCE_MS = 280
/** Folhas (sheets) ao redor da atual com textura BASE garantida (±1 cobre a virada de 1 folha). */
const RENDER_WINDOW = 1
/** Folhas além das quais a textura base é descartada (evita thrash no limiar; > RENDER_WINDOW). */
const KEEP_WINDOW = 2

type PdfStatus = 'loading' | 'ready' | 'error'

export interface PdfPages {
  status: PdfStatus
  error: string | null
  numPages: number
  /** altura/largura da página 1 — define a proporção da geometria do livro. */
  pageAspect: number
  /** Bumpa quando texturas entram/saem — força o re-render dos materiais. */
  version: number
  /** Textura da página do PDF (1-based) — a de ALTA RES do spread visível vence a base; `null` se fora da janela. */
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

/** Rasteriza a página `num` do PDF numa `CanvasTexture` de `targetWidth` px de largura. */
async function renderPageTexture(
  // biome-ignore lint/suspicious/noExplicitAny: tipo do pdf.js carregado dinamicamente
  pdf: any,
  num: number,
  targetWidth: number,
): Promise<THREE.CanvasTexture> {
  const page = await pdf.getPage(num)
  const base = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({ scale: targetWidth / base.width })
  const canvas = document.createElement('canvas')
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas 2d indisponível')
  await page.render({ canvasContext: ctx, viewport }).promise
  page.cleanup()
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  // Texto fica legível mesmo com a página levemente inclinada (driver clampa no máx. da GPU).
  tex.anisotropy = 16
  return tex
}

/** Páginas do PDF cobertas pelas folhas [center-w, center+w] (folha i = páginas 2i+1 e 2i+2). */
function pagesForWindow(center: number, w: number, total: number): number[] {
  const from = Math.max(1, 2 * (center - w) + 1)
  const to = Math.min(total, 2 * (center + w) + 2)
  const pages: number[] = []
  for (let p = from; p <= to; p++) pages.push(p)
  return pages
}

/** As 2 páginas VISÍVEIS quando a folha `center` está aberta (esquerda 2·c, direita 2·c+1). */
function visiblePages(center: number, total: number): number[] {
  return [2 * center, 2 * center + 1].filter((p) => p >= 1 && p <= total)
}

/**
 * Baixa o PDF (rota autenticada do BFF — já vem com a marca d'água do aluno),
 * renderiza páginas em canvases via pdf.js e as expõe como texturas three.js,
 * com janela deslizante (folha atual ±1) + dispose das distantes — PDFs grandes
 * não explodem a memória de GPU. Com `opts.hiRes` (tela cheia), as 2 páginas
 * visíveis são re-renderizadas em ALTA resolução ao parar de virar (leitura nítida).
 */
export function usePdfPages(pdfUrl: string, opts?: { hiRes?: boolean }): PdfPages {
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
  // Alta resolução do spread VISÍVEL (só em tela cheia): mapa próprio + guarda de render + timer do debounce.
  const hiResRef = useRef(new Map<number, THREE.CanvasTexture>())
  const hiResRenderingRef = useRef(new Set<number>())
  const hiResTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hiResEnabledRef = useRef(false)
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
        const tex = await renderPageTexture(pdf, num, TEXTURE_WIDTH)
        if (disposedRef.current) {
          tex.dispose()
          return
        }
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

  // Alta resolução das 2 páginas visíveis (só quando `hiRes` está ligado). Descarta a
  // alta res de spreads antigos (só ~2 de cada vez) e re-aplica via bump de version.
  const ensureHiRes = useCallback(async () => {
    const pdf = pdfRef.current
    if (!pdf || disposedRef.current || !hiResEnabledRef.current) return
    const want = new Set(visiblePages(centerRef.current, pdf.numPages))

    let changed = false
    for (const [num, tex] of hiResRef.current) {
      if (!want.has(num)) {
        tex.dispose()
        hiResRef.current.delete(num)
        changed = true
      }
    }
    if (changed) setVersion((v) => v + 1) // volta pra base ANTES de a alta res sumir (sem frame órfão)

    for (const num of want) {
      if (disposedRef.current || !hiResEnabledRef.current) break
      if (hiResRef.current.has(num) || hiResRenderingRef.current.has(num)) continue
      hiResRenderingRef.current.add(num)
      try {
        const tex = await renderPageTexture(pdf, num, HI_RES_WIDTH)
        if (disposedRef.current || !hiResEnabledRef.current) {
          tex.dispose()
          continue
        }
        hiResRef.current.set(num, tex)
        setVersion((v) => v + 1)
      } catch (err) {
        console.warn('[ebook] falha ao renderizar página em alta resolução', { page: num, err })
      } finally {
        hiResRenderingRef.current.delete(num)
      }
    }
  }, [])

  const scheduleHiRes = useCallback(() => {
    if (hiResTimerRef.current) clearTimeout(hiResTimerRef.current)
    hiResTimerRef.current = setTimeout(() => {
      void ensureHiRes()
    }, HI_RES_DEBOUNCE_MS)
  }, [ensureHiRes])

  const disposeHiRes = useCallback(() => {
    if (hiResRef.current.size === 0) return
    for (const tex of hiResRef.current.values()) tex.dispose()
    hiResRef.current.clear()
    setVersion((v) => v + 1) // materiais voltam pra textura base
  }, [])

  // Liga/desliga a alta resolução (tela cheia). Ao ligar, agenda o render do spread
  // atual; ao desligar, cancela e descarta (a leitura inline usa a base, que já basta).
  useEffect(() => {
    hiResEnabledRef.current = Boolean(opts?.hiRes)
    if (opts?.hiRes) {
      scheduleHiRes()
    } else {
      if (hiResTimerRef.current) clearTimeout(hiResTimerRef.current)
      disposeHiRes()
    }
  }, [opts?.hiRes, scheduleHiRes, disposeHiRes])

  useEffect(() => {
    disposedRef.current = false
    let cancelled = false
    // Aborta o download no unmount/troca de aula — sem isso, cada saída da
    // página deixava um download "zumbi" do PDF inteiro (100MB+) saturando a
    // conexão do aluno e a memória do servidor (incidente 10/06).
    const aborter = new AbortController()

    async function load() {
      try {
        const [pdfjs, res] = await Promise.all([
          loadPdfjs(),
          fetch(pdfUrl, { signal: aborter.signal }),
        ])
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
        if (hiResEnabledRef.current) scheduleHiRes()
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
      aborter.abort()
      if (hiResTimerRef.current) clearTimeout(hiResTimerRef.current)
      for (const tex of texturesRef.current.values()) tex.dispose()
      texturesRef.current.clear()
      for (const tex of hiResRef.current.values()) tex.dispose()
      hiResRef.current.clear()
      void taskRef.current?.destroy()
      taskRef.current = null
      pdfRef.current = null
    }
  }, [pdfUrl, ensureWindow, scheduleHiRes])

  const setWindowCenter = useCallback(
    (sheet: number) => {
      centerRef.current = sheet
      void ensureWindow()
      if (hiResEnabledRef.current) scheduleHiRes()
    },
    [ensureWindow, scheduleHiRes],
  )

  const getTexture = useCallback(
    (pdfPageNumber: number) =>
      hiResRef.current.get(pdfPageNumber) ?? texturesRef.current.get(pdfPageNumber) ?? null,
    [],
  )

  return { status, error, numPages, pageAspect, version, getTexture, setWindowCenter }
}
