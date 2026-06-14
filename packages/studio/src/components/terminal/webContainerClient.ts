import type { WebContainer } from '@webcontainer/api'

let bootPromise: Promise<WebContainer> | null = null

// O WebContainer é um SINGLETON por aba e seu sistema de arquivos é ÚNICO: tanto
// o terminal clássico (que monta na raiz após `resetWebContainerFs`) quanto o
// modo profissional (`useWebContainerSync.ensureMounted`) escrevem no MESMO FS.
// Com dois <Studio> na mesma aba — clássico+clássico, pro+pro, ou clássico+pro —
// quem montar por último apagaria os arquivos montados pelo outro debaixo do jsh
// / dev-server em execução. Este token de DONO ÚNICO (global deliberadamente
// rastreado — ver regra de multi-instância no CLAUDE.md) é a FONTE ÚNICA da
// posse do FS: todo escritor (Terminal e useWebContainerSync) precisa
// reivindicá-lo ANTES de qualquer reset/mount; os demais recusam em vez de
// clobberar. (A solução completa seria namespacing por instância em /sz-<id>/ —
// ver docs/embedding.md.)
let fsOwner: symbol | null = null

/**
 * Reivindica a posse exclusiva do FS do WebContainer para `owner`. Retorna
 * `true` se já somos donos ou se o FS estava livre (e agora passamos a ser),
 * `false` se outra instância é a dona (caller deve recusar e mostrar "em uso").
 */
export function claimFsOwnership(owner: symbol): boolean {
  if (fsOwner !== null && fsOwner !== owner) return false
  fsOwner = owner
  return true
}

/** Libera a posse do FS (no-op se `owner` não é o dono atual). */
export function releaseFsOwnership(owner: symbol): void {
  if (fsOwner === owner) fsOwner = null
}

/** Dono atual do FS (ou `null` se livre). Exposto para teste/diagnóstico. */
export function currentFsOwner(): symbol | null {
  return fsOwner
}

// --- Sinal de "FS montado" do modo profissional -----------------------------
// No modo PRO o FS é montado pelo escritor ÚNICO (`useWebContainerSync`, via
// ProWebContainerProvider) que vive na árvore do editor; o Terminal é um irmão
// (BottomPanel) FORA desse provider e não pode chamar `ensureMounted`. Sem este
// sinal o Terminal abriria o jsh sobre um FS ainda não montado (ou de um projeto
// anterior). O sincronizador publica aqui quando o mount conclui/é invalidado, e
// o Terminal pro espera por ele antes de spawnar o shell.
let proFsMountedProjectId: string | null = null
const proFsMountWaiters = new Set<() => void>()

/** Chamado pelo sincronizador único quando o FS pro está montado para `projectId`. */
export function setProFsMounted(projectId: string | null): void {
  proFsMountedProjectId = projectId
  if (projectId !== null) {
    const waiters = [...proFsMountWaiters]
    proFsMountWaiters.clear()
    for (const resolve of waiters) resolve()
  }
}

/** Projeto cujo FS pro está montado, ou `null` (não montado / invalidado). */
export function getProFsMountedProjectId(): string | null {
  return proFsMountedProjectId
}

/**
 * Resolve quando o FS pro de `projectId` estiver montado (imediatamente se já
 * está). O Terminal pro aguarda isto antes de spawnar o jsh, participando do
 * mount de escritor único em vez de montar/resetar por conta própria.
 */
export function waitForProFsMounted(projectId: string): Promise<void> {
  if (proFsMountedProjectId === projectId) return Promise.resolve()
  return new Promise<void>((resolve) => {
    const check = () => {
      if (proFsMountedProjectId === projectId) resolve()
      else proFsMountWaiters.add(check)
    }
    check()
  })
}

// Gatilho de mount do escritor ÚNICO (o `ensureMounted` de `useWebContainerSync`),
// registrado pelo provider pro. O Terminal pro o aciona ANTES de esperar pelo
// sinal — assim o FS é montado mesmo quando o preview (ProPreview) está fechado,
// evitando que o terminal espere para sempre. Continua sendo o provider quem
// monta (escritor único); o Terminal só pede.
let proMountTrigger: (() => void) | null = null

/** O provider pro registra aqui seu `ensureMounted` (e desregistra ao desmontar). */
export function registerProMountTrigger(trigger: (() => void) | null): void {
  proMountTrigger = trigger
}

/** Pede ao escritor único que monte o FS pro (no-op se não há provider montado). */
export function requestProFsMount(): void {
  proMountTrigger?.()
}

/**
 * WebContainer só pode ser inicializado uma vez por aba. Este singleton evita
 * boot duplicado quando o aluno alterna abas ou troca de projeto.
 *
 * `forwardPreviewErrors: 'exceptions-only'` habilita o evento `preview-message`,
 * que o modo profissional (ProPreview) usa para encaminhar exceções do app ao
 * console do Studio (o preview é cross-origin, não dá para ler o console dele).
 */
export function getWebContainer(): Promise<WebContainer> {
  if (!bootPromise) {
    bootPromise = import('@webcontainer/api')
      .then(({ WebContainer }) =>
        WebContainer.boot({ coep: 'credentialless', forwardPreviewErrors: 'exceptions-only' }),
      )
      .catch((error) => {
        bootPromise = null
        throw error
      })
  }

  return bootPromise
}

/**
 * Apaga o FS do container preservando `keep` (default `node_modules`) — usado ao
 * trocar de projeto profissional para remontar a árvore sem reinstalar deps
 * (boot+install são lentos; preservar node_modules evita o npm install de novo
 * quando o template é o mesmo).
 */
export async function resetWebContainerFs(
  wc: WebContainer,
  keep: readonly string[] = ['node_modules'],
): Promise<void> {
  const keepSet = new Set(keep)
  const entries = await wc.fs.readdir('/', { withFileTypes: true })
  await Promise.all(
    entries
      .filter((entry) => !keepSet.has(entry.name))
      .map((entry) => wc.fs.rm(`/${entry.name}`, { recursive: true, force: true })),
  )
}
