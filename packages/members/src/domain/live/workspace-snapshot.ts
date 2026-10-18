import { ValidationError } from '@sistemazero/core/errors'
import { isStudioProRevisionPath } from '@sistemazero/core/studio/pro-revision'
import {
  StudioJavaScriptProMetadataSchema,
  StudioProjectDocumentSchema,
  StudioProjectTreeSchema,
} from '@sistemazero/core/studio/project-document'
import {
  STUDIO_PROJECT_FORMAT_VERSION,
  STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION,
} from '@sistemazero/core/studio/project-format'

function isDocumentRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
  )
}

function copyDocument(raw: unknown): Record<string, unknown> {
  const pending = [{ value: raw, depth: 0 }]
  let nodes = 0
  while (pending.length) {
    const item = pending.pop()!
    if (++nodes > 50_000 || item.depth > 100) throw new Error('Complexity limit')
    if (item.value === null || ['string', 'boolean'].includes(typeof item.value)) continue
    if (typeof item.value === 'number' && Number.isFinite(item.value)) continue
    if (!Array.isArray(item.value) && !isDocumentRecord(item.value))
      throw new Error('Invalid JSON value')
    for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(item.value))) {
      if (!('value' in descriptor)) throw new Error('Executable property')
      pending.push({ value: descriptor.value, depth: item.depth + 1 })
    }
  }
  return JSON.parse(JSON.stringify(raw)) as Record<string, unknown>
}

/** Structural storage boundary. The editor applies its full tool/Blockly validation on load.
 * Never import the browser extension registry into Members to validate a JSON snapshot. */
export function validateLiveSnapshot(
  raw: Record<string, unknown>,
  id: string,
): Record<string, unknown> {
  let project: Record<string, unknown>
  try {
    project = copyDocument(raw)
  } catch {
    throw new ValidationError('O projeto precisa ser um documento JSON válido.')
  }
  if (Buffer.byteLength(JSON.stringify(project), 'utf8') > 2_000_000)
    throw new ValidationError('O projeto da oficina pode ter até 2 MB.')
  if (
    project.id !== id ||
    (project.formatVersion !== STUDIO_PROJECT_FORMAT_VERSION &&
      project.formatVersion !== STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION)
  )
    throw new ValidationError('A identidade ou versão do projeto não corresponde à oficina.')
  if (project.formatVersion === STUDIO_PROJECT_SUPPORTED_FORMAT_VERSION) {
    if (!StudioProjectDocumentSchema.safeParse(project).success)
      throw new ValidationError('O ambiente e os arquivos do projeto não são compatíveis.')
  } else {
    // Legacy JS remains byte-for-byte intact; only v3 can carry a runtime/Python lock.
    if (
      (project.programmingLanguage !== undefined && project.programmingLanguage !== 'javascript') ||
      project.runtime !== undefined ||
      project.python !== undefined ||
      (project.kind !== undefined && project.kind !== 'classic' && project.kind !== 'pro') ||
      (project.kind === 'pro'
        ? project.mode !== 'code'
        : !['blocks', 'bridge'].includes(String(project.mode)))
    )
      throw new ValidationError('O tipo e o modo do projeto não correspondem ao formato enviado.')
  }
  if (typeof project.name !== 'string' || !project.name.trim() || project.name.length > 200)
    throw new ValidationError('Nome de projeto inválido.')
  if (
    project.programmingLanguage !== 'python' &&
    (!isDocumentRecord(project.files) ||
      !['index.html', 'style.css', 'script.js'].every(
        (file) =>
          typeof project.files === 'object' &&
          project.files !== null &&
          typeof (project.files as Record<string, unknown>)[file] === 'string',
      ))
  )
    throw new ValidationError('Os arquivos básicos do projeto estão incompletos.')
  if (
    isDocumentRecord(project.files) &&
    !Object.values(project.files).every((value) => typeof value === 'string')
  )
    throw new ValidationError('Arquivo de projeto inválido.')
  if (project.kind === 'pro' && project.programmingLanguage !== 'python') {
    const tree = StudioProjectTreeSchema.safeParse(project.tree)
    if (
      !tree.success ||
      Object.keys(tree.data).length > 5000 ||
      !StudioJavaScriptProMetadataSchema.safeParse(project.proMeta).success
    )
      throw new ValidationError('A árvore ou a configuração do projeto Pro está incompleta.')
    const seen = new Set<string>()
    for (const path of Object.keys(tree.data)) {
      if (!isStudioProRevisionPath(path) || seen.has(path.toLowerCase()))
        throw new ValidationError('O projeto Pro contém caminhos inválidos ou repetidos.')
      seen.add(path.toLowerCase())
      const parts = path.split('/')
      for (let index = 1; index < parts.length; index++)
        if (tree.data[parts.slice(0, index).join('/')]?.kind !== 'dir')
          throw new ValidationError('Uma pasta do projeto Pro está ausente.')
    }
  }
  if (project.assets !== undefined) {
    if (!Array.isArray(project.assets)) throw new ValidationError('Arquivos do projeto inválidos.')
    const names = new Set<string>()
    for (const asset of project.assets) {
      if (
        !isDocumentRecord(asset) ||
        typeof asset.name !== 'string' ||
        !/^[a-z0-9][a-z0-9-]*$/.test(asset.name) ||
        names.has(asset.name) ||
        typeof asset.dataUrl !== 'string' ||
        !/^data:(image\/|audio\/|model\/gltf-binary)/.test(asset.dataUrl)
      )
        throw new ValidationError('Inclua todos os arquivos do projeto no documento enviado.')
      names.add(asset.name)
    }
  }
  if (
    !Array.isArray(project.installedExtensions) ||
    project.installedExtensions.length > 40 ||
    !project.installedExtensions.every(
      (extension) =>
        isDocumentRecord(extension) &&
        typeof extension.id === 'string' &&
        extension.id.length <= 100 &&
        typeof extension.version === 'string',
    )
  )
    throw new ValidationError('Ferramentas do projeto inválidas.')
  return project
}
