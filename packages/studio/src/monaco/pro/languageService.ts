import ts from 'typescript'

export const PRO_TYPESCRIPT_VERSION = '5.9.3'
export interface ProLanguageDiagnostic {
  path: string
  code: number
  message: string
  severity: 'error' | 'warning' | 'info'
  start: number
  length: number
}

function absolute(path: string): string {
  const parts: string[] = []
  for (const part of path.replaceAll('\\', '/').split('/')) {
    if (part === '..') parts.pop()
    else if (part && part !== '.') parts.push(part)
  }
  return `/${parts.join('/')}`
}

function matches(path: string, pattern: string): boolean {
  const glob = pattern.replaceAll('\\', '/')
  if (!/[*?]/.test(glob)) return path === glob || path.startsWith(`${glob}/`)
  const source = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*\*/g, '\u0001')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replaceAll('\u0000', '(?:.*/)?')
    .replaceAll('\u0001', '.*')
  return new RegExp(`^${source}$`).test(path)
}

/** Pure virtual filesystem + official TS service. Each instance has its own options and cache. */
export function createProLanguageService(defaultLibraries: Record<string, string>) {
  const files = new Map<string, { text: string; version: number }>()
  let availableFiles = new Set<string>()
  let availableSnapshot: readonly string[] | undefined
  const libraries = new Map(
    Object.entries(defaultLibraries).map(([name, text]) => [`/lib/${name}`, text]),
  )
  let revision = 0
  let invalidatedResolutions = false
  let roots: string[] = []
  let configErrors: readonly ts.Diagnostic[] = []
  let options: ts.CompilerOptions = {}
  const read = (path: string) => files.get(absolute(path))?.text ?? libraries.get(absolute(path))
  const fileExists = (path: string) =>
    availableFiles.has(absolute(path)) || read(path) !== undefined
  const directoryIndex = new Map<string, Set<string>>()
  const directoryExists = (path: string) => directoryIndex.has(absolute(path))
  const directories = (path: string) => [...(directoryIndex.get(absolute(path)) ?? [])]
  const readDirectory: ts.ParseConfigHost['readDirectory'] = (
    rootDir,
    extensions,
    excludes,
    includes,
    depth,
  ) => {
    const prefix = `${absolute(rootDir)}/`
    return [...files.keys()].filter((path) => {
      if (!path.startsWith(prefix) || !extensions.some((ext) => path.endsWith(ext))) return false
      const relative = path.slice(prefix.length)
      if (depth !== undefined && relative.split('/').length > depth + 1) return false
      return (
        !(excludes ?? []).some((pattern) => matches(relative, pattern.replace(`${prefix}`, ''))) &&
        (includes ?? ['**/*']).some((pattern) =>
          matches(relative, pattern.replace(`${prefix}`, '')),
        )
      )
    })
  }
  // TS 5.9 forwards this CompilerHost hook from the language host when rebuilding
  // its program. Preserve parsed sources while invalidating npm resolution caches.
  const host: ts.LanguageServiceHost & Pick<ts.CompilerHost, 'hasInvalidatedResolutions'> = {
    getCompilationSettings: () => options,
    getScriptFileNames: () => roots,
    getScriptVersion: (path) => String(files.get(absolute(path))?.version ?? 0),
    getProjectVersion: () => String(revision),
    hasInvalidatedResolutions: () => invalidatedResolutions,
    getScriptSnapshot: (path) => {
      const text = read(path)
      return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text)
    },
    getCurrentDirectory: () => '/project',
    getDefaultLibFileName: (compilerOptions) => `/lib/${ts.getDefaultLibFileName(compilerOptions)}`,
    fileExists,
    readFile: read,
    readDirectory: (path, extensions, exclude, include, depth) => [
      ...readDirectory(
        path,
        extensions ?? ['.ts', '.tsx', '.js', '.jsx', '.json'],
        exclude,
        include ?? ['**/*'],
        depth,
      ),
    ],
    directoryExists,
    getDirectories: directories,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
    realpath: absolute,
  }
  const service = ts.createLanguageService(host, ts.createDocumentRegistry(true, '/project'))
  const synchronize = () => {
    service.getProgram()
    invalidatedResolutions = false
  }
  const diagnostic = (item: ts.Diagnostic): ProLanguageDiagnostic => ({
    path: item.file?.fileName.replace('/project/', '') ?? 'tsconfig.json',
    code: item.code,
    message: ts.flattenDiagnosticMessageText(item.messageText, '\n'),
    severity:
      item.category === ts.DiagnosticCategory.Error
        ? 'error'
        : item.category === ts.DiagnosticCategory.Warning
          ? 'warning'
          : 'info',
    start: item.start ?? 0,
    length: item.length ?? 1,
  })
  return {
    version: ts.version,
    /** Full document/dependency snapshot; unchanged scripts retain versions and parsed trees. */
    update(snapshot: Record<string, string>, available: readonly string[] = []) {
      revision++
      let structureChanged = revision === 1
      let configurationChanged = revision === 1
      if (availableSnapshot !== available) {
        const nextAvailable = new Set(available.map((path) => absolute(`/project/${path}`)))
        if (
          availableFiles.size !== nextAvailable.size ||
          [...nextAvailable].some((path) => !availableFiles.has(path))
        ) {
          invalidatedResolutions = true
          structureChanged = true
        }
        availableFiles = nextAvailable
        availableSnapshot = available
      }
      const paths = new Set<string>()
      for (const [path, text] of Object.entries(snapshot)) {
        const full = absolute(`/project/${path}`)
        paths.add(full)
        const previous = files.get(full)
        if (!previous) structureChanged = true
        if (previous?.text !== text && full.endsWith('.json')) configurationChanged = true
        if (
          !previous ||
          (previous.text !== text &&
            (full.includes('/node_modules/') ||
              /\/(?:tsconfig|jsconfig|package)\.json$/.test(full)))
        )
          invalidatedResolutions = true
        if (previous?.text !== text)
          files.set(full, { text, version: (previous?.version ?? 0) + 1 })
      }
      for (const path of files.keys())
        if (!paths.has(path)) {
          files.delete(path)
          invalidatedResolutions = true
          structureChanged = true
        }
      if (structureChanged) {
        directoryIndex.clear()
        for (const path of [...files.keys(), ...libraries.keys(), ...availableFiles]) {
          const parts = path.split('/')
          parts.pop()
          while (parts.length > 1) {
            const dir = parts.join('/')
            if (!directoryIndex.has(dir)) directoryIndex.set(dir, new Set())
            parts.pop()
            const parent = parts.join('/') || '/'
            if (!directoryIndex.has(parent)) directoryIndex.set(parent, new Set())
            directoryIndex.get(parent)?.add(dir)
          }
        }
      }
      if (!structureChanged && !configurationChanged) return
      const configName = files.has('/project/tsconfig.json') ? 'tsconfig.json' : 'jsconfig.json'
      const configText = read(`/project/${configName}`)
      const parsed = configText
        ? ts.parseConfigFileTextToJson(configName, configText)
        : { config: {} }
      const base: ts.CompilerOptions = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        jsx: ts.JsxEmit.ReactJSX,
        allowJs: true,
        checkJs: true,
        strict: true,
        noEmit: true,
        skipLibCheck: true,
      }
      const configHost = {
        useCaseSensitiveFileNames: true,
        fileExists,
        readFile: read,
        readDirectory,
      }
      const explicit = ts.parseJsonConfigFileContent(
        parsed.config ?? {},
        configHost,
        '/project',
        undefined,
        `/project/${configName}`,
      )
      const config = ts.parseJsonConfigFileContent(
        parsed.config ?? {},
        configHost,
        '/project',
        { ...base, ...explicit.options },
        `/project/${configName}`,
      )
      options = { ...config.options, noEmit: true }
      roots = config.fileNames.filter(
        (path) => !path.includes('/node_modules/') && !path.includes('/studio-terminal-conflict-'),
      )
      configErrors = [...(parsed.error ? [parsed.error] : []), ...config.errors]
    },
    diagnostics(path: string): ProLanguageDiagnostic[] {
      synchronize()
      if (/^(?:tsconfig|jsconfig)\.json$/.test(path))
        return [...configErrors, ...service.getCompilerOptionsDiagnostics()].map(diagnostic)
      const full = absolute(`/project/${path}`)
      if (!roots.includes(full) && !service.getProgram()?.getSourceFile(full)) return []
      return [
        ...service.getSyntacticDiagnostics(full),
        ...service.getSemanticDiagnostics(full),
      ].map(diagnostic)
    },
    completions(path: string, offset: number) {
      synchronize()
      return (
        service
          .getCompletionsAtPosition(absolute(`/project/${path}`), offset, {
            includeCompletionsForModuleExports: true,
            includeCompletionsWithInsertText: true,
          })
          ?.entries.map((entry) => ({
            name: entry.name,
            kind: entry.kind,
            sortText: entry.sortText,
            insertText: entry.insertText,
            replacementSpan: entry.replacementSpan,
          })) ?? []
      )
    },
    hover(path: string, offset: number) {
      synchronize()
      const info = service.getQuickInfoAtPosition(absolute(`/project/${path}`), offset)
      return info
        ? {
            text: ts.displayPartsToString(info.displayParts),
            documentation: ts.displayPartsToString(info.documentation),
            span: info.textSpan,
          }
        : null
    },
    definitions(path: string, offset: number) {
      synchronize()
      return (
        service.getDefinitionAtPosition(absolute(`/project/${path}`), offset)?.map((item) => ({
          path: item.fileName.replace('/project/', ''),
          span: item.textSpan,
        })) ?? []
      )
    },
    format(path: string) {
      synchronize()
      return service.getFormattingEditsForDocument(absolute(`/project/${path}`), {
        tabSize: 2,
        indentSize: 2,
        convertTabsToSpaces: true,
        newLineCharacter: '\n',
        semicolons: ts.SemicolonPreference.Remove,
      })
    },
    dispose() {
      service.dispose()
      files.clear()
    },
  }
}

export type ProLanguageService = ReturnType<typeof createProLanguageService>
