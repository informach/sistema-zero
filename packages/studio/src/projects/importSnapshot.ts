import { type Project, type ProjectAsset, sanitizeProjectAssets } from '#core'
import { buildCloudThumb, CLOUD_THUMB_MAX_CHARS } from '../cover/cloudThumb'
import { storeChosenCoverThumb } from '../cover/thumbCapture'
import { snapshotProjectWithCurrentAuthority } from '../state/bridgeAuthority'
import {
  adoptProjectThumbs,
  deleteProject,
  listProjectSummariesLight,
  loadProjectAssetsById,
  loadProjectSummaryById,
  loadProjectThumb,
  type ProjectSummary,
} from '../state/persistence'
import { getProjectStorageScope } from '../state/projectStorageRuntime'
import {
  loadSanitizedProjectById,
  sanitizeCloudProjectSnapshot,
  useProjectStore,
} from '../state/projectStore'

/**
 * Importa um SNAPSHOT de projeto (o JSON jogável do Mural / `.szproject.json`)
 * como um projeto NOVO no armazenamento local do viewer — o "Fazer a minha
 * versão" (remix) do host. Reusa o `importProjectFromJSON` do projectStore
 * (id novo + saneamento pelos MESMOS tetos do load; descartes viram warnings).
 *
 * ⚠️ O host chama `setStudioStorageNamespace(viewerId)` ANTES — o remix nasce
 * na lista do PERFIL certo. `name` sobrepõe o nome do snapshot (ex.: "Remix
 * de <título>").
 */
export async function importProjectSnapshot(
  raw: unknown,
  opts?: { name?: string; namespace?: string; silent?: boolean },
): Promise<{ project: Project; warnings: string[] }> {
  const value =
    opts?.name && raw && typeof raw === 'object' && !Array.isArray(raw)
      ? { ...(raw as Record<string, unknown>), name: opts.name }
      : raw
  const storageScope =
    opts?.namespace === undefined ? undefined : getProjectStorageScope(opts.namespace)
  return useProjectStore.getState().importProjectFromJSON(value, {
    storageScope,
    silent: opts?.silent,
  })
}

/**
 * Remove uma importação provisória criada para preservar um conflito. A remoção é local e
 * silenciosa para o espelho: esse id nunca foi confirmado como criação sincronizável.
 */
export async function discardImportedProjectSnapshot(
  id: string,
  opts?: { namespace?: string },
): Promise<void> {
  const storageScope =
    opts?.namespace === undefined ? undefined : getProjectStorageScope(opts.namespace)
  await deleteProject(id, storageScope, { notifyCloudMirror: false })
}

/**
 * Restaura um snapshot vindo da NUVEM ("guardado na sua conta") no armazenamento
 * local do viewer PRESERVANDO o id e as datas (é o vínculo com a nuvem e com o
 * `pensa-<id>` do Pensa), SUBSTITUINDO o que havia (blocos e capa antigos não
 * sobrevivem: o snapshot é a verdade completa) e SEM acordar o espelho da nuvem
 * (`setStudioCloudMirror`) — senão o que acabou de descer subiria de novo. Mesmos
 * tetos de saneamento do import.
 *
 * ⚠️ Pré-condições (lança se violadas): `expectedId` (o item da nuvem) tem que ser o
 * id do JSON — nada é gravado com id inventado; e o projeto NÃO pode estar aberto no
 * editor (a memória viva subiria por cima no próximo autosave). O host chama
 * `setStudioStorageNamespace(viewerId)` ANTES e só restaura antes da `ProjectList`.
 */
export async function restoreProjectFromCloud(
  raw: unknown,
  opts?: {
    expectedId?: string
    namespace?: string
    /** A miniatura que a nuvem listou para o item (gravada junto; `null` = a nuvem não tem). */
    thumb?: string | null
  },
): Promise<{ project: Project; warnings: string[] }> {
  const storageScope =
    opts?.namespace === undefined ? undefined : getProjectStorageScope(opts.namespace)
  const restored = await useProjectStore.getState().restoreProjectSnapshot(raw, {
    expectedId: opts?.expectedId,
    storageScope,
    thumb: opts?.thumb,
  })
  // A nuvem não trouxe miniatura mas o projeto tem capa ESCOLHIDA: deriva daqui mesmo (o
  // cliente que subiu não conseguiu reduzi-la, ou é anterior à capa viajar). Best-effort.
  if (!opts?.thumb && restored.project.coverAssetName) {
    void storeChosenCoverThumb(restored.project, { storageScope })
  }
  return restored
}

