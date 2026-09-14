import { markLifecycleBlocksState } from '../blockly/blocksStateVersion'
import {
  CURRENT_PROJECT_FORMAT_VERSION,
  isDocumentRecord,
  ProjectDocumentError,
  projectBlockTypes,
  projectFormatVersion,
  retainProjectTools,
} from '../core/projectDocument'
import { assignMissingBlockIdentities, migrateShadowIdentities } from './blockIdentities'
import { migrateDisabledBlocks } from './disabledBlocks'
import { migrateUnusedKitDeclaration } from './extensionDeclarations'
import { migrateGameTwoDBlocks, migrateGameTwoDIR, migrateGameTwoDToolTypes } from './gameTwoD'
import { migrateGameTwoDHTML } from './html'
import { migrateGameTwoDJavaScript } from './javascript'
import {
  detachRootOnlyDraftCommands,
  historicalAreasHaveDrafts,
  normalizeLegacyBlocksStateToFrames,
} from './legacyFrames'
import { assertConvertedLifecycle } from './lifecycleAudit'
import { migrateNestedPeriodicBlocks, migrateNestedPeriodicIR } from './nestedPeriodics'
import { migrateRpgMapBlocks, migrateRpgMapsIR } from './rpgMaps'
import { migrateTileMaps } from './tileMaps'
import { copyDocument, type MigrationChange, type ProjectMigrationResult } from './types'

export type { MigrationChange, ProjectMigrationResult } from './types'

/** Módulo de entrada isolado. Não grava, não publica e não modifica o original. */
export async function migrateProjectDocument(raw: unknown): Promise<ProjectMigrationResult> {
  const fromVersion = projectFormatVersion(raw)
  const document = copyDocument(raw)
  const changes: MigrationChange[] = []
  if (fromVersion === CURRENT_PROJECT_FORMAT_VERSION)
    return { document, fromVersion, toVersion: CURRENT_PROJECT_FORMAT_VERSION, changes }

  const files = document.files as Record<string, unknown>
  for (const [name, value] of Object.entries(files)) {
    if (typeof value === 'string' && /\.(?:js|mjs|ts|tsx|jsx)$/.test(name))
      files[name] = migrateGameTwoDJavaScript(value, changes, `$.files.${name}`)
    else if (typeof value === 'string' && /\.html?$/.test(name))
      files[name] = migrateGameTwoDHTML(value, changes, `$.files.${name}`)
  }
  if (Array.isArray(document.extraFiles)) {
    for (const [index, file] of document.extraFiles.entries()) {
      if (!isDocumentRecord(file) || typeof file.content !== 'string') continue
      if (file.language === 'javascript' || file.language === 'typescript')
        file.content = migrateGameTwoDJavaScript(
          file.content,
          changes,
          `$.extraFiles[${index}].content`,
        )
      else if (file.language === 'html')
        file.content = migrateGameTwoDHTML(file.content, changes, `$.extraFiles[${index}].content`)
    }
  }
  if (isDocumentRecord(document.tree)) {
    for (const [name, file] of Object.entries(document.tree)) {
      if (!isDocumentRecord(file) || typeof file.content !== 'string') continue
      if (/\.(?:js|mjs|ts|tsx|jsx)$/.test(name))
        file.content = migrateGameTwoDJavaScript(file.content, changes, `$.tree.${name}.content`)
      else if (/\.html?$/.test(name))
        file.content = migrateGameTwoDHTML(file.content, changes, `$.tree.${name}.content`)
    }
  }
  // Derivados da Ponte desatualizada nunca são usados para reconstruir o código.
  if (document.bridgeCodeAhead === true) {
    document.ir = null
    document.blocksState = null
    changes.push({ rule: 'document.code-authority', path: '$' })
  } else {
    // Captura o contrato original antes que a conversão de mapas insira áreas novas.
    const preserveTopLevelDrafts = historicalAreasHaveDrafts(document.blocksState)
    migrateDisabledBlocks(document.blocksState, changes)
    migrateShadowIdentities(document.blocksState, changes)
    projectBlockTypes(document.blocksState)
    migrateRpgMapBlocks(document.blocksState, changes)
    migrateRpgMapsIR(document.ir, changes)
    migrateNestedPeriodicBlocks(document.blocksState, changes)
    migrateNestedPeriodicIR(document.ir, changes)
    document.blocksState = markLifecycleBlocksState(
      normalizeLegacyBlocksStateToFrames(document.blocksState, { preserveTopLevelDrafts }),
    )
    migrateTileMaps(document, changes)
    migrateGameTwoDBlocks(document.blocksState, changes)
    if (detachRootOnlyDraftCommands(document.blocksState))
      changes.push({ rule: 'document.draft-placement', path: '$.blocksState' })
    assignMissingBlockIdentities(document.blocksState, changes)
    document.ir = migrateGameTwoDIR(document.ir, changes)
    if (isDocumentRecord(document.ir) && !('behavior' in document.ir)) {
      const { normalizeSZIR, SZIRInputSchema } = await import('../ir')
      const parsed = SZIRInputSchema.safeParse(document.ir)
      if (!parsed.success)
        throw new ProjectDocumentError(
          'migration-pending',
          'A estrutura antiga do programa precisa de revisão antes da conversão.',
          '$.ir',
        )
      const ir = normalizeSZIR(parsed.data)
      const { generateProjectFiles } = await import('../generators')
      document.ir = ir
      if (document.mode === 'blocks')
        document.files = generateProjectFiles({ ir, projectName: String(document.name) })
      changes.push({ rule: 'document.behavior-areas', path: '$.ir' })
    }
  }
  migrateUnusedKitDeclaration(document, changes)
  assertConvertedLifecycle(document)
  document.projectTools = migrateGameTwoDToolTypes(
    retainProjectTools(document.projectTools, document.blocksState),
  )
  document.formatVersion = CURRENT_PROJECT_FORMAT_VERSION
  changes.push({ rule: 'document.format', path: '$.formatVersion' })
  return { document, fromVersion, toVersion: CURRENT_PROJECT_FORMAT_VERSION, changes }
}
