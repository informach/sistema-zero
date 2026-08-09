import type { Project } from '#core'
import {
  MAX_PROJECT_THUMB_CHARS,
  PROJECT_THUMB_UPDATED_EVENT,
  writeProjectThumb,
} from '../state/persistence'
import { captureCoverFromProject } from './coverCapture'
import { consumeProjectSnapshot, type ProjectSnapshot, peekProjectSnapshot } from './latestSnapshot'

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
 * A miniatura a gravar, preferindo o que o PREVIEW já fotografou.
 *
 * ⭐ Caminho bom: enquanto a criança edita, o preview manda de tempos em tempos
 * uma foto do jogo que está rodando na tela (ver `preview/snapshotBridge.ts`).
 * Ela já vem no tamanho do card, então aqui é só usar — sem abrir iframe, sem
 * rodar o jogo de novo, sem depender de o navegador entregar quadros na saída,
 * que era exatamente o que falhava ("não é toda vez que tira o print, e quando
 * saiu foi só a cor de fundo").
 *
 * ⚠️ O caminho antigo continua como RESERVA e não é decoração: cobre quem nunca
 * abriu o preview (ficou só nos blocos), quem o deixou parado, e a foto que já
 * envelheceu. É lento e falível, mas é o único disponível nesses casos.
 */
interface ResolvedThumb {
  dataUrl: string
  snapshot?: ProjectSnapshot
}

async function resolveThumb(project: Project): Promise<ResolvedThumb | null> {
  const doPreview = peekProjectSnapshot(project.id)
  if (doPreview) return { dataUrl: doPreview.dataUrl, snapshot: doPreview }
  const cover = await captureCoverFromProject(project)
  if (!cover) return null
  const dataUrl = await downscaleToThumb(cover)
  return dataUrl ? { dataUrl } : null
}

/**
 * Captura e grava a MINIATURA do projeto para o card da lista (fire-and-forget
 * ao sair do editor). Usa a foto que o preview já tirou; sem ela, roda o projeto
 * num iframe próprio no document.body — que sobrevive ao unmount do Studio. Avisa
 * a lista pelo evento `PROJECT_THUMB_UPDATED_EVENT` quando a gravação termina.
 * Best-effort: sem canvas/print/quota, o card só fica sem capa. NUNCA lança.
 */
export async function captureAndStoreProjectThumb(project: Project): Promise<void> {
  try {
    const thumb = await resolveThumb(project)
    if (!thumb) return
    const stored = await writeProjectThumb(project.id, thumb.dataUrl)
    if (!stored) return
    if (thumb.snapshot) consumeProjectSnapshot(thumb.snapshot)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PROJECT_THUMB_UPDATED_EVENT, { detail: project.id }))
    }
  } catch {
    // Best-effort de ponta a ponta.
  }
}
