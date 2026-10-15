export function processEnvironment(extra: Record<string, string> = {}) {
  const result: Record<string, string> = {}
  for (const name of [
    'PATH',
    'Path',
    'SystemRoot',
    'SYSTEMROOT',
    'WINDIR',
    'COMSPEC',
    'TEMP',
    'TMP',
    'HOME',
    'USERPROFILE',
    'LOCALAPPDATA',
    'APPDATA',
    'PATHEXT',
    'LANG',
  ]) {
    const value = process.env[name]
    if (value) result[name] = value
  }
  return { ...result, NO_COLOR: '1', ...extra }
}
