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

import { ulid } from 'ulid'
import { isValidAssetDataUrl, PROJECT_ASSET_LIMITS, type ProjectAsset } from '#core'
import { perfSpanAsync } from '../core/perf'
import {
  listProjectSummariesLight,
  loadProjectAssetsById,
  persistProjectAssets,
} from '../state/persistence'
import {
  captureProjectStorageScope,
  type ProjectStorageScope,
} from '../state/projectStorageRuntime'
import type { ProjectStoreApi } from '../state/projectStore'
import {
  getPersonalAsset,
  getPersonalAssets,
  getPersonalAssetsNamespace,
  type PersonalAsset,
  personalAssetsChangedAt,
  savePersonalAsset,
} from './personal'

const PERSONAL_LIB_PREFIX = 'personal:'

interface DrawingSyncState {
  lastSyncAt: number
  didInitialSweep: boolean
  inFlight: Promise<DrawingSyncResult> | null
  pendingFailures: string[]
}

interface DrawingSyncContext {
  namespace: string
  storageScope: ProjectStorageScope
  state: DrawingSyncState
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
    state = { lastSyncAt: 0, didInitialSweep: false, inFlight: null, pendingFailures: [] }
    syncStates.set(identity, state)
  }
  return { namespace, storageScope, state }
}

