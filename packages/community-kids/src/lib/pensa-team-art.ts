import type { StudioMoldaImportResult } from '@sistemazero/studio'

/**
 * A ARTE DA EQUIPE virando material do Estúdio (Pensa em equipe, 14/10/2026).
 *
 * Quem programa traz a arte que a COLEGA entregou numa missão do plano. O arquivo desce da
 * conta DELA (gzip de UM documento: o `.pinta.json` do Pinta, ou o JSON v1/v2 do Molda) e
 * nunca passou pela galeria deste perfil, então a conversão usa só o que os pacotes deixam
 * PÚBLICO e nunca lê nem grava a galeria daqui:
 *
 * - **Pinta**: `assetFromJson` (`@sistemazero/pinta/assets`, sem React) +
 *   `exportLoadedAssetForStudio` (`@sistemazero/pinta/studio-library`). O mapa de peças sem o
 *   conjunto dele volta como `needs-tileset`, com a frase do próprio Pinta.
 * - **Molda v1** (modelo, textura, céu): `readMoldaDocument` + `exportLoadedAssetForStudio`.
 * - **Molda v2** (cena): só existe exportação a partir do armazenamento da geração seguinte,
 *   então a cena é gravada num NAMESPACE TEMPORÁRIO só desta importação (`<perfil>-equipe`),
 *   exportada e apagada logo em seguida. ⚠️ O pacote do Molda é editado por OUTRA sessão e
 *   não pode ser tocado daqui: qualquer passo que falhe vira "Esse modelo ainda não viaja pela
 *   equipe." em vez de um erro técnico. O consentimento das perdas (`needs-review`) usa um
 *   token NOSSO (`equipe:<missão>:<revisão>`), porque o do Molda inclui a revisão do
 *   armazenamento temporário e muda a cada importação.
 *
 * Os módulos entram por `import()` (o subpath, NUNCA a raiz do Pinta; a raiz do Molda só no
 * caminho da cena, que é o único que precisa dela) e são injetáveis nos testes.
 */

export const TEAM_ART_MESSAGES = {
  gone: 'Essa arte não está mais na conta de quem fez. Peça para guardarem de novo.',
  network: 'Não consegui trazer essa arte agora. Confira a internet e tente de novo.',
  unreadable: 'Não consegui abrir essa arte da equipe. Peça para quem fez guardar de novo.',
  newer: 'Essa arte foi feita numa versão mais nova do Molda. Atualize a página e tente de novo.',
  scene: 'Esse modelo ainda não viaja pela equipe.',
  tooBig: 'Essa arte é grande demais para o Estúdio.',
  drawingFailed: 'Não consegui preparar esse desenho agora. Tente de novo.',
  creationFailed: 'Não consegui preparar essa criação agora. Tente de novo.',
  saveFailed: 'Não consegui guardar essa arte no seu Estúdio agora. Tente de novo.',
  unsupported: 'Este navegador não consegue abrir as artes da equipe.',
  review: 'Confira as mudanças nesta cópia.',
} as const

/** O desenho exportado do Pinta (espelho do `PintaExportedAsset`). */
export interface TeamPintaAsset {
  id: string
  name: string
  dataUrl: string
  width: number
  height: number
  sprite?: unknown
  tileset?: unknown
  tilemap?: unknown
}

export type TeamPintaConversion =
  | { ok: true; asset: TeamPintaAsset }
  | { ok: false; error: string; code?: 'too-big' | 'raster-failed' }

type MoldaAsset = Extract<StudioMoldaImportResult, { ok: true }>['asset']
export type TeamMoldaAsset = Omit<MoldaAsset, 'libRevision'>

export type TeamMoldaConversion =
  | { ok: true; asset: TeamMoldaAsset }
  | {
      ok: false
      error: string
      code?: 'too-big' | 'encode-failed' | 'needs-review'
      review?: { token: string; losses: string[] }
    }

/** A parte dos módulos do Pinta que a conversão usa (injetável nos testes). */
export interface PintaTeamModules {
  assetFromJson(text: string): { asset: unknown | null }
  exportLoadedAssetForStudio(
    asset: never,
  ): Promise<{ ok: true; asset: TeamPintaAsset } | { ok: false; reason: string; message?: string }>
}

async function loadPintaModules(): Promise<PintaTeamModules> {
  const [assets, library] = await Promise.all([
    import('@sistemazero/pinta/assets'),
    import('@sistemazero/pinta/studio-library'),
  ])
  return {
    assetFromJson: assets.assetFromJson,
    exportLoadedAssetForStudio: library.exportLoadedAssetForStudio,
  }
}

