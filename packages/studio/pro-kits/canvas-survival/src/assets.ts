import {
  CHARACTER_ROLES,
  type CharacterBinding,
  type CharacterRole,
  characters,
} from './characters'

/** Portable consumer of Studio's serialized ProAssetManifest, not a second asset format. */
export interface SpriteAnimation {
  name: string
  from: number
  to: number
  fps: number
  loop: boolean
}
export interface SpriteMeta {
  frameW: number
  frameH: number
  animations: SpriteAnimation[]
  hitbox?: { x: number; y: number; w: number; h: number }
}
export interface ArenaManifestEntry {
  id: string
  name: string
  kind: string
  path: string
  url: string
  mime: string
  bytes: number
  sha256: string
  width?: number
  height?: number
  sprite?: SpriteMeta
}
export interface LoadedCharacter {
  image: CanvasImageSource
  width: number
  height: number
  sprite?: SpriteMeta
  binding: CharacterBinding
  /** Includes bytes AND metadata, because a Pinta edit preserves the material's ID. */
  resourceKey: string
}
export interface CharacterBody {
  offsetX: number
  offsetY: number
  width: number
  height: number
}
export interface ArenaAssets {
  roles: Record<CharacterRole, LoadedCharacter>
  revision: string
  collisionBodies(): Partial<Record<CharacterRole, CharacterBody>>
  dispose(): void
}
export const ASSET_LIMITS = {
  maxAxis: 4096,
  maxPixels: 4_194_304,
  maxTotalPixels: 8_388_608,
  maxPngBytes: 600_000,
  maxManifestBytes: 1_000_000,
  timeoutMs: 15_000,
} as const
const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
function fail(field: string): never {
  throw new Error(`Material da arena inválido: ${field}.`)
}
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)
const integer = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
const positive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
const validPath = (path: unknown): path is string =>
  typeof path === 'string' &&
  path.length <= 240 &&
  path.startsWith('public/') &&
  path.split('/').every((part) => /^[A-Za-z0-9._-]+$/.test(part) && !part.startsWith('.'))

export function pngDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 33 || PNG_SIGNATURE.some((byte, index) => bytes[index] !== byte))
    fail('assinatura PNG')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.getUint32(8) !== 13 || String.fromCharCode(...bytes.subarray(12, 16)) !== 'IHDR')
    fail('cabeçalho PNG')
  const width = view.getUint32(16),
    height = view.getUint32(20)
  if (
    !width ||
    !height ||
    width > ASSET_LIMITS.maxAxis ||
    height > ASSET_LIMITS.maxAxis ||
    width * height > ASSET_LIMITS.maxPixels
  )
    fail('dimensões PNG acima do limite')
  return { width, height }
}

function spriteMeta(raw: unknown, name: string): SpriteMeta | undefined {
  if (raw === undefined) return undefined
  if (
    !record(raw) ||
    !integer(raw.frameW, 1, ASSET_LIMITS.maxAxis) ||
    !integer(raw.frameH, 1, ASSET_LIMITS.maxAxis) ||
    !Array.isArray(raw.animations) ||
    !raw.animations.length ||
    raw.animations.length > 32
  )
    fail(`${name}: sprite`)
  const names = new Set<string>()
  const animations = raw.animations.map((animation: unknown) => {
    if (
      !record(animation) ||
      typeof animation.name !== 'string' ||
      !animation.name.trim() ||
      animation.name.length > 48 ||
      names.has(animation.name) ||
      !integer(animation.from, 0, 4_194_304) ||
      !integer(animation.to, 0, 4_194_304) ||
      animation.to < animation.from ||
      !integer(animation.fps, 1, 1000) ||
      typeof animation.loop !== 'boolean'
    )
      fail(`${name}: animação`)
    names.add(animation.name)
    return {
      name: animation.name,
      from: animation.from,
      to: animation.to,
      fps: animation.fps,
      loop: animation.loop,
    }
  })
  let hitbox: SpriteMeta['hitbox']
  if (raw.hitbox !== undefined) {
    const box = raw.hitbox
    if (
      !record(box) ||
      typeof box.x !== 'number' ||
      typeof box.y !== 'number' ||
      !Number.isFinite(box.x) ||
      !Number.isFinite(box.y) ||
      box.x < 0 ||
      box.y < 0 ||
      !positive(box.w) ||
      !positive(box.h) ||
      box.x + box.w > 1 ||
      box.y + box.h > 1
    )
      fail(`${name}: hitbox`)
    hitbox = { x: box.x, y: box.y, w: box.w, h: box.h }
  }
  return { frameW: raw.frameW, frameH: raw.frameH, animations, ...(hitbox ? { hitbox } : {}) }
}

