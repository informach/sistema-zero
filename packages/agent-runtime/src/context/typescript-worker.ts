/// <reference lib="webworker" />

import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import { dirname } from 'node:path'
import ts from 'typescript'
import { z } from 'zod'

const request = z.object({
  id: z.string(),
  workspace: z.string(),
  path: z.string(),
  operation: z.enum(['diagnostics', 'symbols', 'definition']),
  position: z.number().int().nonnegative().default(0),
})
self.onmessage = (event) => {
  const input = request.parse(event.data)
  let service: ts.LanguageService | undefined
  try {
    const configFile = ts.findConfigFile(input.workspace, ts.sys.fileExists)
    let files = [input.path]
    let options: ts.CompilerOptions = {
      allowJs: true,
      checkJs: true,
      noEmit: true,
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
    }
    if (configFile) {
      const loaded = ts.readConfigFile(configFile, ts.sys.readFile)
      if (loaded.error)
        throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, '\n'))
      const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, dirname(configFile))
      if (parsed.errors.length)
        throw new Error(
          parsed.errors
            .map((error) => ts.flattenDiagnosticMessageText(error.messageText, '\n'))
            .join('\n'),
        )
      files = parsed.fileNames
      options = { ...parsed.options, noEmit: true }
    }
    if (files.length > 20000) throw new Error('TypeScript project exceeds 20000 root files')
    if (!files.includes(input.path)) files.push(input.path)
    const snapshots = new Map<string, ts.IScriptSnapshot>()
    const read = (path: string) => {
      if (!/\.(?:[cm]?[jt]sx?|json)$/i.test(path) || !ts.sys.fileExists(path)) return undefined
      if (statSync(path).size > 2_000_000)
        throw new Error(`TypeScript source exceeds 2 MB: ${path}`)
      return readFileSync(path, 'utf8')
    }
    const host: ts.LanguageServiceHost = {
      getScriptFileNames: () => files,
      getScriptVersion: () => '1',
      getScriptSnapshot: (path) => {
        let snapshot = snapshots.get(path)
        if (!snapshot) {
          const text = read(path)
          if (text === undefined) return undefined
          snapshot = ts.ScriptSnapshot.fromString(text)
          snapshots.set(path, snapshot)
        }
        return snapshot
      },
      getCurrentDirectory: () => input.workspace,
      getCompilationSettings: () => options,
      getDefaultLibFileName: (settings) => ts.getDefaultLibFilePath(settings),
      fileExists: ts.sys.fileExists,
      readFile: read,
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
    }
    service = ts.createLanguageService(host)
    const source = read(input.path)
    if (source === undefined) throw new Error('Source is unavailable')
    const sha256 = createHash('sha256').update(source).digest('hex')
    let value: unknown
    if (input.operation === 'diagnostics')
      value = [
        ...service.getSyntacticDiagnostics(input.path),
        ...service.getSemanticDiagnostics(input.path),
      ]
        .slice(0, 100)
        .map((item) => ({
          code: item.code,
          category: ts.DiagnosticCategory[item.category],
          message: ts.flattenDiagnosticMessageText(item.messageText, '\n'),
          start: item.start,
          length: item.length,
          line:
            item.file && item.start !== undefined
              ? item.file.getLineAndCharacterOfPosition(item.start).line + 1
              : undefined,
        }))
    else if (input.operation === 'symbols') value = service.getNavigationTree(input.path)
    else value = service.getDefinitionAtPosition(input.path, input.position) ?? []
    self.postMessage({ id: input.id, ok: true, value, sha256 })
  } catch (error) {
    self.postMessage({
      id: input.id,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    })
  } finally {
    service?.dispose()
  }
}