/**
 * A miniatura do card de um projeto do perfil, reduzida até caber no teto do índice da nuvem
 * (`maxChars`, ver `cover/cloudThumb.ts`); `null` = sem capa aqui ou sem canvas.
 */
export async function loadProjectThumbForCloud(
  id: string,
  opts?: { namespace?: string; maxChars?: number },
): Promise<string | null> {
  const storageScope =
    opts?.namespace === undefined ? undefined : getProjectStorageScope(opts.namespace)
  const thumb = await loadProjectThumb(id, storageScope)
  if (!thumb) return null
  return buildCloudThumb(thumb, opts?.maxChars ?? CLOUD_THUMB_MAX_CHARS)
}

/**
 * Adota as miniaturas que a nuvem listou para projetos que já existem neste aparelho SEM capa
 * (sincronizados antes de a capa viajar, ou nunca abertos aqui) — sem baixar blob nenhum.
 * Devolve quantas foram gravadas.
 */
export async function adoptCloudProjectThumbs(
  items: ReadonlyArray<{ id: string; thumb: string }>,
  opts?: { namespace?: string },
): Promise<number> {
  const storageScope =
    opts?.namespace === undefined ? undefined : getProjectStorageScope(opts.namespace)
  return adoptProjectThumbs(items, storageScope)
}

/**
 * Lê um snapshot completo do perfil indicado sem consultar o namespace global. Os assets
 * saem SANEADOS (`sanitizeProjectAssets`, a mesma forma do `loadProjectAssetsById` e do
 * que o editor carrega): é o que a nuvem hasheia por parte — se a subida levasse o registro
 * cru e a descida comparasse com o saneado, o mesmo desenho teria dois hashes e seria
 * baixado de novo (e a nuvem guardaria objetos não saneados).
 */
export async function loadProjectSnapshotForCloud(
  id: string,
  opts?: { namespace?: string },
): Promise<Project | null> {
  const storageScope =
    opts?.namespace === undefined ? undefined : getProjectStorageScope(opts.namespace)
  const project = await loadSanitizedProjectById(id, storageScope)
  if (!project) return null
  return snapshotProjectWithCurrentAuthority({
    ...project,
    assets: sanitizeProjectAssets(project.assets),
  })
}

/**
 * O resumo (meta + capa) de UM projeto do perfil indicado; `null` = não existe. A descida da
 * nuvem relê o `updatedAt` na hora de gravar (uma edição feita no meio não é sobrescrita).
 */
export function loadProjectSummaryForCloud(
  id: string,
  opts?: { namespace?: string },
): Promise<ProjectSummary | null> {
  const storageScope =
    opts?.namespace === undefined ? undefined : getProjectStorageScope(opts.namespace)
  return loadProjectSummaryById(id, storageScope)
}

/**
 * A lista LEVE (sem capas) do perfil indicado: o que a descida da nuvem usa para comparar
 * ids/datas — a lista com capas custa 1,5–12 MB por chamada com centenas de projetos.
 */
export function listProjectSummariesLightForCloud(opts?: {
  namespace?: string
}): Promise<ProjectSummary[]> {
  const storageScope =
    opts?.namespace === undefined ? undefined : getProjectStorageScope(opts.namespace)
  return listProjectSummariesLight(storageScope)
}

/**
 * Lê SÓ a partição de assets (desenhos/sons) de um projeto do perfil indicado — sem meta,
 * arquivos ou blocos. A nuvem usa na DESCIDA de um projeto guardado em partes: o que este
 * aparelho já tem (mesmo hash) não é baixado de novo. Projeto sem partição/legado → `[]`.
 */
export function loadProjectAssetsSnapshotForCloud(
  id: string,
  opts?: { namespace?: string },
): Promise<ProjectAsset[]> {
  const storageScope =
    opts?.namespace === undefined ? undefined : getProjectStorageScope(opts.namespace)
  return loadProjectAssetsById(id, storageScope)
}

/**
 * Confere e saneia um snapshot da nuvem SEM gravar (o mesmo caminho e as mesmas
 * recusas do `restoreProjectFromCloud`: id, tetos, e ESTRITO — blocos ou programa
 * que esta versão não reconhece recusam). O adaptador da nuvem chama isto na
 * "descida" ANTES de guardar o local como cópia de conflito: uma descida recusada
 * não pode deixar uma cópia órfã a cada carga. O `Project` devolvido pode ir direto
 * ao `restoreProjectFromCloud` (o saneamento é idempotente).
 */
export async function validateCloudProjectSnapshot(
  raw: unknown,
  opts?: { expectedId?: string },
): Promise<{ project: Project; warnings: string[] }> {
  return sanitizeCloudProjectSnapshot(raw, opts)
}