/** `.pinta.json` da colega → o payload do "Trazer do Pinta". */
export async function convertTeamPintaArt(
  json: string,
  load: () => Promise<PintaTeamModules> = loadPintaModules,
): Promise<TeamPintaConversion> {
  const modules = await load()
  const parsed = modules.assetFromJson(json)
  if (!parsed.asset) return { ok: false, error: TEAM_ART_MESSAGES.unreadable }
  const exported = await modules.exportLoadedAssetForStudio(parsed.asset as never)
  if (exported.ok) return { ok: true, asset: exported.asset }
  if (exported.reason === 'needs-tileset')
    return { ok: false, error: exported.message ?? TEAM_ART_MESSAGES.drawingFailed }
  if (exported.reason === 'asset-too-big' || exported.reason === 'sheet-too-big')
    return { ok: false, error: TEAM_ART_MESSAGES.tooBig, code: 'too-big' }
  return { ok: false, error: TEAM_ART_MESSAGES.drawingFailed, code: 'raster-failed' }
}

/** O resultado de exportação do Molda (espelho do `ExportForStudioResult`). */
type MoldaExportResult =
  | { ok: true; asset: TeamMoldaAsset & { bytes?: number; thumbDataUrl?: string | null } }
  | { ok: false; reason: 'not-found' | 'encode-failed' | 'asset-too-big' }
  | { ok: false; reason: 'needs-review'; review: { token: string; losses: string[] } }

interface MoldaExportContext {
  namespace?: string
  acceptedReview?: string
  persistence?: never
}

/** A fonte de nuvem da geração seguinte (espelho do `MoldaSceneCloudSource`). */
interface MoldaSceneSourceLike {
  inspect(json: string): { id: string; updatedAt: number } | null
  read(id: string): Promise<{ summary: { updatedAt: number } } | null>
  saveIfUnchanged(id: string, json: string, expectedUpdatedAt: number | null): Promise<boolean>
  removeIfUnchanged(id: string, expectedUpdatedAt: number | null): Promise<boolean>
}

/** A parte dos módulos do Molda que a conversão usa (injetável nos testes). */
export interface MoldaTeamModules {
  maxReadVersion: number
  readMoldaDocument(
    raw: unknown,
  ): { status: 'valid'; asset: unknown } | { status: 'unsupported' } | { status: 'invalid' }
  setMoldaStorageNamespace(namespace: string): void
  exportLoadedAssetForStudio(asset: never, context: MoldaExportContext): Promise<MoldaExportResult>
  exportAssetForStudio(id: string, context: MoldaExportContext): Promise<MoldaExportResult>
  /** Só a cena precisa da raiz do pacote (a fonte de nuvem e a persistência em memória). */
  loadScene(): Promise<{
    getMoldaStorageNamespace(): string
    setMoldaStorageNamespace(namespace: string): void
    createMoldaSceneCloudSource(): MoldaSceneSourceLike
    createMemoryPersistence(): unknown
  }>
}

async function loadMoldaModules(): Promise<MoldaTeamModules> {
  const [assets, library] = await Promise.all([
    import('@sistemazero/molda/assets'),
    import('@sistemazero/molda/studio-library'),
  ])
  return {
    maxReadVersion: assets.MOLDA_MAX_READ_VERSION,
    readMoldaDocument: assets.readMoldaDocument,
    setMoldaStorageNamespace: library.setMoldaStorageNamespace,
    exportLoadedAssetForStudio: library.exportLoadedAssetForStudio,
    exportAssetForStudio: library.exportAssetForStudio,
    async loadScene() {
      const app = await import('@sistemazero/molda')
      return {
        getMoldaStorageNamespace: app.getMoldaStorageNamespace,
        setMoldaStorageNamespace: app.setMoldaStorageNamespace,
        createMoldaSceneCloudSource: () =>
          app.createMoldaSceneCloudSource() as unknown as MoldaSceneSourceLike,
        createMemoryPersistence: () => app.createMemoryPersistence(),
      }
    },
  }
}

/** A versão que o documento DIZ ter; sem o campo, a geração v1. `null` = não é um documento. */
function formatVersionOf(raw: unknown): number | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const value = (raw as { formatVersion?: unknown }).formatVersion
  if (value === undefined) return 1
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : null
}

/** O namespace temporário da cena: nunca colide com um perfil (que é um uuid puro). */
export function teamImportNamespace(viewerId: string | null): string {
  return `${viewerId || 'conta'}-equipe`
}

/** O token do consentimento: muda quando a colega guarda uma versão nova. */
export function teamReviewToken(taskId: string, revision: number): string {
  return `equipe:${taskId}:${revision}`
}

function moldaFailure(result: Exclude<MoldaExportResult, { ok: true }>): TeamMoldaConversion {
  if (result.reason === 'asset-too-big')
    return { ok: false, error: TEAM_ART_MESSAGES.tooBig, code: 'too-big' }
  return { ok: false, error: TEAM_ART_MESSAGES.creationFailed, code: 'encode-failed' }
}

