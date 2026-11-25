/**
 * Sincronia "editei o desenho no Pinta → o jogo se atualiza sozinho".
 *
 * O elo já existia: todo asset vindo da biblioteca pessoal guarda
 * `libId: 'personal:<id>'`, e esse `<id>` É o id do desenho no Pinta. O que
 * faltava é que o asset do projeto é uma CÓPIA dos bytes, não uma referência —
 * então alguém precisa reescrever os pixels dentro de cada projeto.
 *
 * Divisão de trabalho (deliberada):
 * - o **Pinta** só reemite o desenho na biblioteca ao salvar (upsert por id,
 *   exatamente o que o "Usar no Estúdio" já faz) — ele não conhece, e não deve
 *   conhecer, o armazenamento de projetos do Estúdio;
 * - o **Estúdio** reconcilia quando volta ao foco. O projeto ABERTO passa pela
 *   store em memória (sem corrida com o autosave) e os demais pela partição de
 *   assets no IndexedDB.
 *
 * A criança não vê nada disso acontecer: a troca é silenciosa. Só a RECUSA
 * aparece (ver `failures`), senão o jogo ficaria com a arte velha e ela acharia
 * que deu certo.
 *
 * Desde 09/2026 a mesma sincronia serve ao MOLDA: um modelo (`.glb`), céu (`.hdr`)
 * ou textura (`.png`) trazido pelo "Trazer do Molda" também guarda
 * `libId: 'personal:<id>'` e, salvo lá, regrava a biblioteca pessoal com o `kind`
 * dele (a volta da ponte, `resyncToStudio` do host). Nos 3D o `originalFileName`
 * viaja junto: sem ele o load do projeto DESCARTA o asset.
 */

import { canonicalJson } from '@sistemazero/core/creations'
import type { PintaImageDerivation } from '@sistemazero/core/studio/pinta-image'
import type { StudioRuntimeCatalog } from '@sistemazero/core/studio/runtime-catalog'
import {
  PINTA_SCENE_RUNTIME_MESSAGE,
  pintaImageRuntimeCompatible,
} from '../runtime/pintaImageCompatibility'
import { mergeDrawingIntoAsset, PERSONAL_LIB_PREFIX, personalIdOf } from './personalAssetMerge'
import { pintaMapWorld, pintaWorldNeedsInventory } from './pintaMapWorld'

export { mergeDrawingIntoAsset, personalIdOf } from './personalAssetMerge'

type DrawingContent = {
  dataUrl: string
  scene?: unknown
  tilemap?: unknown
  tilemapFront?: unknown
}

/**
 * O que a biblioteca MANDA no material do jogo: os bytes, e a cena e os mapas quando o
 * desenho os define. `tileset` e `sprite` ficam de fora de propósito: a criança os configura
 * no Estúdio (`updateAssetMeta`) e o desenho não os conhece; compará-los dava "precisa
 * sincronizar" para sempre, com cada varredura regravando o jogo sem mudar nada.
 *
 * Desenho COM cena é a fonte inteira do mapa: `tilemap`/`tilemapFront` ausentes nele querem
 * dizer "este mapa saiu do envelope antigo", e o material que ainda os guarda está velho.
 * Desenho sem cena só compara o mapa que ele traz (o do jogo pode ter sido montado aqui).
 */
function sameDrawingContent(asset: DrawingContent, drawing: DrawingContent): boolean {
  if (asset.dataUrl !== drawing.dataUrl) return false
  const same = (a: unknown, b: unknown) => canonicalJson(a ?? null) === canonicalJson(b ?? null)
  if (drawing.scene !== undefined)
    return (
      same(asset.scene, drawing.scene) &&
      same(asset.tilemap, drawing.tilemap) &&
      same(asset.tilemapFront, drawing.tilemapFront)
    )
  return (
    (drawing.tilemap === undefined || same(asset.tilemap, drawing.tilemap)) &&
    (drawing.tilemapFront === undefined || same(asset.tilemapFront, drawing.tilemapFront))
  )
}

import { ulid } from 'ulid'
import { PROJECT_ASSET_LIMITS, type ProjectAsset, projectAssetBudgetChars } from '#core'
import { perfSpanAsync } from '../core/perf'
import { PRIVATE_REGIONAL_PROJECT } from '../core/pintaRegionalReference'
import { idsDosRecursosDeCena3D } from '../core/scene3d/referencias'
import {
  listProjectSummariesLight,
  loadProjectAssetsSnapshotById,
  persistProjectAssets,
} from '../state/persistence'
import { preparePintaMapBundle } from '../state/pintaMapBundle'
import {
  captureProjectStorageScope,
  isPrivateRegionalProjectScope,
  type ProjectStorageScope,
} from '../state/projectStorageRuntime'
import type { ProjectStoreApi } from '../state/projectStore'
import type { StudioPintaImportedAsset, StudioPintaLibraryAdapter } from '../studio/pinta-library'
import {
  getPersonalAsset,
  getPersonalAssets,
  getPersonalAssetsNamespace,
  type PersonalAsset,
  personalAssetsChangeToken,
  readPersonalAssetInventory,
  savePersonalAsset,
} from './personal'

