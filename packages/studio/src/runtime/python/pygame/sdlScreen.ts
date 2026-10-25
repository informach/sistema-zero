/**
 * The window pygame-ce draws into, inside the protected worker.
 *
 * SDL's emscripten video driver copies the software screen to `Module.canvas` with
 * `createImageData` + `putImageData` on every `display.flip`. This canvas only keeps a copy of
 * those RGBA pixels; the frame transport carries them to the renderer. SDL also looks up a few
 * page objects (`screen`, `document`) that a worker does not have: they are given inert values,
 * and its DOM input listeners attach to nothing (input reaches Python with each frame).
 */
export interface PygameScreen {
  /** The canvas handed to Pyodide (`pyodide.canvas.setCanvas2D`). */
  canvas: object
  /** The RGBA pixels of the last flip, once (undefined when SDL has not drawn since). */
  take(): Uint8Array<ArrayBuffer> | undefined
}

export function createPygameScreen(): PygameScreen {
  let pixels: Uint8Array<ArrayBuffer> | undefined
  const context = Object.freeze({
    createImageData: (width: number, height: number) => new ImageData(width, height),
    // SDL reuses its ImageData for the next frame: keep a copy of what it shows now.
    putImageData(image: ImageData) {
      pixels = new Uint8Array(image.data)
    },
  })
  const canvas = {
    id: 'canvas',
    width: 0,
    height: 0,
    style: {},
    getContext: (kind: string) => (kind === '2d' ? context : null),
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 }),
  }
  return {
    canvas,
    take() {
      const frame = pixels
      pixels = undefined
      return frame
    },
  }
}

/**
 * The pixels of the flip that a frame of `width` × `height` shows. A screen of any other size
 * (SDL drew a window bigger than the game's surface) or no screen at all is a broken frame: it
 * fails here, by name, instead of the page showing the previous picture stretched or black.
 */
export function takeScreenPixels(
  screen: PygameScreen,
  width: number,
  height: number,
): Uint8Array<ArrayBuffer> {
  const pixels = screen.take()
  if (!pixels) throw new Error('O pygame-ce não desenhou a tela deste quadro.')
  if (pixels.byteLength !== width * height * 4) {
    const drawn = pixels.byteLength / 4
    throw new Error(
      `A tela do pygame-ce chegou com ${drawn} pixels, mas a janela tem ${width} × ${height} ` +
        `(${width * height}): o quadro não pode ser mostrado.`,
    )
  }
  return pixels
}

/** The page objects SDL reads, defined only where the worker has none. */
export function installSdlWorkerGlobals(scope: typeof globalThis = globalThis) {
  const inert = { configurable: false, enumerable: false, writable: false }
  if (!('screen' in scope))
    Object.defineProperty(scope, 'screen', {
      ...inert,
      value: Object.freeze({ width: 1920, height: 1080, availWidth: 1920, availHeight: 1080 }),
    })
  if (!('document' in scope))
    Object.defineProperty(scope, 'document', {
      ...inert,
      // Not frozen: emscripten may assign handlers on it, and a frozen object throws in
      // strict code.
      value: {
        querySelector: () => null,
        addEventListener() {},
        removeEventListener() {},
      },
    })
}