function moldaSuccess(result: Extract<MoldaExportResult, { ok: true }>): TeamMoldaConversion {
  const { id, name, kind, dataUrl, originalFileName, width, height } = result.asset
  return {
    ok: true,
    asset: {
      id,
      name,
      kind,
      dataUrl,
      originalFileName,
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
    },
  }
}

/** JSON v1/v2 do Molda da colega → o payload do "Trazer do Molda". */
export async function convertTeamMoldaArt(
  json: string,
  context: {
    viewerId: string | null
    taskId: string
    revision: number
    acceptedReview?: string
  },
  load: () => Promise<MoldaTeamModules> = loadMoldaModules,
): Promise<TeamMoldaConversion> {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, error: TEAM_ART_MESSAGES.unreadable }
  }
  const version = formatVersionOf(raw)
  if (version === null) return { ok: false, error: TEAM_ART_MESSAGES.unreadable }
  const modules = await load()
  if (version > modules.maxReadVersion) return { ok: false, error: TEAM_ART_MESSAGES.newer }
  if (version >= 2) return convertScene(json, context, modules)

  const read = modules.readMoldaDocument(raw)
  if (read.status === 'unsupported') return { ok: false, error: TEAM_ART_MESSAGES.newer }
  if (read.status !== 'valid') return { ok: false, error: TEAM_ART_MESSAGES.unreadable }
  const namespace = context.viewerId ?? ''
  // O mesmo cuidado do "Trazer do Molda": o cache de exportação é por namespace do perfil.
  modules.setMoldaStorageNamespace(namespace)
  const exported = await modules.exportLoadedAssetForStudio(read.asset as never, { namespace })
  if (exported.ok) return moldaSuccess(exported)
  if (exported.reason === 'needs-review') return { ok: false, error: TEAM_ART_MESSAGES.scene }
  return moldaFailure(exported)
}

async function convertScene(
  json: string,
  context: { viewerId: string | null; taskId: string; revision: number; acceptedReview?: string },
  modules: MoldaTeamModules,
): Promise<TeamMoldaConversion> {
  const sceneFailure: TeamMoldaConversion = { ok: false, error: TEAM_ART_MESSAGES.scene }
  let app: Awaited<ReturnType<MoldaTeamModules['loadScene']>>
  try {
    app = await modules.loadScene()
  } catch {
    return sceneFailure
  }
  const namespace = teamImportNamespace(context.viewerId)
  // A fonte de nuvem lê o namespace CORRENTE ao nascer: troca, cria e devolve no mesmo
  // instante (síncrono, nada roda no meio), e a fonte segue presa ao armazenamento temporário.
  const previous = app.getMoldaStorageNamespace()
  let source: MoldaSceneSourceLike
  try {
    app.setMoldaStorageNamespace(namespace)
    source = app.createMoldaSceneCloudSource()
  } catch {
    return sceneFailure
  } finally {
    app.setMoldaStorageNamespace(previous)
  }
  const summary = (() => {
    try {
      return source.inspect(json)
    } catch {
      return null
    }
  })()
  if (!summary) return sceneFailure
  try {
    // Uma importação anterior que caiu no meio pode ter deixado a cena aqui: grava POR CIMA.
    const leftover = await source.read(summary.id)
    const saved = await source.saveIfUnchanged(
      summary.id,
      json,
      leftover ? leftover.summary.updatedAt : null,
    )
    if (!saved) return sceneFailure
    const exportContext: MoldaExportContext = {
      namespace,
      // Inventário v1 VAZIO: a cena da colega nunca é confundida com uma criação deste perfil.
      persistence: app.createMemoryPersistence() as never,
    }
    let exported = await modules.exportAssetForStudio(summary.id, exportContext)
    const ourToken = teamReviewToken(context.taskId, context.revision)
    if (!exported.ok && exported.reason === 'needs-review') {
      if (context.acceptedReview !== ourToken) {
        return {
          ok: false,
          error: TEAM_ART_MESSAGES.review,
          code: 'needs-review',
          review: { token: ourToken, losses: [...exported.review.losses] },
        }
      }
      exported = await modules.exportAssetForStudio(summary.id, {
        ...exportContext,
        acceptedReview: exported.review.token,
      })
    }
    if (exported.ok) return moldaSuccess(exported)
    if (exported.reason === 'not-found' || exported.reason === 'needs-review') return sceneFailure
    return moldaFailure(exported)
  } catch {
    return sceneFailure
  } finally {
    // Apaga em seguida: a cena era só da importação.
    try {
      const current = await source.read(summary.id)
      if (current) await source.removeIfUnchanged(summary.id, current.summary.updatedAt)
    } catch {
      // Sobrou no armazenamento temporário: a próxima importação grava por cima.
    }
  }
}