export function parseArenaManifest(value: unknown): ArenaManifestEntry[] {
  if (
    !record(value) ||
    value.version !== 1 ||
    !Array.isArray(value.assets) ||
    value.assets.length > 128
  )
    fail('versão ou lista do manifesto')
  const ids = new Set<string>(),
    paths = new Set<string>()
  return value.assets.map((raw: unknown) => {
    if (
      !record(raw) ||
      typeof raw.id !== 'string' ||
      !raw.id ||
      raw.id.length > 64 ||
      ids.has(raw.id) ||
      typeof raw.name !== 'string' ||
      !validPath(raw.path) ||
      raw.url !== raw.path.slice(7) ||
      paths.has(raw.path.toLowerCase()) ||
      typeof raw.kind !== 'string' ||
      typeof raw.mime !== 'string' ||
      !integer(raw.bytes, 1, 33_000_000) ||
      typeof raw.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(raw.sha256)
    )
      fail('entrada, caminho ou identificador do manifesto')
    ids.add(raw.id)
    paths.add(raw.path.toLowerCase())
    for (const key of ['width', 'height'] as const)
      if (raw[key] !== undefined && !integer(raw[key], 1, 1_000_000)) fail(`${raw.name}: ${key}`)
    return {
      id: raw.id,
      name: raw.name,
      kind: raw.kind,
      path: raw.path,
      url: raw.url,
      mime: raw.mime,
      bytes: raw.bytes,
      sha256: raw.sha256,
      ...(raw.width === undefined ? {} : { width: raw.width as number }),
      ...(raw.height === undefined ? {} : { height: raw.height as number }),
      ...(raw.sprite === undefined ? {} : { sprite: spriteMeta(raw.sprite, raw.name) }),
    }
  })
}

export function validateCharacter(
  binding: CharacterBinding,
  entry: ArenaManifestEntry,
  width: number,
  height: number,
): void {
  if (
    !positive(binding.displayWidth) ||
    !positive(binding.displayHeight) ||
    binding.displayWidth > 720 ||
    binding.displayHeight > 540 ||
    !['fixed', 'sprite'].includes(binding.collision)
  )
    fail(`${entry.name}: tamanho ou colisão do binding`)
  if (
    (entry.width !== undefined && entry.width !== width) ||
    (entry.height !== undefined && entry.height !== height)
  )
    fail(`${entry.name}: dimensões não correspondem ao manifesto`)
  const sprite = entry.sprite
  if (binding.collision === 'sprite' && !sprite)
    fail(`${entry.name}: metadado de sprite exigido pela colisão`)
  if (!sprite) return
  if (width % sprite.frameW || height % sprite.frameH)
    fail(`${entry.name}: quadros não dividem a folha`)
  const count = (width / sprite.frameW) * (height / sprite.frameH)
  for (const animation of sprite.animations)
    if (animation.to >= count) fail(`${entry.name}: frame fora do atlas em ${animation.name}`)
  for (const state of ['idle', 'walk', 'hurt', 'death'] as const)
    if (!sprite.animations.some((animation) => animation.name === binding.animations[state]))
      fail(`${entry.name}: animação ${state} (${binding.animations[state]}) ausente`)
}