interface DrawingSyncState {
  lastSyncToken: string
  didInitialSweep: boolean
  inFlight: Promise<DrawingSyncResult> | null
  inFlightAdapter?: StudioPintaLibraryAdapter | null
  inFlightSignal?: AbortSignal
  inFlightRuntimeCatalog?: () => StudioRuntimeCatalog | null
  inFlightStore?: ProjectStoreApi
  token?: object
  controller?: AbortController
  pendingFailures: string[]
}

interface DrawingSyncContext {
  namespace: string
  storageScope: ProjectStorageScope
  state: DrawingSyncState
  canonicalChanged?: boolean
  callerSignal?: AbortSignal
  runtimeCatalog?: () => StudioRuntimeCatalog | null
  mapInventory?: Promise<PersonalAsset[]>
  attemptedWorlds?: Map<string, Set<string>>
  canonicalWriteRefused?: boolean
  python?: {
    signal: AbortSignal
    attemptedOpen: Set<string>
    current: () => boolean
    resolver: () => Promise<ReturnType<typeof import('./pintaImageSync').createPintaImageSync>>
  }
}

/** Estado independente por perfil + banco capturados. Trocar de perfil nunca compartilha o
 * single-flight, o relógio nem as mensagens da conta anterior. */
const syncStates = new Map<string, DrawingSyncState>()

function syncIdentity(namespace: string, scope: ProjectStorageScope): string {
  return `${namespace}\u0000${scope.identity}`
}

function captureSyncContext(): DrawingSyncContext {
  const namespace = getPersonalAssetsNamespace()
  const storageScope = captureProjectStorageScope()
  const identity = syncIdentity(namespace, storageScope)
  let state = syncStates.get(identity)
  if (!state) {
    state = { lastSyncToken: '', didInitialSweep: false, inFlight: null, pendingFailures: [] }
    syncStates.set(identity, state)
  }
  return { namespace, storageScope, state }
}

function isContextActive(context: DrawingSyncContext): boolean {
  return (
    getPersonalAssetsNamespace() === context.namespace &&
    !context.storageScope.signal?.aborted &&
    captureProjectStorageScope().identity === context.storageScope.identity
  )
}

/** Drena as recusas pendentes (a UI mostra uma vez e esquece). */
export function takeDrawingSyncFailures(): string[] {
  const state = captureSyncContext().state
  const failures = state.pendingFailures
  state.pendingFailures = []
  return failures
}

export interface DrawingSyncResult {
  /** Assets trocados no projeto que está aberto no editor. */
  updatedInOpenProject: number
  /** Assets trocados em projetos fechados. */
  updatedInOtherProjects: number
  /** Recusas (cota estourada, imagem inválida) — a UI mostra estas. */
  failures: string[]
}

/** Sempre um objeto NOVO: devolver uma constante compartilhada convidaria o
 *  chamador a mutar `failures` e contaminar a próxima chamada. */
const emptyResult = (): DrawingSyncResult => ({
  updatedInOpenProject: 0,
  updatedInOtherProjects: 0,
  failures: [],
})

/** A varredura cede a thread principal a cada N projetos (ver `sweep`). */
const SWEEP_YIELD_EVERY = 4

/** Deixa o navegador respirar (entrada, pintura) entre lotes da varredura. */
function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  if (scheduler?.yield) return scheduler.yield()
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * The Molda's 360° sky enters a Raylib project as its panorama PNG (`raylibReadyCreation`: the
 * desktop raylib does not open .hdr), so the project holds an IMAGE of an `environment3d`
 * record. A newer sky in the Molda becomes a new panorama here, and then it syncs like any
 * image; the same revision is not converted again (the conversion is not free).
 */
export async function raylibSkyAsImage(
  asset: ProjectAsset,
  drawing: PersonalAsset | null,
): Promise<PersonalAsset | null> {
  if (!drawing || asset.kind !== 'image' || drawing.kind !== 'environment3d') return drawing
  if ((drawing.origin ?? asset.libOrigin) !== 'molda') return drawing
  if (asset.libRevision === drawing.updatedAt) return null
  try {
    const { skyPanoramaPng } = await import('../components/assets/skyPanorama')
    const panorama = skyPanoramaPng(drawing.dataUrl)
    return {
      ...drawing,
      kind: 'image',
      dataUrl: panorama.dataUrl,
      width: panorama.width,
      height: panorama.height,
      originalFileName: undefined,
    }
  } catch {
    return null
  }
}

/** Content, not timestamps, decides whether a canonical personal copy needs an update. */
export function drawingNeedsSync(asset: ProjectAsset, drawing: PersonalAsset | null): boolean {
  if (!drawing) return false
  if (asset.kind === 'audio') return false
  // Tipo cruzado (um registro pessoal reaproveitado por outro tipo) nunca sincroniza:
  // um `.glb` no lugar de uma imagem quebraria o jogo em silêncio.
  if (drawing.kind !== asset.kind) return false
  // Origem cruzada idem: um registro do Molda no id de um desenho do Pinta (ou o
  // inverso) não é "o mesmo desenho, mais novo". Só recusa com as DUAS marcas presentes;
  // legado sem `libOrigin` ou registro sem `origin` segue pelos bytes.
  if (drawing.origin && asset.libOrigin && drawing.origin !== asset.libOrigin) return false
  if (sameDrawingContent(asset, drawing)) return false
  return true
}

