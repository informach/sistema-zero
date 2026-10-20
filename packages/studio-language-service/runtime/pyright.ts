import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import { mkdir, rmdir, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  applyPythonLanguagePatch,
  assertPythonLanguageQueryCurrent,
  PYTHON_LANGUAGE_LIMITS,
  type PythonLanguageCommand,
  PythonLanguageProtocolError,
  type PythonLanguageSnapshot,
} from '@sistemazero/core/studio/python-language'
import type {
  PythonLanguageReply,
  PythonLanguageResults,
} from '@sistemazero/core/studio/python-language-results'
import {
  CancellationTokenSource,
  createMessageConnection,
  type MessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-jsonrpc/node.js'
import { BoundedLspStream } from './framing'
import { sourcePositions } from './positions'
import { type ProvidedModuleRoot, visibleProvidedModuleRoots } from './provided-modules'
import { languageResultMapper } from './results'

const settings = Object.freeze({
  pythonVersion: '3.14',
  typeCheckingMode: 'basic',
  diagnosticMode: 'workspace',
  autoSearchPaths: false,
  useLibraryCodeForTypes: false,
  autoImportCompletions: false,
  logLevel: 'Error',
})
const methods = {
  symbols: 'textDocument/documentSymbol',
  references: 'textDocument/references',
  definitions: 'textDocument/definition',
  renameSymbol: 'textDocument/rename',
  diagnostics: 'textDocument/diagnostic',
  completions: 'textDocument/completion',
  hover: 'textDocument/hover',
  signatureHelp: 'textDocument/signatureHelp',
} as const

async function abortable<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted()
  let abort: () => void = () => {}
  const cancelled = new Promise<never>((_, reject) => {
    abort = () => reject(signal.reason)
    signal.addEventListener('abort', abort, { once: true })
  })
  try {
    return await Promise.race([promise, cancelled])
  } finally {
    signal.removeEventListener('abort', abort)
  }
}

/** One process and one empty directory per isolated container; this never executes Python. */
export class PythonLanguageSession {
  private snapshot: PythonLanguageSnapshot = { revision: 0, files: {} }
  private versions = new Map<string, number>()
  private pending = new Map<
    string,
    {
      controller: AbortController
      kind: 'sync' | 'query'
      revision: number
    }
  >()
  private tail: Promise<void> = Promise.resolve()
  private queuedSyncs = 0
  private closed = false
  private entrypoint: string | null = null
  private ready: Promise<void>
  private child: ChildProcessWithoutNullStreams
  private rpc: MessageConnection
  readonly root: string
  private settings: typeof settings & { extraPaths?: string[] } = { ...settings }
  private providedModules: readonly ProvidedModuleRoot[]

