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
 */
import { PROJECT_ASSET_LIMITS, type ProjectAsset } from '#core'
import { listAllProjects, loadProjectAssetsById, persistProjectAssets } from '../state/persistence'
import type { ProjectStoreApi } from '../state/projectStore'
import { getPersonalAsset, type PersonalAsset, personalAssetsChangedAt } from './personal'

const PERSONAL_LIB_PREFIX = 'personal:'

/**
 * Relógio do que esta ABA já reconciliou. Começa em 0 de propósito: a primeira
 * chamada depois de carregar sempre varre — é o que cobre "desenhei ontem, abro
 * o Estúdio hoje". Depois disso, o marcador em localStorage segura as chamadas
 * seguintes sem custo nenhum.
 *
 * Em memória (não persistido) porque duas abas do Estúdio precisam reconciliar
 * cada uma a SUA cópia em memória do projeto aberto.
 */
let lastSyncAt = 0
/**
 * Sem `localStorage` (SSR, Safari privado) o marcador é sempre 0 e o portão
 * nunca fecharia sozinho. Esta trava garante o piso: uma varredura por aba.
 */
let didInitialSweep = false

/**
 * Recusas acumuladas desde a última vez que a UI as mostrou. A sincronia roda
 * sozinha (no foco da janela), quando pode não haver painel aberto para avisar —
 * então a mensagem espera aqui até o painel de Imagens abrir. Sucesso é
 * silencioso de propósito; falha, nunca: senão o jogo fica com a arte velha e a
 * criança acha que deu certo.
 */
let pendingFailures: string[] = []

/** Drena as recusas pendentes (a UI mostra uma vez e esquece). */
export function takeDrawingSyncFailures(): string[] {
  const failures = pendingFailures
  pendingFailures = []
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

/**
 * Uma varredura por vez. O painel de Imagens e o observador de foco disparam no
 * MESMO evento quando o painel está aberto; sem isto, os dois varreriam o
 * IndexedDB inteiro em paralelo (o portão só fecha no FIM da primeira).
 */
let inFlight: Promise<DrawingSyncResult> | null = null

/** O id do desenho no Pinta, quando o asset veio de "Meus desenhos". */
export function personalIdOf(asset: Pick<ProjectAsset, 'libId'>): string | null {
  const libId = asset.libId
  if (typeof libId !== 'string' || !libId.startsWith(PERSONAL_LIB_PREFIX)) return null
  const id = libId.slice(PERSONAL_LIB_PREFIX.length)
  return id.length > 0 ? id : null
}

/**
 * Decide o que fazer com um asset. Puro (testável sem IndexedDB): compara os
 * BYTES, e não `updatedAt` — nada além desta sincronia escreve pixels no asset
 * do projeto, então diferença ⇒ o desenho mudou. Isso dispensa carimbo por asset
 * (nenhum campo novo no `ProjectAsset`, nenhuma migração) e já nasce cobrindo os
 * assets adicionados ANTES desta funcionalidade existir.
 */
export function drawingNeedsSync(asset: ProjectAsset, drawing: PersonalAsset | null): boolean {
  if (!drawing) return false
  if (asset.kind !== 'image') return false
  return asset.dataUrl !== drawing.dataUrl
}

/** Busca os desenhos de origem dos assets de UM projeto, sem repetir leitura. */
async function resolveDrawings(
  assets: ProjectAsset[],
  cache: Map<string, PersonalAsset | null>,
): Promise<Map<string, PersonalAsset | null>> {
  for (const asset of assets) {
    const id = personalIdOf(asset)
    if (!id || cache.has(id)) continue
    cache.set(id, await getPersonalAsset(id))
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
  if (inFlight) return inFlight
  const changedAt = personalAssetsChangedAt()
  if (didInitialSweep && changedAt === lastSyncAt) return Promise.resolve(emptyResult())
  const run = sweep(storeApi, changedAt)
  inFlight = run
  return run.finally(() => {
    inFlight = null
  })
}

async function sweep(storeApi: ProjectStoreApi, changedAt: number): Promise<DrawingSyncResult> {
  const result = emptyResult()
  const drawings = new Map<string, PersonalAsset | null>()

  // 1) Projeto ABERTO: pela store, para que preview, miniaturas dos blocos e
  //    autosave sigam o caminho normal de uma edição.
  await syncOpenProject(storeApi, drawings, result)

  // 2) Demais projetos: só a partição de assets (a lista de projetos lê apenas a
  //    partição leve de metadados, e a de assets só é reescrita quando mudou).
  let summaries: Awaited<ReturnType<typeof listAllProjects>> = []
  try {
    summaries = await listAllProjects()
  } catch {
    summaries = []
  }
  for (const summary of summaries) {
    // ⚠️ Relido a CADA volta, não capturado antes do laço: a varredura roda logo
    // que a aba volta ao foco — exatamente quando a criança pode clicar num
    // jogo. Se ela abrir um projeto no meio da varredura, gravar a partição dele
    // por fora seria sobrescrito pelo próximo autosave do editor (que ainda tem
    // a cópia velha em memória) e a atualização se perderia em silêncio.
    if (storeApi.getState().project?.id === summary.id) continue
    try {
      const assets = await loadProjectAssetsById(summary.id)
      if (assets.length === 0) continue
      await resolveDrawings(assets, drawings)
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
        const projected = total - asset.dataUrl.length + drawing.dataUrl.length
        if (projected > PROJECT_ASSET_LIMITS.maxAssetsTotalChars) {
          pushFailure(
            result,
            `O desenho "${drawing.name}" cresceu e não cabe mais no jogo "${summary.name}".`,
          )
          return asset
        }
        total = projected
        changed = true
        return mergeDrawingIntoAsset(asset, drawing)
      })
      if (!changed) continue
      await persistProjectAssets(summary.id, next)
      result.updatedInOtherProjects += 1
    } catch {
      // Um projeto ilegível não pode derrubar a varredura dos outros.
    }
  }

  // 3) De novo o projeto ABERTO: se ela abriu um jogo NO MEIO da varredura, o
  //    passo 1 não o viu e o passo 2 o pulou de propósito. Custa quase nada
  //    (comparação de bytes com os desenhos já lidos).
  await syncOpenProject(storeApi, drawings, result)

  lastSyncAt = changedAt
  didInitialSweep = true
  return result
}