export function characterBody(character: LoadedCharacter): CharacterBody | undefined {
  if (character.binding.collision !== 'sprite') return undefined
  const box = character.sprite?.hitbox ?? { x: 0, y: 0, w: 1, h: 1 }
  const { displayWidth: w, displayHeight: h } = character.binding
  return {
    offsetX: -w / 2 + box.x * w,
    offsetY: -h / 2 + box.y * h,
    width: box.w * w,
    height: box.h * h,
  }
}

async function digest(bytes: Uint8Array): Promise<string> {
  const result = await crypto.subtle.digest('SHA-256', new Uint8Array(bytes))
  return Array.from(new Uint8Array(result), (byte) => byte.toString(16).padStart(2, '0')).join('')
}
async function readBounded(
  response: Response,
  limit: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  if (!response.ok || !response.body)
    throw new Error(`Não foi possível carregar material (${response.status}).`)
  if (Number(response.headers.get('content-length')) > limit)
    fail('arquivo acima do limite de bytes')
  const reader = response.body.getReader(),
    chunks: Uint8Array[] = []
  let length = 0
  const abort = () => {
    void reader.cancel(signal.reason).catch(() => {})
  }
  signal.addEventListener('abort', abort, { once: true })
  try {
    while (true) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) break
      length += value.byteLength
      if (length > limit) fail('arquivo acima do limite de bytes')
      chunks.push(value)
    }
    const result = new Uint8Array(length)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }
    return result
  } finally {
    signal.removeEventListener('abort', abort)
    void reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

interface DecodedImage {
  image: CanvasImageSource
  width: number
  height: number
  dispose(): void
}
async function decodePng(bytes: Uint8Array, signal: AbortSignal): Promise<DecodedImage> {
  signal.throwIfAborted()
  const blob = new Blob([new Uint8Array(bytes)], { type: 'image/png' })
  if (typeof createImageBitmap === 'function') {
    const image = await createImageBitmap(blob)
    if (signal.aborted) {
      image.close()
      signal.throwIfAborted()
    }
    return { image, width: image.width, height: image.height, dispose: () => image.close() }
  }
  const url = URL.createObjectURL(blob),
    image = new Image()
  try {
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        cleanup()
        image.src = ''
        reject(signal.reason)
      }
      const cleanup = () => {
        image.onload = null
        image.onerror = null
        signal.removeEventListener('abort', abort)
      }
      image.onload = () => {
        cleanup()
        resolve()
      }
      image.onerror = () => {
        cleanup()
        reject(new Error('Não foi possível decodificar o PNG.'))
      }
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) abort()
      else image.src = url
    })
    signal.throwIfAborted()
    return {
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => {
        image.src = ''
      },
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function loadArenaAssets(
  options: {
    signal?: AbortSignal
    baseUrl?: string
    manifestUrl?: string
    bindings?: Record<CharacterRole, CharacterBinding>
    timeoutMs?: number
  } = {},
): Promise<ArenaAssets> {
  const bindings = structuredClone(options.bindings ?? characters)
  const base = new URL('./', options.baseUrl ?? document.baseURI)
  if (!['http:', 'https:'].includes(base.protocol))
    fail('use um servidor HTTP para executar o jogo')
  const manifestUrl = new URL(options.manifestUrl ?? 'studio-assets/manifest.json', base)
  if (manifestUrl.origin !== base.origin) fail('manifesto externo')
  const controller = new AbortController(),
    { signal } = controller
  const resources = new Map<string, DecodedImage>()
  let disposed = false
  const dispose = () => {
    if (disposed) return
    disposed = true
    controller.abort(new DOMException('Carregamento descartado.', 'AbortError'))
    for (const resource of resources.values()) resource.dispose()
    resources.clear()
  }
  const abort = () => controller.abort(options.signal?.reason)
  options.signal?.addEventListener('abort', abort, { once: true })
  if (options.signal?.aborted) abort()
  const timeoutMs = options.timeoutMs ?? ASSET_LIMITS.timeoutMs
  if (!positive(timeoutMs) || timeoutMs > 60_000) {
    options.signal?.removeEventListener('abort', abort)
    fail('prazo de carregamento')
  }
  const timeout = setTimeout(
    () =>
      controller.abort(
        new DOMException('O material demorou demais. Tente novamente.', 'TimeoutError'),
      ),
    timeoutMs,
  )
  // An unabortable browser decode may complete late. Race the whole attempt while
  // the worker checks the signal after decode and closes its own late result.
  let rejectAbort: ((reason: unknown) => void) | undefined
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject
  })
  const onAbort = () => rejectAbort?.(signal.reason)
  signal.addEventListener('abort', onAbort, { once: true })
  if (signal.aborted) onAbort()
  const work = async (): Promise<ArenaAssets> => {
    const raw = await readBounded(
      await fetch(manifestUrl, {
        signal,
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
      }),
      ASSET_LIMITS.maxManifestBytes,
      signal,
    )
    const entries = parseArenaManifest(JSON.parse(new TextDecoder().decode(raw)))
    const roles = {} as Record<CharacterRole, LoadedCharacter>
    let pixels = 0
    for (const role of CHARACTER_ROLES) {
      signal.throwIfAborted()
      const binding = bindings[role],
        entry = entries.find((item) => item.id === binding.assetId)
      if (!entry) fail(`${role}: asset ${binding.assetId} não encontrado; copie o ID em Materiais`)
      if (
        entry.kind !== 'image' ||
        entry.mime !== 'image/png' ||
        entry.bytes > ASSET_LIMITS.maxPngBytes
      )
        fail(`${entry.name}: use PNG dentro do limite`)
      let decoded = resources.get(entry.sha256)
      if (!decoded) {
        const url = new URL(entry.url, base)
        url.searchParams.set('sha256', entry.sha256)
        const bytes = await readBounded(
          await fetch(url, { signal, cache: 'no-store', credentials: 'omit', redirect: 'error' }),
          ASSET_LIMITS.maxPngBytes,
          signal,
        )
        if (bytes.byteLength !== entry.bytes || (await digest(bytes)) !== entry.sha256)
          fail(`${entry.name}: hash/tamanho divergente; execute a revisão atual`)
        const dimensions = pngDimensions(bytes)
        pixels += dimensions.width * dimensions.height
        if (pixels > ASSET_LIMITS.maxTotalPixels)
          fail(`${entry.name}: total de pixels acima do limite`)
        decoded = await decodePng(bytes, signal)
        if (signal.aborted || disposed) {
          decoded.dispose()
          signal.throwIfAborted()
          throw new DOMException('Descartado.', 'AbortError')
        }
        if (decoded.width !== dimensions.width || decoded.height !== dimensions.height) {
          decoded.dispose()
          fail(`${entry.name}: dimensões decodificadas divergentes`)
        }
        resources.set(entry.sha256, decoded)
      }
      validateCharacter(binding, entry, decoded.width, decoded.height)
      const resourceKey = entry.sha256 + ':' + JSON.stringify(entry.sprite ?? null)
      roles[role] = {
        image: decoded.image,
        width: decoded.width,
        height: decoded.height,
        binding,
        sprite: entry.sprite,
        resourceKey,
      }
    }
    signal.throwIfAborted()
    const revision = await digest(
      new TextEncoder().encode(
        JSON.stringify(
          CHARACTER_ROLES.map((role) => [role, roles[role].resourceKey, roles[role].binding]),
        ),
      ),
    )
    signal.throwIfAborted()
    return {
      roles,
      revision,
      collisionBodies() {
        return Object.fromEntries(
          CHARACTER_ROLES.flatMap((role) => {
            const body = characterBody(roles[role])
            return body ? [[role, body]] : []
          }),
        )
      },
      dispose,
    }
  }
  try {
    return await Promise.race([work(), aborted])
  } catch (error) {
    dispose()
    throw error
  } finally {
    clearTimeout(timeout)
    signal.removeEventListener('abort', onAbort)
    options.signal?.removeEventListener('abort', abort)
  }
}
