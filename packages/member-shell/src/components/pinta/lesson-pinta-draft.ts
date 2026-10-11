/**
 * O rascunho do Pinta da fase guardado na conta (10/10/2026). Molde do `lesson-studio-draft.ts`,
 * com a forma do Pinta: o rascunho É o armazenamento do bloco (um banco por bloco + perfil), e o
 * desenho de lá abre porque o `<PintaLesson>` acha o `initialAsset` pelo id dentro dele.
 *
 * A "outra versão" mora num SEGUNDO banco do mesmo bloco (`aula-<bloco>-<perfil>-outra`).
 */
import { pintaContentFingerprint } from '@sistemazero/core/creations'
import { type PintaAsset, pintaAssetFromWire, pintaAssetToWire } from '@sistemazero/pinta/assets'
import type { LessonDraftChannel, LessonDraftRemote } from '../../lib/lesson-draft-cloud'
import { decideLessonDraftSeed } from '../../lib/lesson-draft-seed'

type PintaPersistence = import('@sistemazero/pinta/lesson').PintaPersistence

export interface PintaDraftDeps {
  channel: LessonDraftChannel
  blockId: string
  /** O banco do bloco SEM o embrulho da subida (ler e restaurar aqui não deve subir nada). */
  store: PintaPersistence
  backup: PintaPersistence
}

/** O desenho do bloco: o banco tem um só; havendo mais (rascunho antigo), o mais novo. */
export async function readLessonDrawing(store: PintaPersistence): Promise<PintaAsset | null> {
  const assets = await store.listAllAssets().catch(() => [])
  return [...assets].sort((a, b) => b.updatedAt - a.updatedAt)[0] ?? null
}

/** O banco passa a ter só este desenho (grava antes de apagar: uma falha nunca o deixa vazio). */
async function substituir(store: PintaPersistence, asset: PintaAsset): Promise<void> {
  await store.persistAsset(asset)
  for (const antigo of await store.listAllAssets().catch(() => []))
    if (antigo.id !== asset.id) await store.deleteAsset(antigo.id)
}

function desenho(raw: unknown): PintaAsset {
  const asset = pintaAssetFromWire(raw)
  if (!asset) throw new Error('O desenho guardado na conta é inválido')
  return asset
}

/** Guarda a cópia da conta como a "outra versão" deste navegador. */
export async function keepRemoteDrawingAsOther(
  deps: PintaDraftDeps,
  remote: LessonDraftRemote,
): Promise<void> {
  await substituir(deps.backup, desenho(await remote.load()))
}

/**
 * Decide e prepara o banco antes de o editor abrir. `seed` é o desenho que deve abrir (formato de
 * transporte), ou `null` para seguir a ordem de sempre (entrega → cadeia → desenho do professor).
 */
export async function preparePintaLessonDraft(
  deps: PintaDraftDeps & {
    submission: { at: number; fingerprint: string | null } | null
    readSubmission: () => Promise<unknown | null>
  },
): Promise<{ seed: unknown | null; upload: boolean; other: boolean }> {
  const { channel, blockId, store, backup } = deps
  const local = await readLessonDrawing(store)
  const localWire = local ? pintaAssetToWire(local) : null
  let remote: LessonDraftRemote | null = null
  let conheceConta = true
  try {
    remote = await channel.peek(blockId)
  } catch {
    conheceConta = false
  }
  const decisao = decideLessonDraftSeed({
    local: local
      ? { at: local.updatedAt, fingerprint: await pintaContentFingerprint(localWire) }
      : null,
    mark: channel.mark(blockId),
    cloud: remote
      ? { at: remote.syncedAt, fingerprint: remote.fingerprint, revision: remote.revision }
      : null,
    submission: deps.submission,
    skewMs: remote ? remote.serverNow - Date.now() : 0,
  })
  let seed: unknown | null = localWire
  let upload = false
  switch (decisao.open) {
    case 'local': {
      // Só reconheça a base remota depois de preservar a cópia que será substituída.
      if (remote && decisao.backupCloud) await keepRemoteDrawingAsOther(deps, remote)
      if (remote && decisao.adoptRevision !== null) {
        const anterior = channel.mark(blockId)
        channel.setMark(blockId, {
          revision: decisao.adoptRevision,
          updatedAt: decisao.upload ? (anterior?.updatedAt ?? 0) : (local?.updatedAt ?? 0),
        })
      }
      upload = decisao.upload && conheceConta
      break
    }
    case 'cloud': {
      if (!remote) break
      if (decisao.backupLocal && local) await substituir(backup, local)
      const aberto = desenho(await remote.load())
      await substituir(store, aberto)
      channel.setMark(blockId, { revision: remote.revision, updatedAt: aberto.updatedAt })
      seed = pintaAssetToWire(aberto)
      break
    }
    case 'submission': {
      const enviado = await deps.readSubmission()
      if (!enviado) break
      if (decisao.backupLocal && local) await substituir(backup, local)
      const aberto = desenho(enviado)
      await substituir(store, aberto)
      seed = pintaAssetToWire(aberto)
      upload = conheceConta
      break
    }
    case 'fallback':
      seed = null
      break
  }
  const other = (await backup.listAllAssets().catch(() => [])).length > 0
  return { seed, upload, other }
}

