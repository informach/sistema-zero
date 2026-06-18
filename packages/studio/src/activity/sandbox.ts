import type { Project } from '#core'
import type { ExtensionPermission } from '#extensions'
import { findExtension } from '#official-extensions'
import { buildPreviewDoc, isCheckResultMessage } from '#preview'
import type { CheckResult } from '../studio/activity'
import { buildCheckHarness, type SandboxCheck } from './harness'

export interface SandboxSecurity {
  fetchAllowedOrigins?: readonly string[]
  loopBudgetMs?: number
}

export interface RunSandboxOptions {
  /** Teto total da rodada (ms). Default 6000. */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 6_000

/**
 * Roda as checagens de SANDBOX (behavior/testcase/code) num iframe OCULTO,
 * reusando o `buildPreviewDoc` (mesmo programa do aluno + extensões + guardas) com
 * o harness injetado. Coleta os `checkResult` (autenticando por
 * `ev.source === iframe.contentWindow`, como o PreviewIframe) e resolve quando
 * todos chegam ou no timeout (faltantes = falha por tempo). Só no client.
 */
export async function runSandboxChecks(
  project: Project,
  checks: readonly SandboxCheck[],
  security: SandboxSecurity = {},
  opts: RunSandboxOptions = {},
): Promise<CheckResult[]> {
  if (checks.length === 0) return []
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return checks.map((c) => failed(c, 'sandbox indisponível'))
  }

  const ids = project.installedExtensions.map((e) => e.id)
  const extensionScripts = ids
    .map((id) => findExtension(id)?.runtime.bootstrapScript)
    .filter((s): s is string => Boolean(s))
  const extensionImports: Record<string, string> = {}
  const permissions = new Set<ExtensionPermission>()
  for (const id of ids) {
    const ext = findExtension(id)
    if (!ext) continue
    if (ext.runtime.esmImports) Object.assign(extensionImports, ext.runtime.esmImports)
    for (const p of ext.manifest.permissions) permissions.add(p)
  }

  const parentOrigin = window.location.origin
  const harness = buildCheckHarness(checks, { parentOrigin })
  const doc = buildPreviewDoc({
    html: project.files['index.html'] ?? '',
    css: project.files['style.css'] ?? '',
    js: project.files['script.js'] ?? '',
    // O harness vai POR ÚLTIMO: roda no `load`, depois das extensões e do aluno.
    extensionScripts: [...extensionScripts, harness],
    extraFiles: project.extraFiles,
    parentOrigin,
    installedPermissions: Array.from(permissions),
    fetchAllowedOrigins: security.fetchAllowedOrigins,
    loopBudgetMs: security.loopBudgetMs,
    extensionImports,
  })

  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const pending = new Map(checks.map((c) => [c.id, c]))
  const collected = new Map<string, CheckResult>()

  return new Promise<CheckResult[]>((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('sandbox', 'allow-scripts allow-modals')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.position = 'absolute'
    iframe.style.width = '1024px'
    iframe.style.height = '768px'
    iframe.style.left = '-99999px'
    iframe.style.top = '0'
    iframe.style.border = '0'
    iframe.style.visibility = 'hidden'

    let done = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const finish = () => {
      if (done) return
      done = true
      if (timer) clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      iframe.remove()
      // Faltantes (não reportaram a tempo) = falha por tempo.
      for (const [id, check] of pending) {
        collected.set(id, failed(check, 'a checagem não respondeu a tempo'))
      }
      resolve(checks.map((c) => collected.get(c.id) ?? failed(c, 'sem resultado')))
    }

    const onMessage = (ev: MessageEvent) => {
      if (!iframe.contentWindow || ev.source !== iframe.contentWindow) return
      if (ev.origin !== 'null' && ev.origin !== parentOrigin) return
      if (!isCheckResultMessage(ev.data)) return
      const check = pending.get(ev.data.checkId)
      if (!check) return
      pending.delete(ev.data.checkId)
      collected.set(check.id, {
        checkId: check.id,
        kind: check.kind,
        passed: ev.data.passed,
        message: ev.data.passed ? undefined : ev.data.message,
        verifiedBy: 'client',
      })
      if (pending.size === 0) finish()
    }

    window.addEventListener('message', onMessage)
    timer = setTimeout(finish, timeoutMs)
    iframe.srcdoc = doc
    document.body.appendChild(iframe)
  })
}

function failed(check: SandboxCheck, message: string): CheckResult {
  return { checkId: check.id, kind: check.kind, passed: false, message, verifiedBy: 'client' }
}