function isContextActive(context: DrawingSyncContext): boolean {
  return (
    getPersonalAssetsNamespace() === context.namespace &&
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

/** O id do desenho no Pinta, quando o asset veio de "Meus desenhos". */
export function personalIdOf(asset: Pick<ProjectAsset, 'libId'>): string | null {
  const libId = asset.libId
  if (typeof libId !== 'string' || !libId.startsWith(PERSONAL_LIB_PREFIX)) return null
  const id = libId.slice(PERSONAL_LIB_PREFIX.length)
  return id.length > 0 ? id : null
}

/**
 * Decide o que fazer com um asset. Puro (testável sem IndexedDB): bytes iguais
 * não geram trabalho. `libRevision` é um token de igualdade, não um relógio global:
 * valores produzidos por aparelhos distintos nunca são ordenados.
 */
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
  if (asset.dataUrl === drawing.dataUrl) return false
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
    .filter((asset): asset is ProjectAsset => !!asset && asset.kind !== 'audio')
    .map((asset) => personalIdOf(asset))
    .filter((id): id is string => id !== null)
  const drawings =
    personalIds.length > 0 ? await getPersonalAssets(personalIds, options) : new Map()
  for (let index = 0; index < nextAssets.length; index += 1) {
    const asset = nextAssets[index]
    if (!asset) continue
    const id = personalIdOf(asset)
    if (!id || asset.kind === 'audio') continue
    try {
      const drawing = drawings.get(id) ?? null
      if (!drawing) continue
      if (drawing.kind !== asset.kind) continue
      if (drawing.dataUrl === asset.dataUrl) {
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
    cache.set(id, await getPersonalAsset(id, { namespace }))
  }
  return cache
}

/**
 * Reconcilia os desenhos do Pinta com TODOS os jogos da criança (o alcance que
 * ela escolheu: não só o que está aberto).
 *
 * Barato no caso comum: se nada mudou desde a última passada desta aba, sai sem
 * tocar no IndexedDB.
 */
export function syncDrawingsIntoProjects(storeApi: ProjectStoreApi): Promise<DrawingSyncResult> {
  const context = captureSyncContext()
  if (context.state.inFlight) return context.state.inFlight
  const changedAt = personalAssetsChangedAt(context.namespace)
  if (context.state.didInitialSweep && changedAt === context.state.lastSyncAt) {
    return Promise.resolve(emptyResult())
  }
  const run = sweep(storeApi, changedAt, context)
  context.state.inFlight = run
  return run.finally(() => {
    if (context.state.inFlight === run) context.state.inFlight = null
  })
}

function sweep(
  storeApi: ProjectStoreApi,
  changedAt: number,
  context: DrawingSyncContext,
): Promise<DrawingSyncResult> {
  // O `detail` é preenchido DURANTE a varredura (quantos projetos, quantos trocados): a medida
  // `studio:drawings:sweep` sai com os números no DevTools.
  const detail: Record<string, unknown> = {}
  return perfSpanAsync(
    'studio:drawings:sweep',
    async () => {
      const result = await sweepUnmeasured(storeApi, changedAt, context, detail)
      detail.updated = result.updatedInOpenProject + result.updatedInOtherProjects
      detail.failures = result.failures.length
      return result
    },
    detail,
  )
}

async function sweepUnmeasured(
  storeApi: ProjectStoreApi,
  changedAt: number,
  context: DrawingSyncContext,
  detail: Record<string, unknown> = {},
): Promise<DrawingSyncResult> {
  const result = emptyResult()
  const drawings = new Map<string, PersonalAsset | null>()

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
  }
  let visited = 0
  for (const summary of summaries) {
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
    try {
      const assets = await loadProjectAssetsById(summary.id, context.storageScope)
      if (assets.length === 0) continue
      await resolveDrawings(assets, drawings, context.namespace)
      // Orçamento do projeto, igual ao da store: sem isto um desenho que cresceu
      // podia empurrar o total acima do teto, e o `sanitizeProjectAssets` do
      // LOAD descarta o que passa — a criança abriria o jogo com imagens
      // faltando, sem nenhum aviso.
      let total = assets.reduce((sum, a) => sum + a.dataUrl.length, 0)
      let changed = false
      const next = assets.map((asset) => {
        const id = personalIdOf(asset)
        const drawing = id ? (drawings.get(id) ?? null) : null
        if (!drawingNeedsSync(asset, drawing) || !drawing) return asset
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
          return asset
        }
        const projected = total - asset.dataUrl.length + drawing.dataUrl.length
        if (projected > PROJECT_ASSET_LIMITS.maxAssetsTotalChars) {
          pushFailure(
            result,
            context.state,
            `${drawing.kind === 'image' ? 'O desenho' : 'A criação'} "${drawing.name}" cresceu e não cabe mais no jogo "${summary.name}".`,
          )
          return asset
        }
        total = projected
        changed = true
        return merged
      })
      if (!changed) continue
      await persistProjectAssets(summary.id, next, context.storageScope)
      result.updatedInOtherProjects += 1
    } catch {
      // Um projeto ilegível não pode derrubar a varredura dos outros.
    }
  }

  // 3) De novo o projeto ABERTO: se ela abriu um jogo NO MEIO da varredura, o
  //    passo 1 não o viu e o passo 2 o pulou de propósito. Custa quase nada
  //    (comparação de bytes com os desenhos já lidos).
  await syncOpenProject(storeApi, drawings, result, context)

  context.state.lastSyncAt = changedAt
  context.state.didInitialSweep = true
  return result
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
  await resolveDrawings(openProject.assets, drawings, context.namespace)
  if (!isContextActive(context)) return
  for (const asset of openProject.assets) {
    const id = personalIdOf(asset)
    const drawing = id ? (drawings.get(id) ?? null) : null
    if (!drawingNeedsSync(asset, drawing) || !drawing) continue
    const error = storeApi.getState().updateAssetImage(asset.id, {
      dataUrl: drawing.dataUrl,
      originalFileName: drawing.originalFileName,
      width: drawing.width,
      height: drawing.height,
      sprite: drawing.sprite,
      tileset: drawing.tileset,
      tilemap: drawing.tilemap,
      libRevision: drawing.updatedAt,
    })
    if (error) pushFailure(result, context.state, error)
    else result.updatedInOpenProject += 1
  }
}

/** Recusa vai para o resultado E para a fila que o painel de Imagens drena. */
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
export function mergeDrawingIntoAsset(
  asset: ProjectAsset,
  drawing: PersonalAsset,
): ProjectAsset | null {
  const is3D = asset.kind === 'model3d' || asset.kind === 'environment3d'
  // 3D: o nome do arquivo faz parte da validação (extensão × MIME × assinatura), então
  // vale o da criação nova e, sem ele, o que o asset já tinha.
  const originalFileName = is3D
    ? typeof drawing.originalFileName === 'string' && drawing.originalFileName.trim()
      ? drawing.originalFileName.trim().slice(0, 128)
      : asset.originalFileName
    : undefined
  if (
    is3D
      ? !isValidAssetDataUrl(drawing.dataUrl, asset.kind, originalFileName)
      : !isValidAssetDataUrl(drawing.dataUrl, 'image')
  ) {
    return null
  }
  const width = typeof drawing.width === 'number' && drawing.width > 0 ? drawing.width : undefined
  const height =
    typeof drawing.height === 'number' && drawing.height > 0 ? drawing.height : undefined
  const sameGeometry =
    (width ?? asset.width) === asset.width && (height ?? asset.height) === asset.height
  const sprite = drawing.sprite ?? (sameGeometry ? asset.sprite : undefined)
  const tileset = drawing.tileset ?? (sameGeometry ? asset.tileset : undefined)
  const tilemap = drawing.tilemap ?? (sameGeometry ? asset.tilemap : undefined)
  // Nome/id/libId/source intocados — os blocos referenciam o asset pelo NOME.
  const next: ProjectAsset = {
    ...asset,
    dataUrl: drawing.dataUrl,
    ...(width ? { width } : {}),
    ...(height ? { height } : {}),
    libRevision: drawing.updatedAt,
    // 3D: o nome do arquivo que acabou de passar na validação (o novo ou o que já havia).
    ...(originalFileName ? { originalFileName } : {}),
  }
  if (sprite) next.sprite = sprite
  else delete next.sprite
  if (tileset) next.tileset = tileset
  else delete next.tileset
  if (tilemap) next.tilemap = tilemap
  else delete next.tilemap
  return next
}

/** Libera o estado efêmero de um perfil ao sair dele; operações em voo conservam o próprio
 * contexto, mas deixam de ser encontradas pelas chamadas do próximo perfil. */
export function releaseDrawingSyncProfile(namespace: string): void {
  const normalized = namespace.trim()
  for (const [identity, state] of syncStates) {
    if (!identity.startsWith(`${normalized}\u0000`)) continue
    syncStates.delete(identity)
    state.pendingFailures = []
  }
}