/**
 * "Guardado na sua conta": um jogo que DESCE de outro aparelho traz os desenhos dele já
 * atualizados, mas a biblioteca "Meus desenhos" deste aparelho é LOCAL (por aparelho) e
 * pode estar com a versão velha. Sem isto, a varredura acima via "bytes diferentes",
 * REVERTIA o jogo para o desenho velho e subia — e o outro aparelho reaplicava o novo:
 * pingue-pongue, uma subida a cada uso. Regra: os desenhos que chegam com um jogo
 * restaurado são adotados pela biblioteca (só os que ELA já tem — "Usar no Estúdio"
 * continua sendo a decisão explícita da criança) e, de tabela, entram nos outros jogos
 * daqui pela varredura normal. Nunca lança; falha de biblioteca não derruba o restauro.
 */
export async function reconcileDrawingsFromRestoredProject(
  project: { assets?: ProjectAsset[]; updatedAt?: number },
  options?: { namespace?: string },
): Promise<{ projectChanged: boolean }> {
  let projectChanged = false
  const nextAssets = [...(project.assets ?? [])]
  // UMA leitura em lote da biblioteca (não uma por asset): o restauro roda dentro do
  // orçamento da descida, e 30 projetos × 5 desenhos eram 150 leituras sequenciais.
  const personalIds = nextAssets
    .filter(
      (asset): asset is ProjectAsset =>
        !!asset &&
        asset.kind !== 'audio' &&
        asset.kind !== 'font' &&
        asset.pintaImage === undefined,
    )
    .map((asset) => personalIdOf(asset))
    .filter((id): id is string => id !== null)
  const drawings =
    personalIds.length > 0 ? await getPersonalAssets(personalIds, options) : new Map()
  for (let index = 0; index < nextAssets.length; index += 1) {
    const asset = nextAssets[index]
    if (!asset) continue
    const id = personalIdOf(asset)
    // A captured frame is deliberately different from the canonical spritesheet.
    // It must retain the editable drawing identity, never become a personal copy.
    if (
      !id ||
      asset.kind === 'audio' ||
      asset.kind === 'font' ||
      asset.kind === 'scene3d' ||
      asset.kind === 'scene3d-data' ||
      asset.pintaImage !== undefined
    )
      continue
    try {
      const drawing = drawings.get(id) ?? null
      if (!drawing) continue
      if (asset.regional && asset.dataUrl !== drawing.dataUrl) {
        // A remote project keeps its exact PNG. A different local drawing must
        // not replace it in the next automatic library sweep.
        const { libId: _id, libOrigin: _origin, libRevision: _revision, ...detached } = asset
        nextAssets[index] = detached
        projectChanged = true
        continue
      }
      // The Molda's sky in a Raylib project (its panorama PNG): the restored game keeps the
      // panorama it came with, and only a sky edited here afterwards goes in again.
      if (asset.kind === 'image' && drawing.kind === 'environment3d') {
        if (asset.libRevision !== drawing.updatedAt) {
          nextAssets[index] = { ...asset, libRevision: drawing.updatedAt }
          projectChanged = true
        }
        continue
      }
      if (drawing.kind !== asset.kind) continue
      if (sameDrawingContent(asset, drawing)) {
        if (asset.libRevision !== drawing.updatedAt) {
          nextAssets[index] = { ...asset, libRevision: drawing.updatedAt }
          projectChanged = true
        }
        continue
      }

      // Bytes divergentes sempre preservam os dois lados. `updatedAt`/`libRevision` nasce
      // do relógio local de cada aparelho; maior não prova causalidade nem novidade.
      // A versão restaurada ganha um id pessoal novo e o desenho local fica intocado.
      const copyId = ulid()
      const result = await savePersonalAsset(
        {
          id: copyId,
          name: asset.name,
          kind: asset.kind,
          origin: asset.libOrigin ?? drawing.origin,
          dataUrl: asset.dataUrl,
          originalFileName: asset.originalFileName,
          width: asset.width,
          height: asset.height,
          sprite: asset.sprite,
          tileset: asset.tileset,
          tilemap: asset.tilemap,
          tilemapFront: asset.tilemapFront,
          scene: asset.scene,
        },
        options,
      )
      if (!result.ok || result.updatedAt === undefined) continue
      nextAssets[index] = {
        ...asset,
        libId: `${PERSONAL_LIB_PREFIX}${copyId}`,
        libRevision: result.updatedAt,
      }
      projectChanged = true
    } catch {
      // Biblioteca indisponível: o restauro já aconteceu; a varredura decide depois.
    }
  }
  if (projectChanged) {
    project.assets = nextAssets
    if (typeof project.updatedAt === 'number') {
      project.updatedAt = Math.max(Date.now(), project.updatedAt + 1)
    }
  }
  return { projectChanged }
}

/** Busca os desenhos de origem dos assets de UM projeto, sem repetir leitura. */
async function resolveDrawings(
  assets: ProjectAsset[],
  cache: Map<string, PersonalAsset | null>,
  namespace: string,
): Promise<Map<string, PersonalAsset | null>> {
  for (const asset of assets) {
    const id = personalIdOf(asset)
    if (!id || cache.has(id)) continue
    const drawing = await getPersonalAsset(id, { namespace })
    cache.set(id, drawing?.regional ? null : drawing)
  }
  return cache
}