/** O produtor da subida: relê o banco na hora. */
export function pintaDraftProducer(
  deps: Pick<PintaDraftDeps, 'store'>,
  onFingerprint?: (fingerprint: string | null) => void,
) {
  return async () => {
    const assets = await deps.store.listAllAssets()
    const asset = [...assets].sort((a, b) => b.updatedAt - a.updatedAt)[0]
    if (!asset) throw new Error('Não foi possível ler o desenho salvo')
    const document = pintaAssetToWire(asset)
    const fingerprint = await pintaContentFingerprint(document)
    onFingerprint?.(fingerprint)
    return {
      document,
      name: asset.name,
      kind: asset.kind,
      updatedAt: asset.updatedAt,
      fingerprint,
      formatVersion: 1,
    }
  }
}

/** O banco de sempre, e depois a subida (o `<PintaLesson>` salva por aqui). */
export function withDraftUpload(base: PintaPersistence, onSaved: () => void): PintaPersistence {
  return {
    ...base,
    async persistAsset(asset) {
      await base.persistAsset(asset)
      onSaved()
    },
    async persistAssets(assets) {
      await base.persistAssets(assets)
      onSaved()
    },
  }
}

/** Troca o desenho de agora e a "outra versão" de lugar; devolve o que passa a abrir. */
export async function swapOtherDrawing(deps: PintaDraftDeps): Promise<unknown | null> {
  const [atual, outra] = await Promise.all([
    readLessonDrawing(deps.store),
    readLessonDrawing(deps.backup),
  ])
  if (!outra) return null
  await substituir(deps.store, outra)
  if (atual) {
    try {
      await substituir(deps.backup, atual)
    } catch (error) {
      // Sem isto as duas posições ficariam com o mesmo desenho e o de agora sumiria.
      await substituir(deps.store, atual).catch(() => {})
      throw error
    }
  }
  return pintaAssetToWire(outra)
}

/**
 * Conflito na subida, com a regra do Estúdio (`resolveStudioConflict`): conteúdo igual só adota a
 * revisão; senão a da conta fica como a "outra" e, no PRIMEIRO contato deste aparelho com a conta,
 * ela passa para cima. `opened` = o desenho (formato de transporte) que o editor deve reabrir.
 */
export async function resolvePintaConflict(
  deps: PintaDraftDeps,
  remote: LessonDraftRemote,
  firstContact: boolean,
): Promise<{ kept: boolean; opened: unknown | null; adoptedAt: number | null }> {
  const local = await readLessonDrawing(deps.store)
  if (
    local &&
    remote.fingerprint &&
    remote.fingerprint === (await pintaContentFingerprint(pintaAssetToWire(local)))
  )
    return { kept: false, opened: null, adoptedAt: local.updatedAt }
  await keepRemoteDrawingAsOther(deps, remote)
  if (!firstContact) return { kept: true, opened: null, adoptedAt: null }
  const opened = await swapOtherDrawing(deps)
  const aberto = opened ? await readLessonDrawing(deps.store) : null
  return { kept: true, opened, adoptedAt: aberto?.updatedAt ?? null }
}
