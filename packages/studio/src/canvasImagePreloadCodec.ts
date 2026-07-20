/**
 * Marcadores reservados do invólucro gerado para pré-carregar imagens do Canvas.
 * A Ponte remove somente esse invólucro conhecido antes de analisar o código do
 * aluno; o corpo continua sendo JavaScript normal e editável.
 */
export const CANVAS_IMAGE_PRELOAD_MARKERS = {
  start: '/*__SZ_CANVAS_IMAGE_PRELOAD_START__*/',
  body: '/*__SZ_CANVAS_IMAGE_PRELOAD_BODY__*/',
  end: '/*__SZ_CANVAS_IMAGE_PRELOAD_END__*/',
} as const

/** Remove o invólucro gerado e devolve imports + corpo na indentação original. */
export function prepareCanvasImageSourceForParse(source: string): string {
  const start = source.indexOf(CANVAS_IMAGE_PRELOAD_MARKERS.start)
  if (start < 0) return source
  const bodyMarker = source.indexOf(CANVAS_IMAGE_PRELOAD_MARKERS.body, start)
  const end = source.indexOf(CANVAS_IMAGE_PRELOAD_MARKERS.end, bodyMarker)
  if (bodyMarker < 0 || end < 0) return source

  const before = source.slice(0, start).trimEnd()
  const bodyStart = bodyMarker + CANVAS_IMAGE_PRELOAD_MARKERS.body.length
  const wrappedBody = source
    .slice(bodyStart, end)
    .replace(/^\r?\n/, '')
    .replace(/\r?\n$/, '')
  const body = wrappedBody
    .split(/\r?\n/)
    .map((line) => (line.startsWith('  ') ? line.slice(2) : line))
    .join('\n')
  return [before, body].filter(Boolean).join('\n')
}