function attemptedWorlds(context: DrawingSyncContext, projectId: string): Set<string> {
  context.attemptedWorlds ??= new Map()
  let ids = context.attemptedWorlds.get(projectId)
  if (!ids) {
    ids = new Set()
    context.attemptedWorlds.set(projectId, ids)
  }
  return ids
}

async function captureMapWorld(
  root: PersonalAsset,
  context: DrawingSyncContext,
): Promise<StudioPintaImportedAsset> {
  if (!context.mapInventory && !pintaWorldNeedsInventory(root)) return pintaMapWorld(root, [])
  context.mapInventory ??= readPersonalAssetInventory({ namespace: context.namespace }).then(
    (result) => {
      if (!result.ok) throw new Error(result.error)
      return result.assets
    },
  )
  const inventory = await context.mapInventory
  // The point read may predate an atomic library update. Use the root and children from
  // the same getMany snapshot rather than combining that old root with newer destinations.
  const current = inventory.find((asset) => asset.id === root.id)
  if (!current) throw new Error('Este mapa mudou durante a conferência. O jogo foi mantido.')
  return pintaMapWorld(current, inventory)
}

function worldChangedCount(
  assets: readonly ProjectAsset[],
  world: StudioPintaImportedAsset,
): number {
  return [world, ...(world.maps ?? [])].filter((map) => {
    const previous = assets.find((asset) => personalIdOf(asset) === map.id)
    return !previous || !sameDrawingContent(previous, map)
  }).length
}

function worldFailure(
  context: DrawingSyncContext,
  result: DrawingSyncResult,
  error: unknown,
): void {
  context.canonicalWriteRefused = true
  pushFailure(
    result,
    context.state,
    error instanceof Error ? error.message : 'Não consegui atualizar os mapas. O jogo foi mantido.',
  )
}

/**
 * Reconcilia os desenhos do Pinta com TODOS os jogos da criança (o alcance que
 * ela escolheu: não só o que está aberto).
 *
 * Cópias canônicas usam o marcador pessoal para evitar leituras repetidas. Receitas Python
 * também conferem a proveniência nativa (incluindo tilesets); só rasterizam se ela mudou.
 */
export function syncDrawingsIntoProjects(
  storeApi: ProjectStoreApi,
  options: {
    pintaLibrary?: StudioPintaLibraryAdapter | null
    signal?: AbortSignal
    runtimeCatalog?: () => StudioRuntimeCatalog | null
  } = {},
): Promise<DrawingSyncResult> {
  const context = captureSyncContext()
  const adapter = options.pintaLibrary
  if (
    context.state.inFlight &&
    context.state.inFlightStore === storeApi &&
    context.state.inFlightAdapter === adapter &&
    context.state.inFlightSignal === options.signal &&
    context.state.inFlightRuntimeCatalog === options.runtimeCatalog &&
    !options.signal?.aborted &&
    !context.state.controller?.signal.aborted &&
    !context.storageScope.signal?.aborted
  )
    return context.state.inFlight
  const changeToken = personalAssetsChangeToken(context.namespace)
  context.canonicalChanged =
    !context.state.didInitialSweep || !changeToken || changeToken !== context.state.lastSyncToken
  if (options.signal?.aborted || (!context.canonicalChanged && !adapter?.inspectImage)) {
    return Promise.resolve(emptyResult())
  }
  const token = {}
  context.state.token = token
  context.callerSignal = options.signal
  context.runtimeCatalog = options.runtimeCatalog
  context.state.controller?.abort()
  const lifetime = new AbortController()
  context.state.controller = lifetime
  const signal = AbortSignal.any([
    lifetime.signal,
    ...(options.signal ? [options.signal] : []),
    ...(context.storageScope.signal ? [context.storageScope.signal] : []),
  ])
  const unsubscribe = storeApi.subscribe((state, previous) => {
    if (
      state.project?.id !== previous.project?.id ||
      (state.project?.programmingLanguage ?? 'javascript') !==
        (previous.project?.programmingLanguage ?? 'javascript') ||
      state.editingAccess !== previous.editingAccess
    )
      lifetime.abort()
  })
  let resolver:
    | Promise<ReturnType<typeof import('./pintaImageSync').createPintaImageSync>>
    | undefined
  context.python = {
    signal,
    attemptedOpen: new Set(),
    current: () =>
      !signal.aborted &&
      context.state.token === token &&
      context.namespace === context.storageScope.namespace &&
      isContextActive(context) &&
      storeApi.getState().editingAccess === 'author',
    resolver: () =>
      (resolver ??= import('./pintaImageSync').then(({ createPintaImageSync }) =>
        createPintaImageSync(adapter, signal),
      )),
  }
  const run = sweep(storeApi, changeToken, context)
  context.state.inFlightAdapter = adapter
  context.state.inFlightSignal = options.signal
  context.state.inFlightRuntimeCatalog = options.runtimeCatalog
  context.state.inFlightStore = storeApi
  context.state.inFlight = run
  return run.finally(() => {
    unsubscribe()
    lifetime.abort()
    if (context.state.inFlight === run) context.state.inFlight = null
  })
}

