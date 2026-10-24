/** Canonical relative paths shared by Python documents and portable release artifacts. */
export function isStudioPortablePath(path: string): boolean {
  if (!path || path.length > 240) return false
  const parts = path.split('/')
  return (
    parts.length <= 16 &&
    parts.every(
      (part) =>
        /^[A-Za-z0-9_.-]+$/.test(part) &&
        part !== '.' &&
        part !== '..' &&
        !part.endsWith('.') &&
        !/^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])(?:\.|$)/i.test(part) &&
        ![
          '.git',
          '.venv',
          'node_modules',
          '__pycache__',
          '__proto__',
          'constructor',
          'prototype',
        ].includes(part.toLowerCase()),
    )
  )
}

/** Imported media keeps its relative path, including files at the project root. */
export function isStudioPythonAssetPath(path: unknown): path is string {
  return (
    typeof path === 'string' &&
    isStudioPortablePath(path) &&
    !path.split('/').some((part) => part.startsWith('.')) &&
    /\.(?:png|jpe?g|webp|gif|svg|avif|bmp|mp3|ogg|oga|wav|webm|m4a|mp4|flac|glb|hdr|ttf|otf)$/i.test(
      path,
    )
  )
}

/** Files, explicit directories and implicit parents must form one portable tree. */
export function studioPortableFileConflict(
  paths: readonly string[],
  directories: readonly string[] = [],
): string | null {
  const nodes = new Map<string, { path: string; kind: 'file' | 'dir' }>()
  for (const leafKind of ['dir', 'file'] as const) {
    for (const path of leafKind === 'dir' ? directories : paths) {
      const parts = path.split('/')
      for (let index = 0; index < parts.length; index++) {
        const prefix = parts.slice(0, index + 1).join('/')
        const key = prefix.toLowerCase()
        const kind = index === parts.length - 1 ? leafKind : 'dir'
        const previous = nodes.get(key)
        if (previous && (previous.path !== prefix || previous.kind !== kind || kind === 'file'))
          return prefix
        nodes.set(key, { path: prefix, kind })
      }
    }
  }
  return null
}
