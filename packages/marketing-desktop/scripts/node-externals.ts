import manifest from '../package.json'

/** Workspace packages publish TypeScript sources and must be bundled for Node/Electron. */
export const nativeExternals = [
  'electron',
  ...Object.entries(manifest.dependencies)
    .filter(([, version]) => !version.startsWith('workspace:'))
    .map(([name]) => name),
]