function sweep(
  storeApi: ProjectStoreApi,
  changeToken: string,
  context: DrawingSyncContext,
): Promise<DrawingSyncResult> {
  // O `detail` é preenchido DURANTE a varredura (quantos projetos, quantos trocados): a medida
  // `studio:drawings:sweep` sai com os números no DevTools.
  const detail: Record<string, unknown> = {}
  return perfSpanAsync(
    'studio:drawings:sweep',
    async () => {
      const result = await sweepUnmeasured(storeApi, changeToken, context, detail)
      detail.updated = result.updatedInOpenProject + result.updatedInOtherProjects
      detail.failures = result.failures.length
      return result
    },
    detail,
  )
}

async function sweepUnmeasured(
  storeApi: ProjectStoreApi,
  changeToken: string,
  context: DrawingSyncContext,
  detail: Record<string, unknown> = {},
): Promise<DrawingSyncResult> {
  const result = emptyResult()
  if (isPrivateRegionalProjectScope(context.storageScope)) {
    // The private library and the open editor must belong to the same local profile.
    if (context.namespace === context.storageScope.namespace && context.canonicalChanged)
      await syncPrivateRegionalDrawings(storeApi, context, result, changeToken)
    return result
  }
  const drawings = new Map<string, PersonalAsset | null>()
  let canonicalWritesCompleted = true

  // 1) Projeto ABERTO: pela store, para que preview, miniaturas dos blocos e
  //    autosave sigam o caminho normal de uma edição.
  await syncOpenProject(storeApi, drawings, result, context)

  // 2) Demais projetos: só a partição de assets (a lista de projetos lê apenas a
  //    partição leve de metadados, e a de assets só é reescrita quando mudou).
  // A lista LEVE (sem capas): aqui só id e nome importam — as capas de todos os projetos
  // eram 1,5–12 MB lidos à toa a cada varredura.
  let summaries: Awaited<ReturnType<typeof listProjectSummariesLight>> = []
  try {
    summaries = await listProjectSummariesLight(context.storageScope)
    detail.projects = summaries.length
  } catch {
    summaries = []
    canonicalWritesCompleted = false
  }
  let visited = 0
  for (const summary of summaries) {
    if (summary.migrationPending) {
      canonicalWritesCompleted = false
      continue
    }
    let pythonProject = summary.programmingLanguage === 'python'
    if (!context.canonicalChanged && !pythonProject) continue
    if (context.callerSignal?.aborted) break
    if (pythonProject && !context.python?.current()) continue
    // Cede a thread principal a cada poucos projetos: a varredura roda no foco da aba, logo
    // quando a criança pode estar clicando — um laço de 100 leituras de assets sem respirar
    // travava a tela por segundos. A releitura do projeto aberto continua POR VOLTA.
    visited += 1
    if (visited % SWEEP_YIELD_EVERY === 0) await yieldToMain()
    // ⚠️ Relido a CADA volta, não capturado antes do laço: a varredura roda logo
    // que a aba volta ao foco — exatamente quando a criança pode clicar num
    // jogo. Se ela abrir um projeto no meio da varredura, gravar a partição dele
    // por fora seria sobrescrito pelo próximo autosave do editor (que ainda tem
    // a cópia velha em memória) e a atualização se perderia em silêncio.
    if (storeApi.getState().project?.id === summary.id) continue
    let worldPrepared = false
    try {
      const snapshot = await loadProjectAssetsSnapshotById(summary.id, context.storageScope)
      const { assets, environment } = snapshot
      if (environment.programmingLanguage === 'unknown') continue
      pythonProject = environment.programmingLanguage === 'python'
      if (assets.length === 0) continue
      if (context.canonicalChanged)
        await resolveDrawings(
          pythonProject ? assets.filter((asset) => asset.pintaImage === undefined) : assets,
          drawings,
          context.namespace,
        )
      // Orçamento do projeto, igual ao da store: sem isto um desenho que cresceu
      // podia empurrar o total acima do teto, e o `sanitizeProjectAssets` do
      // LOAD descarta o que passa — a criança abriria o jogo com imagens
      // faltando, sem nenhum aviso.
      // A cena do Pinta conta junto (`projectAssetBudgetChars`), igual ao load.
      let total = assets.reduce((sum, a) => sum + projectAssetBudgetChars(a), 0)
      let changed = false
      const updatedPythonImages: PintaImageDerivation[] = []
      let next = [...assets]
      const recursosDeCenas = idsDosRecursosDeCena3D(assets)
      for (let index = 0; index < next.length; index++) {
        const asset = next[index]
        if (!asset) continue
        if (recursosDeCenas.has(asset.id)) continue
        if (pythonProject && asset.pintaImage !== undefined) {
          if (!context.python?.current()) break
          try {
            const resolver = await context.python.resolver()
            const replacement = await resolver.reconcile(asset, next)
            if (!context.python.current()) break
            if (replacement) {
              if (replacement.pintaImage) {
                if (
                  !pintaImageRuntimeCompatible(
                    replacement.pintaImage,
                    environment.runtime,
                    context.runtimeCatalog?.(),
                  )
                )
                  throw new Error(PINTA_SCENE_RUNTIME_MESSAGE)
                updatedPythonImages.push(replacement.pintaImage)
              }
              next[index] = replacement
              total += projectAssetBudgetChars(replacement) - projectAssetBudgetChars(asset)
              changed = true
            }
          } catch (error) {
            if (context.python.current())
              pushFailure(result, context.state, imageSyncFailure(asset, error))
          }
          continue
        }
        if (!context.canonicalChanged) continue
        const id = personalIdOf(asset)
        if (id && attemptedWorlds(context, summary.id).has(id)) continue
        const drawing = await raylibSkyAsImage(asset, id ? (drawings.get(id) ?? null) : null)
        if (
          !pythonProject &&
          asset.pintaImage === undefined &&
          drawing?.scene &&
          drawing.kind === asset.kind &&
          !(drawing.origin && asset.libOrigin && drawing.origin !== asset.libOrigin)
        ) {
          const attempted = attemptedWorlds(context, summary.id)
          attempted.add(drawing.id)
          try {
            const world = await captureMapWorld(drawing, context)
            for (const map of [world, ...(world.maps ?? [])]) attempted.add(map.id)
            if (context.callerSignal?.aborted) break
            if (worldChangedCount(next, world) === 0) continue
            next = preparePintaMapBundle(next, world)
            worldPrepared = true
            total = next.reduce((sum, value) => sum + projectAssetBudgetChars(value), 0)
            changed = true
          } catch (error) {
            worldFailure(context, result, error)
          }
          continue
        }
        if (!drawingNeedsSync(asset, drawing) || !drawing) continue
        if (asset.pintaImage !== undefined) {
          pushFailure(
            result,
            context.state,
            'Prepare a imagem usando a receita do Pinta antes de atualizar este material.',
          )
          continue
        }
        // Bytes que o load descartaria não vão ao disco: gravá-los faria o jogo abrir sem
        // a imagem na próxima vez, em silêncio. A recusa aparece como a da cota.
        const merged = mergeDrawingIntoAsset(asset, drawing)
        if (!merged) {
          pushFailure(
            result,
            context.state,
            drawing.kind === 'image'
              ? `O desenho "${drawing.name}" é inválido ou grande demais e não entrou no jogo "${summary.name}".`
              : `A criação "${drawing.name}" não é um arquivo 3D válido, ou é grande demais, e não entrou no jogo "${summary.name}".`,
          )
          continue
        }
        const projected = total - projectAssetBudgetChars(asset) + projectAssetBudgetChars(merged)
        if (projected > PROJECT_ASSET_LIMITS.maxAssetsTotalChars) {
          pushFailure(
            result,
            context.state,
            `${drawing.kind === 'image' ? 'O desenho' : 'A criação'} "${drawing.name}" cresceu e não cabe mais no jogo "${summary.name}".`,
          )
          continue
        }
        total = projected
        changed = true
        next[index] = merged
      }
      if (!changed) continue
      const written = await persistProjectAssets(
        summary.id,
        next,
        context.storageScope,
        assets,
        () =>
          !context.callerSignal?.aborted &&
          storeApi.getState().project?.id !== summary.id &&
          updatedPythonImages.every((image) =>
            pintaImageRuntimeCompatible(image, environment.runtime, context.runtimeCatalog?.()),
          ) &&
          (!pythonProject || context.python?.current() === true),
      )
      if (written) result.updatedInOtherProjects += 1
      else {
        if (context.canonicalChanged) canonicalWritesCompleted = false
        if (
          updatedPythonImages.some(
            (image) =>
              !pintaImageRuntimeCompatible(image, environment.runtime, context.runtimeCatalog?.()),
          )
        )
          pushFailure(result, context.state, PINTA_SCENE_RUNTIME_MESSAGE)
      }
    } catch {
      // Um projeto ilegível não pode derrubar a varredura dos outros.
      if (context.canonicalChanged) canonicalWritesCompleted = false
      if (worldPrepared)
        worldFailure(
          context,
          result,
          new Error('Não consegui salvar os mapas do jogo. O jogo anterior foi mantido.'),
        )
    }
  }

  // 3) De novo o projeto ABERTO: se ela abriu um jogo NO MEIO da varredura, o
  //    passo 1 não o viu e o passo 2 o pulou de propósito. Custa quase nada
  //    (comparação de bytes com os desenhos já lidos).
  await syncOpenProject(storeApi, drawings, result, context)

  // A pending opening/CAS can refuse a required write. Keep its marker unconsumed so the
  // next normal focus/hydration sweep can reconcile it; do not retry inside this sweep.
  if (context.namespace === context.storageScope.namespace && context.canonicalChanged)
    await syncPrivateRegionalDrawings(storeApi, context, result, changeToken)
  if (canonicalWritesCompleted && !context.canonicalWriteRefused && context.python?.current()) {
    context.state.lastSyncToken = changeToken
    context.state.didInitialSweep = true
  }
  return result
}

