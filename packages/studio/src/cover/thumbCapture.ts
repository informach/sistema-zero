import type { Project } from '#core'
import {
  MAX_PROJECT_THUMB_CHARS,
  PROJECT_THUMB_UPDATED_EVENT,
  writeProjectThumb,
} from '../state/persistence'
import { captureCoverFromProject } from './coverCapture'

/** Tamanho da miniatura do card (proporção do palco 800×480). */
const THUMB_WIDTH = 320
const THUMB_HEIGHT = 192

/**
 * Reduz um print (data URL) para a miniatura do card em JPEG. `null` fora do
 * browser / canvas indisponível (happy-dom) / resultado acima do teto.
 */
export async function downscaleToThumb(coverDataUrl: string): Promise<string | null> {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = THUMB_WIDTH
  canvas.height = THUMB_HEIGHT
  // Guarda o ctx ANTES do Image: happy-dom devolve ctx null e o onload nunca
  // dispara — sem esta ordem a promise pendura a suíte (gotcha do Pinta).
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        // ⚠️ Fundo OPACO antes de desenhar: o JPEG lá embaixo não tem canal alfa,
        // então qualquer área transparente do print viraria PRETO — foi assim que
        // a capa de um jogo de fundo laranja saiu toda preta (o fundo do palco é
        // CSS, não pixel, então o canvas cru vem transparente). Quem compõe o
        // fundo de verdade é o harness da captura, que conhece a cor do jogo;
        // isto aqui é a rede para QUALQUER origem de print, hoje ou amanhã.
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, THUMB_WIDTH, THUMB_HEIGHT)
        // cover-fit: preenche a miniatura preservando a proporção do print.
        const scale = Math.max(THUMB_WIDTH / img.width, THUMB_HEIGHT / img.height)
        const w = img.width * scale
        const h = img.height * scale
        ctx.drawImage(img, (THUMB_WIDTH - w) / 2, (THUMB_HEIGHT - h) / 2, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
        // toDataURL acima do teto do device devolve "data:," sem lançar.
        resolve(
          dataUrl.startsWith('data:image/') && dataUrl.length <= MAX_PROJECT_THUMB_CHARS
            ? dataUrl
            : null,
        )
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = coverDataUrl
  })
}

/**
 * Captura e grava a MINIATURA do projeto para o card da lista (fire-and-forget
 * ao sair do editor). Roda o projeto num iframe próprio no document.body —
 * sobrevive ao unmount do Studio — e avisa a lista pelo evento
 * `PROJECT_THUMB_UPDATED_EVENT` quando a gravação termina. Best-effort: sem
 * canvas/print/quota, o card só fica sem capa. NUNCA lança.
 */
export async function captureAndStoreProjectThumb(project: Project): Promise<void> {
  try {
    const cover = await captureCoverFromProject(project)
    if (!cover) return
    const thumb = await downscaleToThumb(cover)
    if (!thumb) return
    await writeProjectThumb(project.id, thumb)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PROJECT_THUMB_UPDATED_EVENT, { detail: project.id }))
    }
  } catch {
    // Best-effort de ponta a ponta.
  }
}
