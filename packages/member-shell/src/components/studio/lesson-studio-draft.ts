/**
 * O rascunho do Estúdio da fase guardado na conta (10/10/2026): o que roda ANTES de o editor
 * montar (qual versão abrir, e guardar a outra) e o que sobe a cada salvamento.
 *
 * O Estúdio é carregado dinamicamente (Monaco e Blockly não rodam no SSR), então as funções do
 * pacote chegam por parâmetro, nunca por import estático.
 *
 * ⚠️ Toda leitura e escrita aqui é no armazenamento PADRÃO da aula (`namespace: ''`), o mesmo que
 * o `StudioLesson` usa. O Estúdio Completo troca o namespace para o do perfil, e uma subida
 * enfileirada aqui não pode ler do banco errado se a criança abrir o `/estudio` no meio.
 */
import { studioContentFingerprint } from '@sistemazero/core/creations'
import type { Project } from '@sistemazero/studio'
import type { LessonDraftChannel, LessonDraftRemote } from '../../lib/lesson-draft-cloud'
import { decideLessonDraftSeed } from '../../lib/lesson-draft-seed'

type StudioModule = typeof import('@sistemazero/studio')

const AULA = { namespace: '' } as const

export interface StudioDraftDeps {
  studio: Pick<
    StudioModule,
    | 'loadProjectSnapshotForCloud'
    | 'validateCloudProjectSnapshot'
    | 'replaceLocalProject'
    | 'loadProjectSummaryForCloud'
  >
  channel: LessonDraftChannel
  blockId: string
  /** O id do rascunho local (`lessonStudioProjectId`). */
  projectId: string
  /** O id da "outra versão" (`lessonStudioBackupProjectId`). */
  backupId: string
}

/** A impressão do projeto como está no DISCO (a mesma régua do envio). */
export async function diskFingerprint(
  studio: StudioDraftDeps['studio'],
  projectId: string,
): Promise<string | null> {
  const project = await studio.loadProjectSnapshotForCloud(projectId, AULA).catch(() => null)
  return project ? studioContentFingerprint(project) : null
}

/** Grava `raw` como o projeto `id` (conferido antes, substituindo blocos e capa antigos). */
async function gravar(studio: StudioDraftDeps['studio'], raw: unknown, id: string) {
  const conferido = await studio.validateCloudProjectSnapshot(
    { ...(raw as Record<string, unknown>), id },
    { expectedId: id },
  )
  await studio.replaceLocalProject(conferido.project, AULA)
  return conferido.project as Project
}

/** Guarda a cópia da conta como a "outra versão" deste navegador. */
export async function keepRemoteAsOther(
  deps: StudioDraftDeps,
  remote: LessonDraftRemote,
): Promise<void> {
  const local = await deps.studio
    .loadProjectSnapshotForCloud(deps.projectId, AULA)
    .catch(() => null)
  const raw = await remote.load((local?.assets as unknown[] | undefined) ?? [])
  await gravar(deps.studio, raw, deps.backupId)
}

/**
 * Decide e prepara o disco antes de o editor abrir. Depois disto, a ordem de sempre
 * (`resolveStudioLessonSeed`: o rascunho local primeiro) já abre a versão certa.
 *
 * Nunca impede a fase de abrir: qualquer falha aqui só deixa o rascunho local como está.
 */