async function syncPrivateRegionalDrawings(
  store: ProjectStoreApi,
  context: DrawingSyncContext,
  result: DrawingSyncResult,
  changeToken: string,
) {
  const { storageScope: scope, namespace } = context
  const signal = context.python?.signal ?? context.callerSignal
  context.mapInventory ??= readPersonalAssetInventory({ namespace }).then((result) => {
    if (!result.ok) throw new Error(result.error)
    return result.assets
  })
  let inventory: PersonalAsset[]
  try {
    inventory = await context.mapInventory
  } catch (error) {
    worldFailure(context, result, error)
    return
  }
  const regionalIds = new Set(inventory.filter((asset) => asset.regional).map((asset) => asset.id))
  if (regionalIds.size === 0) return
  const [
    { readPersonalRegionalMap, PINTA_REGIONAL_PERSONAL_CAPTURE },
    { refreshPrivateRegionalProjectAsset },
    { pintaRegionalMarkerOf },
  ] = await Promise.all([
    import('./personalRegional'),
    import('../state/pintaRegionalProjectRefresh'),
    import('../core/pintaRegionalMaterial'),
  ])
  const live = store.getState().project
  const projects = await listProjectSummariesLight(scope)
  const captured = new Map<string, Awaited<ReturnType<typeof readPersonalRegionalMap>>>()
  for (const summary of projects) {
    if (signal?.aborted || !isContextActive(context)) return
    const open = live?.id === summary.id ? live : undefined
    let attempted = false
    try {
      const assets =
        open?.assets ??
        (
          await loadProjectAssetsSnapshotById(summary.id, scope, {
            [PRIVATE_REGIONAL_PROJECT]: scope,
          })
        ).assets
      for (const asset of assets) {
        const sourceId = personalIdOf(asset)
        if (
          !sourceId ||
          !regionalIds.has(sourceId) ||
          asset.kind !== 'image' ||
          asset.libOrigin === 'molda' ||
          asset.pintaImage
        )
          continue
        attempted = true
        if (signal?.aborted || !isContextActive(context)) return
        if (!captured.has(sourceId))
          captured.set(
            sourceId,
            await readPersonalRegionalMap(sourceId, {
              namespace,
              capability: PINTA_REGIONAL_PERSONAL_CAPTURE,
            }),
          )
        const row = captured.get(sourceId)
        if (!row || pintaRegionalMarkerOf(asset)?.sha256 === row.sha256) continue
        const updated = await refreshPrivateRegionalProjectAsset({
          scope,
          store,
          projectId: summary.id,
          assetId: asset.id,
          signal,
          stillCurrent: () =>
            isContextActive(context) &&
            (!changeToken || personalAssetsChangeToken(namespace) === changeToken),
          capture: {
            width: row.width,
            height: row.height,
            dataUrl: row.dataUrl,
            regional: { dataVersion: 5, sourceId, sha256: row.sha256 },
          },
        })
        // A project that cannot run the regional material keeps its drawing; nothing to retry.
        if (updated === 'kept') continue
        if (updated) {
          if (open) result.updatedInOpenProject++
          else result.updatedInOtherProjects++
        } else context.canonicalWriteRefused = true
      }
    } catch (error) {
      if (!signal?.aborted && isContextActive(context)) {
        context.canonicalWriteRefused = true
        if (attempted || isPrivateRegionalProjectScope(scope)) worldFailure(context, result, error)
      }
    }
  }
  if (
    isPrivateRegionalProjectScope(scope) &&
    !context.canonicalWriteRefused &&
    !signal?.aborted &&
    isContextActive(context)
  ) {
    context.state.didInitialSweep = true
    context.state.lastSyncToken = changeToken
  }
}

