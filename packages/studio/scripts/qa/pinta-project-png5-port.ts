// Build this exact entry against the archived 16bf source for the old side.

export {
  getPersonalAsset,
  getPersonalAssetsNamespace,
  savePersonalAsset,
  setPersonalAssetsNamespace,
} from '../../src/asset-library/personal'
export { syncDrawingsIntoProjects } from '../../src/asset-library/personalSync'
export { createEmptyProject } from '../../src/core/project'
export { sanitizeProjectAssets } from '../../src/core/projectAssets'
export {
  discardImportedProjectSnapshot,
  restoreProjectFromCloud,
} from '../../src/projects/importSnapshot'
export { prepareEditableStudioProject } from '../../src/state/editableProjectValidation'
export {
  listProjectSummariesLight,
  loadProjectAssetsSnapshotById,
  loadProjectById,
  persistProject,
  persistProjectAssets,
  setStorageNamespace,
  setStudioCloudMirror,
} from '../../src/state/persistence'
export {
  captureProjectStorageScope,
  getProjectStorageScope,
  setProjectStorageNamespace,
} from '../../src/state/projectStorageRuntime'
export { useProjectStore } from '../../src/state/projectStore'
export { validateEditableStudioCreationSnapshot } from '../../src/state/projectValidation'
