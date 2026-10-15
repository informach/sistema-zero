/**
 * Depois de uma ação que some com o próprio botão (Apagar, Desagrupar), o foco iria para o
 * `<body>`, FORA da oficina, e os atalhos (Ctrl+Z, Delete) paravam de responder. O palco 3D é
 * o destino estável: ele está sempre montado e é focável.
 */
export function focusWorkshopStage(from: Element | null) {
  const canvas = from
    ?.closest('.mld-workshop')
    ?.querySelector<HTMLCanvasElement>('.mld-workshop-stage canvas[tabindex]')
  canvas?.focus({ preventScroll: true })
}
