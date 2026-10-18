import {
  STUDIO_PROJECT_FORMAT_VERSION,
  STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION,
} from '@sistemazero/core/studio/project-format'
import {
  copyStudioProjectJson,
  StudioProjectJsonError,
} from '@sistemazero/core/studio/project-json'

/** Versão do documento, independente da revisão de gravação e da paleta. */
export const CURRENT_PROJECT_FORMAT_VERSION = STUDIO_PROJECT_FORMAT_VERSION
/** Read support precedes the default writer switch, so existing JS paths stay stable. */
export const SUPPORTED_PROJECT_FORMAT_VERSION = STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION

export class ProjectDocumentError extends Error {
  constructor(
    readonly code:
      | 'invalid-document'
      | 'future-format'
      | 'migration-required'
      | 'migration-pending',
    message: string,
    readonly path = '$',
  ) {
    super(message)
    this.name = 'ProjectDocumentError'
  }
}

/**
 * O projeto passa dos tetos de tamanho ou de complexidade. É recusa PERMANENTE (tentar de novo não
 * resolve), e a importação diz isso à criança. ⚠️ NÃO estende `ProjectDocumentError` de propósito:
 * quem pergunta por aquela classe (o `/jogar`, a migração local) a lê como "aguardando conversão",
 * e um projeto grande demais não vai melhorar com conversão.
 */
export class ProjectTooLargeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ProjectTooLargeError'
  }
}

export function isDocumentRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const prototype = Object.getPrototypeOf(value)
  return prototype === Object.prototype || prototype === null
}

export function projectFormatVersion(raw: unknown): number {
  if (!isDocumentRecord(raw))
    throw new ProjectDocumentError('invalid-document', 'O projeto precisa ser um objeto JSON.')
  const descriptor = Object.getOwnPropertyDescriptor(raw, 'formatVersion')
  if (descriptor && !('value' in descriptor))
    throw new ProjectDocumentError(
      'invalid-document',
      'A versão do projeto precisa ser um valor JSON.',
    )
  const version: unknown = descriptor?.value
  if (version === undefined) return 1
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1)
    throw new ProjectDocumentError('invalid-document', 'A versão do projeto é inválida.')
  if (version > SUPPORTED_PROJECT_FORMAT_VERSION)
    throw new ProjectDocumentError(
      'future-format',
      'Este projeto foi salvo por uma versão mais nova do Estúdio. Atualize a página para abri-lo.',
    )
  return version
}

export const MAX_PROJECT_BLOCKS = 10_000

/** Somente tipos presentes no programa; campos/metadados arbitrários não concedem ferramentas. */
export function projectBlockTypes(state: unknown): string[] {
  if (!isDocumentRecord(state) || !isDocumentRecord(state.blocks)) return []
  const tops = state.blocks.blocks
  if (!Array.isArray(tops)) return []
  const pending: unknown[] = [...tops]
  const seen = new Set<object>()
  const ids = new Set<string>()
  const types = new Set<string>()
  while (pending.length) {
    const node = pending.pop()
    if (!isDocumentRecord(node)) continue
    if (seen.has(node))
      throw new ProjectDocumentError(
        'invalid-document',
        'O projeto contém blocos repetidos em ciclo.',
      )
    seen.add(node)
    if (typeof node.id === 'string') {
      if (ids.has(node.id))
        throw new ProjectDocumentError(
          'invalid-document',
          `Dois blocos usam o mesmo identificador (${node.id}).`,
        )
      ids.add(node.id)
    }
    if (seen.size > MAX_PROJECT_BLOCKS)
      throw new ProjectDocumentError('invalid-document', 'O projeto excede o limite de blocos.')
    if (typeof node.type === 'string') types.add(node.type)
    if (isDocumentRecord(node.next)) pending.push(node.next.block)
    if (isDocumentRecord(node.inputs)) {
      if (
        typeof node.type === 'string' &&
        node.type.startsWith('sz_frame_') &&
        Object.keys(node.inputs).some((key) => key !== 'CHILDREN')
      )
        throw new ProjectDocumentError(
          'invalid-document',
          'Uma área do projeto contém um encaixe desconhecido. O original foi preservado.',
        )
      for (const input of Object.values(node.inputs)) {
        if (!isDocumentRecord(input)) continue
        pending.push(input.block, input.shadow)
      }
    }
  }
  return [...types].sort()
}

