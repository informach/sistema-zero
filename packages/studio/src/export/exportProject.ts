import type { Project } from '#core'
import { classicDeployTemplates, proDeployTemplates } from './deployTemplates'
import { buildClassicFileMap, buildProFileMap, type ExportFileMap } from './fileMap'
import { defaultMinifiers, identityMinifiers, type Minifiers } from './minify'
import { sanitizeBaseFilename } from './sanitize'
import { zipFiles } from './zip'

export type ExportStep = 'collecting' | 'minifying' | 'zipping' | 'done'

export interface ExportOptions {
  /** Minifica o caminho clássico. Default true. Ignorado no pro (Vite minifica). */
  minify?: boolean
  /** Injeta minificadores (testes usam `identityMinifiers`). */
  minifiers?: Minifiers
  /** Progresso grosso para a UI. */
  onProgress?: (step: ExportStep, pct: number) => void
}

export interface ExportResult {
  blob: Blob
  filename: string
  kind: 'classic' | 'pro'
  /** Avisos não-fatais (ex.: pro sem script de build). */
  warnings: string[]
}

/**
 * Build de produção do projeto → ZIP pronto para deploy (Railway). Clássico vira
 * site estático minificado sob `public/`; pro embarca a árvore Vite e o build
 * roda no deploy. Em ambos adiciona Dockerfile/railway.json/.dockerignore/README.
 */
export async function exportProject(
  project: Project,
  opts: ExportOptions = {},
): Promise<ExportResult> {
  const report = (step: ExportStep, pct: number) => opts.onProgress?.(step, pct)
  const isPro = project.kind === 'pro' && !!project.tree

  report('collecting', 5)

  let files: ExportFileMap
  const warnings: string[] = []

  if (isPro) {
    const built = buildProFileMap(project)
    files = built.files
    warnings.push(...built.warnings)
    // Não sobrescreve arquivos de deploy que o usuário já tenha na árvore.
    const deploy = proDeployTemplates(project.name)
    for (const [path, content] of Object.entries(deploy)) {
      if (!(path in files)) files[path] = content
    }
  } else {
    report('minifying', 30)
    const minifiers =
      opts.minifiers ?? (opts.minify === false ? identityMinifiers : await defaultMinifiers())
    const built = await buildClassicFileMap(project, minifiers)
    files = built.files
    warnings.push(...built.warnings)
    Object.assign(files, classicDeployTemplates(project.name))
  }

  report('zipping', 80)
  const bytes = await zipFiles(files)
  // Cópia para um Uint8Array com ArrayBuffer "comum": o retorno do fflate é
  // tipado como ArrayBufferLike (pode ser SharedArrayBuffer), que o Blob recusa.
  const blobBytes = new Uint8Array(bytes.byteLength)
  blobBytes.set(bytes)
  const blob = new Blob([blobBytes], { type: 'application/zip' })

  report('done', 100)

  return {
    blob,
    filename: `${sanitizeBaseFilename(project.name)}-deploy.zip`,
    kind: isPro ? 'pro' : 'classic',
    warnings,
  }
}