/** Reconcilia o projeto que está no editor, pela store (caminho de uma edição). */
async function syncOpenProject(
  storeApi: ProjectStoreApi,
  drawings: Map<string, PersonalAsset | null>,
  result: DrawingSyncResult,
): Promise<void> {
  const openProject = storeApi.getState().project
  if (!openProject?.assets?.length) return
  await resolveDrawings(openProject.assets, drawings)
  for (const asset of openProject.assets) {
    const id = personalIdOf(asset)
    const drawing = id ? (drawings.get(id) ?? null) : null
    if (!drawingNeedsSync(asset, drawing) || !drawing) continue
    const error = storeApi.getState().updateAssetImage(asset.id, {
      dataUrl: drawing.dataUrl,
      width: drawing.width,
      height: drawing.height,
      sprite: drawing.sprite,
      tileset: drawing.tileset,
      tilemap: drawing.tilemap,
    })
    if (error) pushFailure(result, error)
    else result.updatedInOpenProject += 1
  }
}

/** Recusa vai para o resultado E para a fila que o painel de Imagens drena. */
function pushFailure(result: DrawingSyncResult, message: string): void {
  if (!result.failures.includes(message)) result.failures.push(message)
  if (!pendingFailures.includes(message)) pendingFailures.push(message)
}

/**
 * Aplica o desenho novo a um asset de projeto FECHADO. Espelha a regra do
 * `updateAssetImage` da store (mesma decisão sobre geometria e metadados); o
 * orçamento do projeto é checado por quem chama, que conhece o total do arquivo.
 */
function mergeDrawingIntoAsset(asset: ProjectAsset, drawing: PersonalAsset): ProjectAsset {
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
  }
  if (sprite) next.sprite = sprite
  else delete next.sprite
  if (tileset) next.tileset = tileset
  else delete next.tileset
  if (tilemap) next.tilemap = tilemap
  else delete next.tilemap
  return next
}

/** Só para os testes: zera o relógio da aba. */
export function resetDrawingSyncClockForTests(): void {
  lastSyncAt = 0
  didInitialSweep = false
  pendingFailures = []
  inFlight = null
}