export async function prepareStudioLessonDraft(
  deps: StudioDraftDeps & {
    submission: { at: number; fingerprint: string | null } | null
    readSubmission: () => Promise<Project | null>
  },
): Promise<{ upload: boolean; other: boolean }> {
  const { studio, channel, blockId, projectId, backupId } = deps
  const local = await studio.loadProjectSnapshotForCloud(projectId, AULA).catch(() => null)
  let remote: LessonDraftRemote | null = null
  let conheceConta = true
  try {
    remote = await channel.peek(blockId)
  } catch {
    // Sem resposta da conta (sem internet): segue com o que há aqui; a fila resolve depois.
    conheceConta = false
  }
  const skewMs = remote ? remote.serverNow - Date.now() : 0
  const decisao = decideLessonDraftSeed({
    local: local
      ? { at: local.updatedAt, fingerprint: await studioContentFingerprint(local) }
      : null,
    mark: channel.mark(blockId),
    cloud: remote
      ? { at: remote.syncedAt, fingerprint: remote.fingerprint, revision: remote.revision }
      : null,
    submission: deps.submission,
    skewMs,
  })
  const assets = (local?.assets as unknown[] | undefined) ?? []
  let upload = false
  switch (decisao.open) {
    case 'local': {
      // A marca autoriza sobrescrever a conta: a outra versão precisa existir antes dela.
      if (remote && decisao.backupCloud) await gravar(studio, await remote.load(assets), backupId)
      if (remote && decisao.adoptRevision !== null) {
        // A conta tem uma revisão que este aparelho ainda não conhecia: passa a ser a base da
        // próxima subida (senão ela seria recusada por base vencida).
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
      if (decisao.backupLocal && local) await gravar(studio, local, backupId)
      const aberto = await gravar(studio, await remote.load(assets), projectId)
      channel.setMark(blockId, { revision: remote.revision, updatedAt: aberto.updatedAt })
      break
    }
    case 'submission': {
      const enviado = await deps.readSubmission()
      if (!enviado) break
      if (decisao.backupLocal && local) await gravar(studio, local, backupId)
      await gravar(studio, enviado, projectId)
      upload = conheceConta
      break
    }
    case 'fallback':
      break
  }
  const other = Boolean(await studio.loadProjectSummaryForCloud(backupId, AULA).catch(() => null))
  return { upload, other }
}

/** O produtor da subida: relê o disco na hora (sempre o estado mais recente). */
export function studioDraftProducer(
  deps: Pick<StudioDraftDeps, 'studio' | 'blockId' | 'projectId'>,
  onFingerprint?: (fingerprint: string | null) => void,
) {
  return async () => {
    const project = await deps.studio.loadProjectSnapshotForCloud(deps.projectId, AULA)
    if (!project) throw new Error('Não foi possível ler o projeto salvo')
    const fingerprint = await studioContentFingerprint(project)
    onFingerprint?.(fingerprint)
    return {
      // O índice da conta é por BLOCO: o id do documento é o do bloco (o BFF confere).
      document: { ...project, id: deps.blockId },
      name: project.name,
      kind: project.kind ?? 'classic',
      updatedAt: project.updatedAt,
      fingerprint,
      ...(project.formatVersion !== undefined ? { formatVersion: project.formatVersion } : {}),
    }
  }
}

/** Troca o rascunho de agora e a "outra versão" de lugar; devolve o que passa a abrir. */
export async function swapOtherVersion(deps: StudioDraftDeps): Promise<Project | null> {
  const { studio, projectId, backupId } = deps
  const [atual, outra] = await Promise.all([
    studio.loadProjectSnapshotForCloud(projectId, AULA),
    studio.loadProjectSnapshotForCloud(backupId, AULA),
  ])
  if (!outra) return null
  const aberta = await gravar(studio, outra, projectId)
  if (atual) {
    try {
      await gravar(studio, atual, backupId)
    } catch (error) {
      // Sem isto as duas posições ficariam com a mesma versão e a de agora sumiria.
      await gravar(studio, atual, projectId).catch(() => {})
      throw error
    }
  }
  return aberta
}

/**
 * Conflito na subida (outro aparelho subiu antes). Conteúdo igual: só a revisão é nova. Senão a
 * versão da conta fica guardada como a "outra"; e, no PRIMEIRO contato deste aparelho com a conta
 * (ele abriu sem conseguir perguntar, então o que está aqui pode ser só o modelo inicial), a da
 * conta passa para cima e a daqui vira a "outra". Nada se perde nos dois caminhos.
 *
 * `opened` = o projeto que o editor deve reabrir (só no primeiro contato).
 */
export async function resolveStudioConflict(
  deps: StudioDraftDeps,
  remote: LessonDraftRemote,
  firstContact: boolean,
): Promise<{ kept: boolean; opened: Project | null; adoptedAt: number | null }> {
  const local = await deps.studio.loadProjectSnapshotForCloud(deps.projectId, AULA)
  if (local && remote.fingerprint && remote.fingerprint === (await studioContentFingerprint(local)))
    return { kept: false, opened: null, adoptedAt: local.updatedAt }
  await keepRemoteAsOther(deps, remote)
  if (!firstContact) return { kept: true, opened: null, adoptedAt: null }
  const opened = await swapOtherVersion(deps)
  return { kept: true, opened, adoptedAt: opened?.updatedAt ?? null }
}