/** Reconcilia o projeto que está no editor, pela store (caminho de uma edição). */
async function syncOpenProject(
  storeApi: ProjectStoreApi,
  drawings: Map<string, PersonalAsset | null>,
  result: DrawingSyncResult,
  context: DrawingSyncContext,
): Promise<void> {
  // O store em memória é global. Depois de uma troca de perfil ele já pode representar
  // outra criança; a varredura antiga só pode continuar nos bancos explicitamente capturados.
  if (!isContextActive(context)) return
  const openProject = storeApi.getState().project
  if (!openProject?.assets?.length) return
  const pythonProject = openProject.programmingLanguage === 'python'
  let active = storeApi.getState().editingAccess === 'author'
  const unsubscribe = storeApi.subscribe((state, previous) => {
    if (
      state.project?.id !== previous.project?.id ||
      state.editingAccess !== previous.editingAccess ||
      (state.project?.programmingLanguage ?? 'javascript') !==
        (previous.project?.programmingLanguage ?? 'javascript')
    )
      active = false
  })
  try {
    if (context.canonicalChanged)
      await resolveDrawings(
        pythonProject
          ? openProject.assets.filter((asset) => asset.pintaImage === undefined)
          : openProject.assets,
        drawings,
        context.namespace,
      )
    if (!isContextActive(context)) return
    const recursosDeCenas = idsDosRecursosDeCena3D(openProject.assets)
    for (const asset of openProject.assets) {
      if (!active || context.callerSignal?.aborted) return
      if (recursosDeCenas.has(asset.id)) continue
      if (pythonProject && asset.pintaImage !== undefined) {
        if (!context.python?.current()) return
        const attempt = `${openProject.id}\u0000${asset.id}`
        if (context.python.attemptedOpen.has(attempt)) continue
        // The second open-project pass must not turn a refused material CAS into a new intent.
        context.python.attemptedOpen.add(attempt)
        const before = canonicalJson(asset)
        try {
          const resolver = await context.python.resolver()
          const replacement = await resolver.reconcile(
            asset,
            storeApi.getState().project?.assets ?? [],
          )
          if (!context.python.current()) return
          if (!replacement) continue
          const current = storeApi.getState().project
          const target = current?.assets?.find((candidate) => candidate.id === asset.id)
          if (
            current?.id !== openProject.id ||
            current.programmingLanguage !== 'python' ||
            !target ||
            canonicalJson(target) !== before
          )
            continue
          resolver.assertFits(replacement, current.assets ?? [])
          if (
            replacement.pintaImage &&
            !pintaImageRuntimeCompatible(
              replacement.pintaImage,
              current.runtime,
              context.runtimeCatalog?.(),
            )
          )
            throw new Error(PINTA_SCENE_RUNTIME_MESSAGE)
          const error = storeApi.getState().updateAssetImage(asset.id, {
            dataUrl: replacement.dataUrl,
            width: replacement.width,
            height: replacement.height,
            pintaImage: replacement.pintaImage,
          })
          if (error) pushFailure(result, context.state, error)
          else result.updatedInOpenProject += 1
        } catch (error) {
          if (context.python.current())
            pushFailure(result, context.state, imageSyncFailure(asset, error))
        }
        continue
      }
      if (!context.canonicalChanged) continue
      const id = personalIdOf(asset)
      if (id && attemptedWorlds(context, openProject.id).has(id)) continue
      const drawing = await raylibSkyAsImage(asset, id ? (drawings.get(id) ?? null) : null)
      if (
        !pythonProject &&
        asset.pintaImage === undefined &&
        drawing?.scene &&
        drawing.kind === asset.kind &&
        !(drawing.origin && asset.libOrigin && drawing.origin !== asset.libOrigin)
      ) {
        const attempted = attemptedWorlds(context, openProject.id)
        attempted.add(drawing.id)
        try {
          const world = await captureMapWorld(drawing, context)
          for (const map of [world, ...(world.maps ?? [])]) attempted.add(map.id)
          if (!active || !isContextActive(context) || context.callerSignal?.aborted) return
          const current = storeApi.getState().project
          const target = current?.assets?.find((candidate) => candidate.id === asset.id)
          if (
            current?.id !== openProject.id ||
            !target ||
            personalIdOf(target) !== drawing.id ||
            target.kind !== 'image' ||
            target.pintaImage
          ) {
            context.canonicalWriteRefused = true
            continue
          }
          const changed = worldChangedCount(current.assets ?? [], world)
          if (!changed) continue
          const error = storeApi.getState().importPintaMapBundle(world)
          if (error) worldFailure(context, result, new Error(error))
          else result.updatedInOpenProject += changed
        } catch (error) {
          if (active && isContextActive(context) && !context.callerSignal?.aborted)
            worldFailure(context, result, error)
        }
        continue
      }
      if (!drawingNeedsSync(asset, drawing) || !drawing) continue
      if (asset.pintaImage !== undefined) {
        pushFailure(
          result,
          context.state,
          'Prepare a imagem usando a receita do Pinta antes de atualizar este material.',
        )
        continue
      }
      const error = storeApi.getState().updateAssetImage(asset.id, {
        dataUrl: drawing.dataUrl,
        originalFileName: drawing.originalFileName,
        width: drawing.width,
        height: drawing.height,
        sprite: drawing.sprite,
        tileset: drawing.tileset,
        tilemap: drawing.tilemap,
        tilemapFront: drawing.tilemapFront,
        scene: drawing.scene,
        libRevision: drawing.updatedAt,
      })
      if (error) pushFailure(result, context.state, error)
      else result.updatedInOpenProject += 1
    }
  } finally {
    unsubscribe()
  }
}

