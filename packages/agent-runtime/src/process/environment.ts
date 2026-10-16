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
    // Keep the host's PowerShell module cache configuration. Dropping it made
    // Add-Type take 22s instead of 0.3s on hosted Windows (probe 38843382321).
    // This is a cache location, not a module search path or a credential.
    'PSModuleAnalysisCachePath',
  ]) {
    const value = process.env[name]
    if (value) result[name] = value
  }
  return { ...result, NO_COLOR: '1', ...extra }
}
