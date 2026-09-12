'use client'

import { Button } from '@sistemazero/ui/button'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { useEffect, useRef, useState } from 'react'
import { fetchPdf, loadPdfjs } from './pdf-source'

/** The same protected PDF, rendered one page at a time without WebGL. */
export default function EbookReader({
  pdfUrl,
  onOpened,
}: {
  pdfUrl: string
  onOpened: () => void
}) {
  return <ReaderSession key={pdfUrl} pdfUrl={pdfUrl} onOpened={onOpened} />
}

function ReaderSession({ pdfUrl, onOpened }: { pdfUrl: string; onOpened: () => void }) {
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(100)
  const [request, setRequest] = useState({ url: pdfUrl })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const canvas = useRef<HTMLCanvasElement>(null)
  const opened = useRef(onOpened)
  opened.current = onOpened
  useEffect(() => {
    const controller = new AbortController()
    let task: PDFDocumentLoadingTask | undefined
    setPdf(null)
    setReady(false)
    setError('')
    setPage(1)
    void (async () => {
      try {
        const response = await fetchPdf(request.url, controller.signal)
        const data = await response.arrayBuffer()
        const library = await loadPdfjs()
        if (controller.signal.aborted) return
        task = library.getDocument({ data })
        const document = await task.promise
        if (!controller.signal.aborted) setPdf(document)
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error ? failure.message : 'Não foi possível abrir o material.',
          )
      }
    })()
    return () => {
      controller.abort()
      void task?.destroy()
    }
  }, [request])
  useEffect(() => {
    if (!pdf || !canvas.current) return
    const target = canvas.current
    let cancelled = false
    let render: RenderTask | undefined
    setReady(false)
    setError('')
    setText('')
    void (async () => {
      try {
        const sheet = await pdf.getPage(page)
        if (cancelled) return
        const base = sheet.getViewport({ scale: 1 })
        const viewport = sheet.getViewport({ scale: 1600 / base.width })
        const buffer = document.createElement('canvas')
        buffer.width = Math.ceil(viewport.width)
        buffer.height = Math.ceil(viewport.height)
        render = sheet.render({ canvas: buffer, viewport })
        await render.promise
        if (cancelled) return
        target.width = buffer.width
        target.height = buffer.height
        const drawing = target.getContext('2d')
        if (!drawing) throw new Error('Leitura indisponível neste dispositivo')
        drawing.drawImage(buffer, 0, 0)
        setReady(true)
        opened.current()
        const content = await sheet.getTextContent()
        if (!cancelled)
          setText(
            content.items
              .map((item) => ('str' in item ? `${item.str}${item.hasEOL ? '\n' : ' '}` : ''))
              .join(''),
          )
      } catch {
        if (!cancelled)
          setError('Não foi possível mostrar esta página. Tente abrir novamente ou baixe o PDF.')
      }
    })()
    return () => {
      cancelled = true
      render?.cancel()
    }
  }, [pdf, page])
  return (
    <div className="space-y-3 rounded-2xl border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          disabled={!pdf || page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </Button>
        <span className="text-sm" aria-live="polite">
          Página {page}
          {pdf ? ` de ${pdf.numPages}` : ''}
        </span>
        <Button
          variant="outline"
          disabled={!pdf || page >= pdf.numPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </Button>
        <Button
          variant="ghost"
          aria-label="Diminuir página"
          disabled={zoom === 100}
          onClick={() => setZoom((z) => z - 25)}
        >
          −
        </Button>
        <span className="text-sm">{zoom}%</span>
        <Button
          variant="ghost"
          aria-label="Aumentar página"
          disabled={zoom === 200}
          onClick={() => setZoom((z) => z + 25)}
        >
          +
        </Button>
      </div>
      {error ? (
        <p role="alert">
          {error}{' '}
          <Button variant="outline" onClick={() => setRequest({ url: pdfUrl })}>
            Abrir novamente
          </Button>
        </p>
      ) : (
        !ready && <p role="status">Preparando a página…</p>
      )}
      <div className="overflow-auto" style={{ maxHeight: '75vh' }}>
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Página ${page} do caderno. O texto extraído está disponível abaixo.`}
          className={ready ? 'block h-auto' : 'hidden'}
          style={{ width: `${zoom}%`, maxWidth: 'none' }}
        />
      </div>
      {text && (
        <details>
          <summary className="cursor-pointer py-2 text-sm">Ler o texto desta página</summary>
          <p className="whitespace-pre-wrap p-3 text-sm leading-relaxed">{text}</p>
        </details>
      )}
    </div>
  )
}
