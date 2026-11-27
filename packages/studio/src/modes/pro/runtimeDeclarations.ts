import { verifyStudioProPlatformFiles } from '@sistemazero/core/studio/pro-revision'
import declarations from './runtimeDeclarations.generated.json'

export function proRuntimeDeclarations(extensionId: string): Record<string, string> {
  if (extensionId !== 'game-2d' && extensionId !== 'game-2d-advanced') return {}
  const api = extensionId === 'game-2d' ? 'GameTwoDRuntimeApi' : 'GameKitRuntimeApi'
  const global = extensionId === 'game-2d' ? 'SZGame2D' : 'SZGameKit'
  const files = Object.fromEntries(
    Object.entries(declarations)
      .filter(
        ([path]) => !path.startsWith(extensionId === 'game-2d' ? 'game-2d-advanced/' : 'game-2d/'),
      )
      .map(([path, text]) => ['src/sz-platform/' + path, text]),
  )
  files['src/sz-platform/globals-' + extensionId + '.d.ts'] = [
    '// Generated platform API declarations for this converted project.',
    `import type { ${api} } from './${extensionId}/runtimeContract'`,
    "import type { MapTwoDApi } from './map-2d/contract'",
    "import type { ProjectRunContext } from './lifecycle'",
    'declare global {',
    `  var ${global}: ${api} & MapTwoDApi`,
    '  var ctx: CanvasRenderingContext2D',
    '  interface Window {',
    `    ${global}: typeof ${global}`,
    '    __SZProjectLifecycle: { begin(requestRestart: () => void): ProjectRunContext }',
    '  }',
    '}',
    'export {}',
    '',
  ].join('\n')
  return files
}

/** Derived files never replace authored files at the same path. */
export function withProRuntimeDeclarations(files: Record<string, string>, extensionId: string) {
  const result = { ...files }
  for (const [path, content] of Object.entries(proRuntimeDeclarations(extensionId))) {
    if (result[path] !== undefined && result[path] !== content)
      throw new Error('Os tipos do motor foram modificados. O original foi preservado.')
    result[path] = content
  }
  return result
}

export async function withKnownProRuntimeDeclarations(files: Record<string, string>) {
  const verified = await verifyStudioProPlatformFiles(files)
  let result = files
  for (const id of ['game-2d', 'game-2d-advanced']) {
    if (verified.has('public/sz-ext/' + id + '.js')) result = withProRuntimeDeclarations(result, id)
  }
  return result
}
