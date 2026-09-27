import { isDocumentRecord, projectBlockTypes } from '../core/projectDocument'
import type { MigrationChange } from './types'

/** Uma instalação sem nenhum uso pode sair sem retirar recursos do programa. */
export function migrateUnusedKitDeclaration(
  document: Record<string, unknown>,
  changes: MigrationChange[],
): void {
  if (!Array.isArray(document.installedExtensions)) return
  const declarations = document.installedExtensions
  if (
    !declarations.some((item) => isDocumentRecord(item) && item.id === 'game-2d') ||
    !declarations.some((item) => isDocumentRecord(item) && item.id === 'game-2d-advanced')
  )
    return
  if (projectBlockTypes(document.blocksState).some((type) => type.startsWith('sz_gk_'))) return
  if (
    Array.isArray(document.projectTools) &&
    document.projectTools.some((type) => typeof type === 'string' && type.startsWith('sz_gk_'))
  )
    return
  // Também considera rascunhos, arquivos auxiliares e Código/Ponte. Na dúvida,
  // a declaração é conservada e o validador explica o conflito ao operador.
  const pending = [document.ir, document.files, document.extraFiles, document.tree]
  while (pending.length) {
    const node = pending.pop()
    if (typeof node === 'string' && node.includes('SZGameKit')) return
    if (Array.isArray(node)) pending.push(...node)
    else if (isDocumentRecord(node)) {
      if (typeof node.type === 'string' && node.type.startsWith('gk:')) return
      pending.push(...Object.values(node))
    }
  }
  const index = declarations.findIndex(
    (item) => isDocumentRecord(item) && item.id === 'game-2d-advanced',
  )
  document.installedExtensions = declarations.filter((_, at) => at !== index)
  changes.push({
    rule: 'document.unused-conflicting-extension',
    path: `$.installedExtensions[${index}]`,
  })
}
