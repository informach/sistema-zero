import type { WebContainer } from '@webcontainer/api'

let bootPromise: Promise<WebContainer> | null = null

/**
 * O WebContainer SÓ roda em página cross-origin isolada (o host precisa enviar
 * COOP/COEP — ver docs/embedding.md). Quando `crossOriginIsolated === false`,
 * bootar é FUTIL: o `import('@webcontainer/api')` é pesado (megabytes) e o boot
 * sempre falharia. Esta checagem barata permite curto-circuitar ANTES do import
 * dinâmico, mostrando uma mensagem amigável em vez de baixar o runtime à toa.
 *
 * Retorna `true` quando dá para tentar (isolado, OU o navegador não expõe a
 * flag — caso em que deixamos o boot decidir). Retorna `false` SÓ quando a flag
 * existe e é `false`. Em SSR (`window` ausente) retorna `true` para não
 * falso-disparar no servidor; o gate real acontece no cliente. Não distinguimos
 * "host esqueceu os headers" de "navegador sem SharedArrayBuffer" — a flag não
 * separa os dois —, então a mensagem ao aluno é genérica.
 */
export function canBootWebContainer(): boolean {
  if (typeof window === 'undefined') return true
  if (typeof crossOriginIsolated === 'undefined') return true
  return crossOriginIsolated !== false
}

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

/** Tempo padrão de espera pelo sinal de mount do FS pro antes de desistir. */
export const PRO_FS_MOUNT_TIMEOUT_MS = 30_000

/**
 * Resolve quando o FS pro de `projectId` estiver montado (imediatamente se já
 * está), com `true`. O Terminal pro aguarda isto antes de spawnar o jsh,
 * participando do mount de escritor único em vez de montar/resetar por conta
 * própria.
 *
 * Resolve com `false` (NÃO rejeita) se o mount não acontecer em `timeoutMs` — o
 * escritor único pode estar `busy` (outra instância é dona do FS singleton) e
 * nunca publicar o sinal. Sem o timeout o Terminal pro ficava preso para sempre
 * "Carregando…", sem nunca cair na UI de ocupado. O caller trata `false` como
 * sinal de ocupado. O waiter é desregistrado ao expirar para não vazar nem
 * resolver tarde sobre um load já obsoleto.
 */
export function waitForProFsMounted(
  projectId: string,
  timeoutMs: number = PRO_FS_MOUNT_TIMEOUT_MS,
): Promise<boolean> {
  if (proFsMountedProjectId === projectId) return Promise.resolve(true)
  return new Promise<boolean>((resolve) => {
    let settled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const check = () => {
      if (settled) return
      if (proFsMountedProjectId === projectId) {
        settled = true
        if (timer !== null) clearTimeout(timer)
        proFsMountWaiters.delete(check)
        resolve(true)
      } else {
        proFsMountWaiters.add(check)
      }
    }
    timer = setTimeout(() => {
      if (settled) return
      settled = true
      proFsMountWaiters.delete(check)
      resolve(false)
    }, timeoutMs)
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
 * Sentinela de "template" para projetos CLÁSSICOS. Todo projeto classic monta o
 * MESMO package.json (WEB_CONTAINER_PACKAGE_DEPENDENCIES), então classic→classic
 * pode preservar `node_modules`; mas pro→classic (ou classic→pro) precisa apagá-lo.
 * Usar este sentinela único faz a comparação de template tratar todos os classic
 * como o mesmo template, distinto de qualquer template pro.
 */
export const CLASSIC_TEMPLATE_ID = '__sz_classic__'

// Template (proMeta.templateId ou CLASSIC_TEMPLATE_ID) cujo `node_modules` está
// atualmente no FS singleton. `null` = desconhecido. Usado para decidir se vale a
// pena preservar `node_modules` na troca de projeto: preservar entre templates
// DIFERENTES (ex.: react-ts → vanilla-vite, ou pro → classic) ENVENENA o `npm
// install` seguinte (deps incompatíveis ficam no FS), então só preservamos quando
// o template novo casa com o que está montado.
let mountedTemplateId: string | null = null

/** Define o template atualmente montado (chamado após um mount bem-sucedido). */
export function setMountedTemplateId(templateId: string | null): void {
  mountedTemplateId = templateId
}

/** Template atualmente montado no FS singleton. Exposto para teste/diagnóstico. */
export function getMountedTemplateId(): string | null {
  return mountedTemplateId
}

export interface ResetWebContainerFsOptions {
  /**
   * Template do projeto que será montado a seguir (`proMeta.templateId`), ou
   * `null` para classic / desconhecido. `node_modules` só é preservado quando
   * casa com o template já montado (`mountedTemplateId`) — entre templates
   * diferentes ele é APAGADO para não envenenar o `npm install`.
   */
  templateId?: string | null
}

/**
 * Apaga o FS do container. Por padrão preserva `node_modules` — usado ao trocar
 * de projeto profissional para remontar a árvore sem reinstalar deps (boot+install
 * são lentos; preservar node_modules evita o npm install de novo quando o template
 * é o MESMO).
 *
 * Quando `templateId` é informado e NÃO casa com o template já montado, o
 * `node_modules` é apagado junto: preservá-lo entre templates diferentes deixaria
 * dependências do template anterior no FS e o `npm install` do novo projeto
 * herdaria árvore incompatível.
 */
export async function resetWebContainerFs(
  wc: WebContainer,
  options: ResetWebContainerFsOptions = {},
): Promise<void> {
  const { templateId } = options
  // Só preserva node_modules quando há um template conhecido em ambos os lados e
  // eles casam. templateId === undefined => caller não thread (compat): mantém o
  // comportamento antigo de preservar. null (classic) nunca casa => apaga.
  const keepNodeModules =
    templateId === undefined || (templateId !== null && templateId === mountedTemplateId)
  const keepSet = new Set(keepNodeModules ? ['node_modules'] : [])
  const entries = await wc.fs.readdir('/', { withFileTypes: true })
  await Promise.all(
    entries
      .filter((entry) => !keepSet.has(entry.name))
      .map((entry) => wc.fs.rm(`/${entry.name}`, { recursive: true, force: true })),
  )
}