  constructor(input: {
    root: string
    serverPath: string
    nodePath: string
    providedModules?: readonly ProvidedModuleRoot[]
  }) {
    this.root = resolve(input.root)
    this.providedModules = (input.providedModules ?? []).map((item) => Object.freeze({ ...item }))
    // Never inherit gateway secrets, NODE_OPTIONS, PYTHONPATH or author configuration.
    this.child = spawn(input.nodePath, ['--max-old-space-size=192', input.serverPath, '--stdio'], {
      cwd: this.root,
      windowsHide: true,
      env: {
        PATH: '',
        ...(process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot } : {}),
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const boundedOutput = new BoundedLspStream()
    boundedOutput.on('error', () => this.dispose())
    this.rpc = createMessageConnection(
      new StreamMessageReader(this.child.stdout.pipe(boundedOutput)),
      new StreamMessageWriter(this.child.stdin),
    )
    // Drain without retaining source snippets or emitting student code into server logs.
    this.child.stderr.resume()
    this.child.on('error', () => this.dispose())
    this.child.on('exit', () => this.dispose())
    this.rpc.onError(() => this.dispose())
    this.rpc.onClose(() => this.dispose())
    this.rpc.onRequest('workspace/configuration', (params: { items: { section?: string }[] }) =>
      params.items.map((item) =>
        item.section === 'python'
          ? { analysis: this.settings }
          : item.section === 'python.analysis'
            ? this.settings
            : {},
      ),
    )
    this.rpc.onRequest('client/registerCapability', () => null)
    this.rpc.listen()
    this.ready = this.initialize().catch((error) => {
      this.dispose()
      throw error
    })
    // Failure may occur before the first HTTP command reaches this instance.
    void this.ready.catch(() => {})
  }

  private async request(method: string, params: unknown, signal: AbortSignal): Promise<unknown> {
    const cancellation = new CancellationTokenSource()
    let rejectAbort: (error: unknown) => void = () => {}
    let killTimer: ReturnType<typeof setTimeout> | undefined
    let settled = false
    let sent = false
    const aborted = new Promise<never>((_, reject) => {
      rejectAbort = reject
    })
    const abort = () => {
      cancellation.cancel()
      rejectAbort(signal.reason)
      // A server ignoring cancellation cannot retain unbounded outstanding RPC requests.
      if (!settled) killTimer = setTimeout(() => this.dispose(), 1000)
    }
    signal.addEventListener('abort', abort, { once: true })
    try {
      signal.throwIfAborted()
      const response = this.rpc.sendRequest(method, params, cancellation.token).finally(() => {
        settled = true
        clearTimeout(killTimer)
        cancellation.dispose()
      })
      sent = true
      return await Promise.race([response, aborted])
    } finally {
      signal.removeEventListener('abort', abort)
      if (!sent) cancellation.dispose()
    }
  }

  private async initialize() {
    const result = (await this.request(
      'initialize',
      {
        processId: null,
        // The first validated snapshot supplies the entrypoint. Do not analyze
        // relative to an assumed project root while its execution root is unknown.
        rootUri: null,
        workspaceFolders: [],
        capabilities: {
          general: { positionEncodings: ['utf-16'] },
          workspace: {
            configuration: true,
            workspaceFolders: true,
            workspaceEdit: { documentChanges: true },
          },
          textDocument: {
            diagnostic: { dynamicRegistration: false, relatedDocumentSupport: false },
            documentSymbol: { hierarchicalDocumentSymbolSupport: true },
            completion: {
              completionItem: { snippetSupport: false, documentationFormat: ['plaintext'] },
            },
            hover: { contentFormat: ['plaintext'] },
            signatureHelp: {
              signatureInformation: {
                documentationFormat: ['plaintext'],
                parameterInformation: { labelOffsetSupport: true },
              },
            },
          },
        },
      },
      AbortSignal.timeout(PYTHON_LANGUAGE_LIMITS.requestTimeoutMs),
    )) as { capabilities?: { positionEncoding?: string; completionProvider?: unknown } }
    if (
      !result.capabilities?.completionProvider ||
      (result.capabilities.positionEncoding && result.capabilities.positionEncoding !== 'utf-16')
    )
      throw new Error('Unsupported Python language server')
    await this.rpc.sendNotification('initialized', {})
    await this.rpc.sendNotification('workspace/didChangeConfiguration', {
      settings: { python: { analysis: this.settings } },
    })
  }

  async handle(command: PythonLanguageCommand, signal: AbortSignal): Promise<PythonLanguageReply> {
    const identity = { version: 1 as const, id: command.id }
    if (command.kind === 'dispose') {
      this.dispose()
      return { ...identity, kind: 'ack' }
    }
    if (this.closed)
      return {
        ...identity,
        kind: 'error',
        code: 'expired',
        message: 'A análise Python precisa ser reconectada.',
      }
    if (command.kind === 'cancel') {
      this.pending.get(command.requestId)?.controller.abort()
      return { ...identity, kind: 'ack' }
    }
    if (
      this.pending.size >= PYTHON_LANGUAGE_LIMITS.maxPendingRequests ||
      (command.kind === 'sync' && this.queuedSyncs >= PYTHON_LANGUAGE_LIMITS.maxQueuedSyncs) ||
      this.pending.has(command.id)
    )
      return {
        ...identity,
        kind: 'error',
        code: 'quota-exceeded',
        message: 'Aguarde a análise Python em andamento.',
      }
    const controller = new AbortController()
    const combined = AbortSignal.any([
      signal,
      controller.signal,
      AbortSignal.timeout(PYTHON_LANGUAGE_LIMITS.requestTimeoutMs),
    ])
    let syncQueued = false
    if (command.kind === 'sync') this.queuedSyncs++
    this.pending.set(command.id, { controller, kind: command.kind, revision: command.revision })
    try {
      await abortable(this.ready, combined)
      combined.throwIfAborted()
      if (this.closed) throw new Error('Session closed')
      if (command.kind === 'sync') {
        syncQueued = true
        const operation = this.tail.then(async () => {
          combined.throwIfAborted()
          if (this.closed) throw new Error('Session closed')
          const next = applyPythonLanguagePatch(this.snapshot, this.versions, command)
          if (!next.snapshot.files[command.entrypoint])
            throw new PythonLanguageProtocolError(
              'stale-document',
              'O arquivo inicial precisa existir na versão analisada.',
            )
          const importRoot = dirname(resolve(this.root, command.entrypoint))
          const previousRoot =
            this.entrypoint === null ? null : dirname(resolve(this.root, this.entrypoint))
          const rootChanged = previousRoot !== importRoot
          const extraPaths = visibleProvidedModuleRoots(
            this.providedModules,
            next.snapshot,
            command.entrypoint,
          )
          const pathsChanged =
            JSON.stringify(this.settings.extraPaths ?? []) !== JSON.stringify(extraPaths)
          // Queries on the previous revision must not survive a filesystem change.
          for (const pending of this.pending.values())
            if (pending.kind === 'query' && pending.revision < command.revision)
              pending.controller.abort()
          try {
            if (rootChanged && previousRoot !== null)
              for (const path of Object.keys(this.snapshot.files))
                await this.rpc.sendNotification('textDocument/didClose', {
                  textDocument: { uri: pathToFileURL(resolve(this.root, path)).href },
                })
            // Remove before writing, including file→directory and directory→file changes.
            for (const change of command.changes) {
              if (change.source === null && this.snapshot.files[change.path]) {
                const path = resolve(this.root, change.path)
                await unlink(path)
                for (let parent = dirname(path); parent !== this.root; parent = dirname(parent)) {
                  try {
                    await rmdir(parent)
                  } catch (error) {
                    if (
                      ['ENOTEMPTY', 'EEXIST'].includes((error as NodeJS.ErrnoException).code ?? '')
                    )
                      break
                    throw error
                  }
                }
              }
            }
            for (const change of command.changes) {
              if (change.source !== null) {
                const path = resolve(this.root, change.path)
                await mkdir(dirname(path), { recursive: true })
                await writeFile(path, change.source, { mode: 0o600 })
              }
            }
            if (pathsChanged) {
              this.settings = { ...settings, ...(extraPaths.length ? { extraPaths } : {}) }
              await this.rpc.sendNotification('workspace/didChangeConfiguration', {
                settings: { python: { analysis: this.settings } },
              })
            }
            if (rootChanged) {
              await mkdir(importRoot, { recursive: true })
              await this.rpc.sendNotification('workspace/didChangeWorkspaceFolders', {
                event: {
                  added: [{ uri: pathToFileURL(importRoot).href, name: 'project' }],
                  removed:
                    previousRoot === null
                      ? []
                      : [{ uri: pathToFileURL(previousRoot).href, name: 'project' }],
                },
              })
              for (const [path, file] of Object.entries(next.snapshot.files))
                await this.rpc.sendNotification('textDocument/didOpen', {
                  textDocument: {
                    uri: pathToFileURL(resolve(this.root, path)).href,
                    languageId: 'python',
                    version: file.version,
                    text: file.source,
                  },
                })
            } else
              for (const change of command.changes) {
                const uri = pathToFileURL(resolve(this.root, change.path)).href
                const existed = !!this.snapshot.files[change.path]
                if (change.source === null) {
                  if (existed)
                    await this.rpc.sendNotification('textDocument/didClose', {
                      textDocument: { uri },
                    })
                } else if (existed)
                  await this.rpc.sendNotification('textDocument/didChange', {
                    textDocument: { uri, version: change.version },
                    contentChanges: [{ text: change.source }],
                  })
                else
                  await this.rpc.sendNotification('textDocument/didOpen', {
                    textDocument: {
                      uri,
                      languageId: 'python',
                      version: change.version,
                      text: change.source,
                    },
                  })
              }
            await this.rpc.sendNotification('workspace/didChangeWatchedFiles', {
              changes: command.changes.map((change) => ({
                uri: pathToFileURL(resolve(this.root, change.path)).href,
                type: change.source === null ? 3 : this.snapshot.files[change.path] ? 2 : 1,
              })),
            })
            combined.throwIfAborted()
            this.snapshot = next.snapshot
            this.entrypoint = command.entrypoint
            this.versions = next.versions
          } catch (error) {
            // A partial filesystem update cannot be reconciled by pretending the old ACK succeeded.
            this.dispose()
            throw error
          }
        })
        this.tail = operation
          .finally(() => {
            this.queuedSyncs--
          })
          .catch(() => {})
        await abortable(operation, combined)
        return { ...identity, kind: 'synced', revision: command.revision }
      }
      await abortable(this.tail, combined)
      combined.throwIfAborted()
      const snapshot = this.snapshot
      const file = assertPythonLanguageQueryCurrent(snapshot, command)
      const params = {
        textDocument: { uri: pathToFileURL(resolve(this.root, command.path)).href },
        ...(command.offset === undefined
          ? {}
          : { position: sourcePositions(file.source).position(command.offset) }),
        ...(command.method === 'renameSymbol' ? { newName: command.name } : {}),
        ...(command.method === 'references' ? { context: { includeDeclaration: true } } : {}),
      }
      let result: PythonLanguageResults[keyof PythonLanguageResults]
      if (command.method === 'projectDiagnostics') {
        // One bounded HTTP roundtrip for the workspace, not up to 50 roundtrips per keystroke.
        const gathered: PythonLanguageResults['diagnostics'] = []
        for (const path of [
          command.path,
          ...Object.keys(snapshot.files).filter((path) => path !== command.path),
        ]) {
          combined.throwIfAborted()
          assertPythonLanguageQueryCurrent(this.snapshot, command)
          const raw = await this.request(
            methods.diagnostics,
            {
              textDocument: { uri: pathToFileURL(resolve(this.root, path)).href },
            },
            combined,
          )
          gathered.push(
            ...languageResultMapper(
              this.root,
              snapshot,
              path,
            )('diagnostics', raw).slice(0, 100 - gathered.length),
          )
          if (gathered.length >= 100) break
        }
        result = gathered
      } else {
        const raw = await this.request(methods[command.method], params, combined)
        result = languageResultMapper(this.root, snapshot, command.path)(command.method, raw)
      }
      combined.throwIfAborted()
      assertPythonLanguageQueryCurrent(this.snapshot, command)
      const reply = {
        ...identity,
        kind: 'result' as const,
        method: command.method,
        revision: snapshot.revision,
        path: command.path,
        documentVersion: file.version,
        result,
      } as PythonLanguageReply
      if (
        new TextEncoder().encode(JSON.stringify(reply)).byteLength >
        PYTHON_LANGUAGE_LIMITS.maxResponseBytes
      )
        throw new PythonLanguageProtocolError(
          'quota-exceeded',
          'O resultado da análise Python ultrapassou o limite.',
        )
      return reply
    } catch (error) {
      if (error instanceof PythonLanguageProtocolError)
        return { ...identity, kind: 'error', code: error.code, message: error.message }
      if (combined.aborted)
        return {
          ...identity,
          kind: 'error',
          code: 'cancelled',
          message: 'A análise Python foi cancelada.',
        }
      return {
        ...identity,
        kind: 'error',
        code: 'unavailable',
        message: 'A análise Python não está disponível. Tente novamente.',
      }
    } finally {
      this.pending.delete(command.id)
      if (command.kind === 'sync' && !syncQueued) this.queuedSyncs--
    }
  }

  dispose() {
    if (this.closed) return
    this.closed = true
    for (const pending of this.pending.values()) pending.controller.abort()
    this.pending.clear()
    this.rpc.dispose()
    this.child.kill('SIGKILL')
  }
}
