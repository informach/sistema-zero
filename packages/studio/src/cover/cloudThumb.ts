/**
 * A miniatura que VIAJA na nuvem ("guardado na sua conta"): a capa do card reduzida até caber no
 * teto do índice do members (12 000 caracteres de data URL; acima disso o servidor DESCARTA, sem
 * erro). A foto do preview (320×192, JPEG 0,75, ~20 k chars) não cabe; 240×144 a 0,6 dá ~7 k e é
 * o tamanho em que o card das galerias a desenha (~246×122).
 *
 * Escada: a primeira combinação que cabe vence. Sem canvas (happy-dom, servidor) devolve `null`.
 * Cache de tamanho 1 SÓ para o que deu certo (a fonte só muda quando a capa muda; o produtor da
 * nuvem pede a cada subida): um `null` não é guardado, senão uma falha passageira (a imagem que
 * não decodificou a tempo) grudaria e a capa nunca mais subiria enquanto ela não mudasse.
 */

/** O teto do índice (`CREATION_LIMITS.maxThumbChars` do members e `MAX_THUMB_CHARS` do BFF). */
export const CLOUD_THUMB_MAX_CHARS = 12_000

/**
 * Prazo para a imagem decodificar. Um data URL decodifica em milissegundos; sem prazo, um
 * `<img>` que nunca dispara `load` nem `error` (visto em WebKit com a aba em segundo plano)
 * deixava o produtor da nuvem pendurado, e com ele a subida do projeto inteiro.
 */
export const CLOUD_THUMB_LOAD_TIMEOUT_MS = 3_000

const LADDER: ReadonlyArray<{ width: number; height: number; quality: number }> = [
  { width: 240, height: 144, quality: 0.6 },
  { width: 240, height: 144, quality: 0.45 },
  { width: 200, height: 120, quality: 0.5 },
  { width: 160, height: 96, quality: 0.5 },
]

let cached: { source: string; maxChars: number; result: string } | null = null

function loadImage(dataUrl: string, timeoutMs: number): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    let settled = false
    const finish = (value: HTMLImageElement | null) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(value)
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    const img = new Image()
    img.onload = () => finish(img)
    img.onerror = () => finish(null)
    img.src = dataUrl
  })
}

export async function buildCloudThumb(
  dataUrl: string,
  maxChars = CLOUD_THUMB_MAX_CHARS,
  options: { loadTimeoutMs?: number } = {},
): Promise<string | null> {
  if (!dataUrl.startsWith('data:image/')) return null
  if (dataUrl.length <= maxChars) return dataUrl
  if (cached && cached.source === dataUrl && cached.maxChars === maxChars) return cached.result
  const result = await shrink(
    dataUrl,
    maxChars,
    options.loadTimeoutMs ?? CLOUD_THUMB_LOAD_TIMEOUT_MS,
  )
  if (result !== null) cached = { source: dataUrl, maxChars, result }
  return result
}

async function shrink(
  dataUrl: string,
  maxChars: number,
  timeoutMs: number,
): Promise<string | null> {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  // O contexto ANTES da imagem: happy-dom devolve `null` e o `onload` nunca dispara (gotcha
  // do `downscaleToThumb`).
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const img = await loadImage(dataUrl, timeoutMs)
  if (!img) return null
  for (const step of LADDER) {
    try {
      canvas.width = step.width
      canvas.height = step.height
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, step.width, step.height)
      const scale = Math.max(step.width / img.width, step.height / img.height)
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (step.width - w) / 2, (step.height - h) / 2, w, h)
      const out = canvas.toDataURL('image/jpeg', step.quality)
      if (out.startsWith('data:image/') && out.length <= maxChars) return out
    } catch {
      return null
    }
  }
  return null
}

/** Só para testes: esquece a última redução. */
export function resetCloudThumbCacheForTests(): void {
  cached = null
}
