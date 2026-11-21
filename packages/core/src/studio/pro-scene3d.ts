/** Exact derived projections; arbitrary executable material paths remain forbidden. */
export const STUDIO_PRO_SCENE3D_MODULE = 'studio-generated/molda-cenarios.mjs'
export const STUDIO_PRO_SCENE3D_RUNTIME = 'studio-generated/molda-cenarios-runtime.mjs'
export const STUDIO_PRO_SCENE3D_TYPES = 'studio-generated/molda-cenarios.d.mts'

export function isStudioProScene3DFile(path: string): boolean {
  return (
    path === STUDIO_PRO_SCENE3D_MODULE ||
    path === STUDIO_PRO_SCENE3D_RUNTIME ||
    path === STUDIO_PRO_SCENE3D_TYPES
  )
}

/**
 * Um material de cenário que o módulo derivado entrega ao SDK do Pro: só dados. O `dado3d` é a
 * descrição da cena que o próprio runtime confere ao carregar.
 */
export interface StudioProScene3DMaterial {
  id: string
  name: string
  kind: string
  source?: string
  originalFileName?: string
  dado3d?: unknown
  url: string
  mime: string
  bytes: number
  sha256: string
}

const MODULE_HEAD =
  /^\/\/ SDK [a-f0-9]{64}\nimport \{ criarSDKPro \} from '\.\/molda-cenarios-runtime\.mjs'\nconst sdk=criarSDKPro\(JSON\.parse\(/
const MODULE_TAIL =
  "),new URL(import.meta.env?.BASE_URL??'./',document.baseURI).href)\nexport const {carregar,instalar,instalado,inicio,encerrar}=sdk\n"
const MATERIAL_KEYS = new Set([
  'id',
  'name',
  'kind',
  'source',
  'originalFileName',
  'dado3d',
  'url',
  'mime',
  'bytes',
  'sha256',
])

/** Um endereço dentro do projeto, relativo à página: sem esquema, sem barra inicial, sem `..`. */
function relativeProjectUrl(url: string): boolean {
  return (
    !/^[a-z][a-z0-9+.-]*:/i.test(url) &&
    !url.startsWith('/') &&
    !url.includes('\\') &&
    ![...url].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127) &&
    url.split('/').every((part) => part !== '' && part !== '.' && part !== '..')
  )
}

/**
 * O módulo `molda-cenarios.mjs` do Pro, sempre neste modelo: o Estúdio o escreve no navegador e o
 * servidor do build o REESCREVE a partir dos dados (R3 da revisão de 20/11/2026). Ele só chama o
 * runtime com a lista dos materiais e o endereço base da página.
 */
export function renderStudioProScene3DModule(
  materials: readonly StudioProScene3DMaterial[],
  sdkSha256: string,
): string {
  if (!/^[a-f0-9]{64}$/.test(sdkSha256)) throw new Error('Identidade do SDK inválida.')
  const data = JSON.stringify(materials)
  return `// SDK ${sdkSha256}\nimport { criarSDKPro } from './molda-cenarios-runtime.mjs'\nconst sdk=criarSDKPro(JSON.parse(${JSON.stringify(data)}${MODULE_TAIL}`
}

/**
 * Lê os materiais de um módulo `molda-cenarios.mjs` que chegou ao servidor. Devolve `null` para
 * qualquer coisa fora do modelo: um módulo com código além do modelo, dados que não são a lista
 * de materiais, um endereço fora do projeto. O servidor nunca usa o texto que chegou; ele escreve
 * o módulo de novo com estes dados.
 */
export function readStudioProScene3DModule(text: string): StudioProScene3DMaterial[] | null {
  const head = MODULE_HEAD.exec(text)
  if (!head || !text.endsWith(MODULE_TAIL)) return null
  const literal = text.slice(head[0].length, text.length - MODULE_TAIL.length)
  let parsed: unknown
  try {
    const data: unknown = JSON.parse(literal)
    if (typeof data !== 'string') return null
    parsed = JSON.parse(data)
  } catch {
    return null
  }
  if (!Array.isArray(parsed) || parsed.length > 256) return null
  const materials: StudioProScene3DMaterial[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null
    const entry = item as Record<string, unknown>
    if (Object.keys(entry).some((key) => !MATERIAL_KEYS.has(key))) return null
    const text = (value: unknown, max: number): value is string =>
      typeof value === 'string' && value.length > 0 && value.length <= max
    const optional = (value: unknown, max: number) =>
      value === undefined || (typeof value === 'string' && value.length <= max)
    if (
      !text(entry.id, 200) ||
      !text(entry.name, 200) ||
      !text(entry.kind, 40) ||
      !optional(entry.source, 40) ||
      !optional(entry.originalFileName, 255) ||
      !text(entry.url, 240) ||
      !relativeProjectUrl(entry.url) ||
      !text(entry.mime, 120) ||
      typeof entry.bytes !== 'number' ||
      !Number.isSafeInteger(entry.bytes) ||
      entry.bytes < 0 ||
      typeof entry.sha256 !== 'string' ||
      !/^[a-f0-9]{64}$/.test(entry.sha256)
    )
      return null
    materials.push({
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      ...(entry.source === undefined ? {} : { source: entry.source as string }),
      ...(entry.originalFileName === undefined
        ? {}
        : { originalFileName: entry.originalFileName as string }),
      ...(entry.dado3d === undefined ? {} : { dado3d: entry.dado3d }),
      url: entry.url,
      mime: entry.mime,
      bytes: entry.bytes,
      sha256: entry.sha256,
    })
  }
  return materials
}