const preservedContentKeys = [
  'files',
  'extraFiles',
  'assets',
  'installedExtensions',
  'tree',
  'proMeta',
  'programmingLanguage',
  'runtime',
  'python',
] as const

type ProjectContent = Partial<Record<(typeof preservedContentKeys)[number], unknown>> & {
  kind?: unknown
  ir?: unknown
  blocksState?: unknown
}

/** Validação nunca pode transformar uma leitura bem-sucedida em perda silenciosa. */
export function assertProjectContentPreserved(raw: unknown, project: ProjectContent): void {
  if (!isDocumentRecord(raw))
    throw new ProjectDocumentError('invalid-document', 'O projeto não é um documento JSON.')
  const compare = (original: unknown, converted: unknown, sourcePath: string): void => {
    const pending = [{ before: original, after: converted, path: sourcePath }]
    let nodes = 0
    while (pending.length) {
      const { before, after, path } = pending.pop()!
      if (++nodes > 500_000)
        throw new ProjectDocumentError(
          'invalid-document',
          'O projeto excede o limite de complexidade.',
          path,
        )
      if (before === undefined || before === null || Object.is(before, after)) continue
      if (Array.isArray(before) && Array.isArray(after) && before.length === after.length) {
        before.forEach((value, index) => {
          pending.push({ before: value, after: after[index], path: `${path}[${index}]` })
        })
        continue
      }
      if (isDocumentRecord(before) && isDocumentRecord(after)) {
        for (const [key, value] of Object.entries(before))
          pending.push({ before: value, after: after[key], path: `${path}.${key}` })
        continue
      }
      throw new ProjectDocumentError(
        'invalid-document',
        `Este projeto não pode ser aberto integralmente nesta versão (${path}). Nenhuma cópia foi gravada.`,
        path,
      )
    }
  }
  for (const key of preservedContentKeys) compare(raw[key], project[key], `$.${key}`)
  if (raw.kind === 'pro' && project.kind !== 'pro')
    throw new ProjectDocumentError(
      'invalid-document',
      'A estrutura do projeto de Código é inválida.',
    )
  if (raw.bridgeCodeAhead !== true) {
    compare(raw.ir, project.ir, '$.ir')
    // Python visual state is a derived cache, not a JavaScript Blockly document.
    // Preserve it structurally; only its language adapter can interpret it after
    // reparsing authoritative source. Keep the historical JavaScript guard intact.
    if (raw.programmingLanguage === 'python' || projectBlockTypes(raw.blocksState).length > 0)
      compare(raw.blocksState, project.blocksState, '$.blocksState')
  }
}

export function retainProjectTools(existing: unknown, blocksState: unknown): string[] {
  if (
    existing !== undefined &&
    (!Array.isArray(existing) ||
      existing.some((value) => typeof value !== 'string' || value.length > 160))
  )
    throw new ProjectDocumentError(
      'invalid-document',
      'A lista de ferramentas deste jogo é inválida.',
    )
  const tools: string[] = Array.isArray(existing) ? existing : []
  if (tools.length > 5000)
    throw new ProjectDocumentError(
      'invalid-document',
      'A lista de ferramentas deste jogo excede o limite.',
    )
  return [...new Set([...tools, ...projectBlockTypes(blocksState)])].sort()
}

/** Shared structural guard; source semantics remain the language adapter's responsibility. */
export function copyDocument(raw: unknown): Record<string, unknown> {
  let document: unknown
  try {
    document = copyStudioProjectJson(raw)
  } catch (error) {
    if (error instanceof StudioProjectJsonError)
      throw new ProjectDocumentError('invalid-document', error.message)
    throw error
  }
  if (!isDocumentRecord(document))
    throw new ProjectDocumentError('invalid-document', 'O projeto precisa ser um objeto JSON.')
  const pythonPro =
    document.formatVersion === 3 &&
    document.programmingLanguage === 'python' &&
    document.kind === 'pro'
  if (
    typeof document.name !== 'string' ||
    !isDocumentRecord(pythonPro ? document.tree : document.files)
  )
    throw new ProjectDocumentError(
      'invalid-document',
      'O projeto não contém nome e arquivos válidos.',
    )
  return document
}