function imageSyncFailure(asset: ProjectAsset, error: unknown): string {
  const reason = error instanceof Error ? error.message : 'Não consegui preparar a imagem agora.'
  return `A imagem "${asset.name}" foi mantida. ${reason}`
}

/** Recusa vai para o resultado E para a fila que a janela dos materiais drena. */
function pushFailure(result: DrawingSyncResult, state: DrawingSyncState, message: string): void {
  if (!result.failures.includes(message)) result.failures.push(message)
  if (!state.pendingFailures.includes(message)) state.pendingFailures.push(message)
}

/**
 * Aplica o desenho novo a um asset de projeto FECHADO. Espelha a regra do
 * `updateAssetImage` da store (mesma validação dos bytes, mesma decisão sobre
 * geometria e metadados); o orçamento do projeto é checado por quem chama, que conhece
 * o total do arquivo. Devolve `null` quando os bytes não passam no portão do load
 * (`isValidAssetDataUrl` com o `kind` e, nos 3D, o nome do arquivo): a biblioteca
 * pessoal valida imagem SEM `kind`, então um registro `image` com `data:audio/` passa
 * por ela e só aqui seria pego. Sem esta guarda o asset ia ao disco e o
 * `sanitizeProjectAssets` da próxima abertura o descartava sem aviso.
 */

/** Libera o estado efêmero de um perfil ao sair dele; operações em voo conservam o próprio
 * contexto, mas deixam de ser encontradas pelas chamadas do próximo perfil. */
export function releaseDrawingSyncProfile(namespace: string): void {
  const normalized = namespace.trim()
  for (const [identity, state] of syncStates) {
    if (!identity.startsWith(`${normalized}\u0000`)) continue
    syncStates.delete(identity)
    state.controller?.abort()
    state.pendingFailures = []
  }
}
