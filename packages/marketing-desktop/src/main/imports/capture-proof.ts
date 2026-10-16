import { app, type BrowserWindow } from 'electron'
import { z } from 'zod'

/** Hidden review windows can retain an older capturePage surface after a layout
 * change. Ask the compositor for the current surface; never edit the screenshot. */
export async function captureProof(window: BrowserWindow) {
  if (app.isPackaged) throw new Error('Captura de revisão restrita ao desenvolvimento')
  const debuggerApi = window.webContents.debugger
  if (debuggerApi.isAttached()) throw new Error('A janela já está sendo inspecionada')
  debuggerApi.attach('1.3')
  try {
    const result = z
      .object({
        data: z
          .string()
          .min(1)
          .max(32 * 1024 * 1024),
      })
      .parse(
        await debuggerApi.sendCommand('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: false,
          fromSurface: true,
        }),
      )
    return Buffer.from(result.data, 'base64')
  } finally {
    debuggerApi.detach()
  }
}
