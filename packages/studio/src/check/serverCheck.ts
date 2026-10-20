/**
 * `@sistemazero/studio/server-check` (etapa 3 dos objetivos, 18/10/2026): o que o Members precisa
 * para pedir ao `studio-runtime` que RODE um projeto e confira os objetivos de execução. Seguro no
 * servidor (sem Blockly, React nem Monaco; o teste de bundle trava).
 *
 * - Clássico: o documento de prévia de sempre (`renderProjectToPreviewDocAsync`), com o leitor de
 *   variáveis injetado no `script.js` (`instrumentCheckScript`).
 * - Pro: os arquivos de texto da árvore e os materiais binários, no formato do `/v1/build`.
 */
import type { Project } from '#core'
import { buildProAssetBundle } from '../core/proAssets'
import { sanitizeProjectAssets } from '../core/project'
import { assertProjectContentPreserved } from '../core/projectDocument'
import { renderProjectToPreviewDocAsync } from '../preview/renderProject'
import { CHECK_SCOPE_PATTERN, instrumentCheckScript } from './instrumentCheckScript'

export { CHECK_SCOPE_PATTERN, instrumentCheckScript }

/** Um nome de escopo novo por teste: o jogo não o adivinha. */
export function createCheckScope(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return `__sz${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

export function isProCheckProject(project: unknown): project is Project & { kind: 'pro' } {
  return (
    typeof project === 'object' &&
    project !== null &&
    (project as Partial<Project>).kind === 'pro' &&
    typeof (project as Partial<Project>).tree === 'object' &&
    (project as Partial<Project>).tree !== null
  )
}

/** O documento que o executor serve como a página do jogo clássico. */
export async function prepareClassicCheckDocument(
  project: unknown,
  scope: string,
): Promise<string> {
  if (!CHECK_SCOPE_PATTERN.test(scope)) throw new Error('Nome de escopo de teste inválido.')
  if (typeof project !== 'object' || project === null || isProCheckProject(project))
    throw new Error('Projeto clássico inválido.')
  return renderProjectToPreviewDocAsync(project as Project, {
    securityProfile: 'strict',
    runtimeInspection: true,
    transformScript: (script) => instrumentCheckScript(script, scope),
  })
}

/** Os arquivos de texto da árvore Pro, como o `/v1/build` recebe. */
export function proCheckSourceFiles(project: Project & { kind: 'pro' }): Record<string, string> {
  return Object.fromEntries(
    Object.entries(project.tree ?? {})
      .filter((entry): entry is [string, { kind: 'file'; content: string }] => {
        const node = entry[1] as { kind?: unknown; content?: unknown } | undefined
        return node?.kind === 'file' && typeof node.content === 'string'
      })
      .map(([path, node]) => [path, node.content]),
  )
}

/** Os materiais (imagens, sons, modelos) do projeto Pro, com o hash que o executor confere. */
export async function proCheckBinaries(
  project: Project & { kind: 'pro' },
): Promise<Record<string, { base64: string; sha256: string }>> {
  const binaries: Record<string, { base64: string; sha256: string }> = {}
  if (project.assets === undefined && !project.proMeta?.origin) return binaries
  if (project.assets !== undefined && !Array.isArray(project.assets))
    throw new Error('Materiais inválidos.')
  const assets = sanitizeProjectAssets(project.assets)
  assertProjectContentPreserved({ assets: project.assets }, { ...project, assets })
  const bundle = await buildProAssetBundle(assets, project.tree, {
    legacyRuntime: Boolean(project.proMeta?.origin),
  })
  for (const [path, bytes] of bundle.files) {
    const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(bytes)))
    binaries[path] = {
      base64: Buffer.from(bytes).toString('base64'),
      sha256: Array.from(hash, (byte) => byte.toString(16).padStart(2, '0')).join(''),
    }
  }
  return binaries
}
