import { verifyStudioPythonExecutionMetadata } from '@sistemazero/core/studio/python-execution-content'
import {
  STUDIO_PYTHON_INSPECTION_LIMITS,
  type StudioPythonInspectionReport,
  verifyStudioPythonInspectionReport,
} from '@sistemazero/core/studio/python-inspection'
import type { PythonAnalysisSession } from '../../python/language/session'
import { PYTHON_ANALYSIS_LIMITS, samePythonAnalysisIdentity } from '../../python/language/types'
import type { PythonExecutionSnapshot } from './protocol'
import { PYODIDE_VERSION, PYTHON_VERSION } from './versions'
import { pythonWebBytesSha256 } from './webFiles'
import { readPythonWireSnapshot } from './wireSnapshot'

/** Compiles only. Parsing runs in a separate worker, without learner imports or program execution. */
export async function inspectPythonSnapshot(options: {
  snapshot: PythonExecutionSnapshot
  signal: AbortSignal
  createSession(signal: AbortSignal): Promise<PythonAnalysisSession>
  structure: boolean
}): Promise<StudioPythonInspectionReport> {
  if (typeof options.structure !== 'boolean')
    throw new Error('A inspeção exige uma escolha explícita de estrutura.')
  const structureRequested = options.structure
  const signal = AbortSignal.any([
    options.signal,
    AbortSignal.timeout(STUDIO_PYTHON_INSPECTION_LIMITS.deadlineMs),
  ])
  signal.throwIfAborted()
  const snapshot = readPythonWireSnapshot(structuredClone(options.snapshot))
  if (snapshot.configuration.python.dependencyLock.pythonVersion !== PYTHON_VERSION)
    throw new Error('A versão Python do projeto não corresponde ao compilador disponível.')
  const metadata = await verifyStudioPythonExecutionMetadata({
    ...snapshot,
    files: snapshot.files.map(({ bytes, ...file }) => ({ ...file, byteLength: bytes.byteLength })),
  })
  signal.throwIfAborted()
  for (const file of snapshot.files) {
    if ((await pythonWebBytesSha256(file.bytes)) !== file.sha256)
      throw new Error(`O arquivo ${file.path} mudou antes da inspeção.`)
    signal.throwIfAborted()
  }
  const sources = snapshot.files.filter(
    (file) => file.kind === 'source' && /\.pyi?$/.test(file.path),
  )
  if (!sources.length || sources.length > STUDIO_PYTHON_INSPECTION_LIMITS.files)
    throw new Error('A quantidade de arquivos excede o perfil de inspeção Python.')
  if (sources.some((file) => file.bytes.byteLength > PYTHON_ANALYSIS_LIMITS.sourceBytes))
    throw new Error('Um arquivo excede o limite de compilação Python deste perfil.')
  const session = await options.createSession(signal)
  try {
    signal.throwIfAborted()
    const interpreter = { ...session.interpreter }
    if (
      !interpreter ||
      interpreter.pythonVersion !== PYTHON_VERSION ||
      interpreter.pyodideVersion !== PYODIDE_VERSION ||
      !session.compileBytes
    )
      throw new Error(
        'O analisador não confirmou a versão efetiva e a compilação dos bytes Python.',
      )
    const files: StudioPythonInspectionReport['files'] = []
    const instanceId = crypto.randomUUID()
    for (const [generation, file] of sources.entries()) {
      const identity = {
        projectId: snapshot.projectId,
        path: file.path,
        revision: file.sha256,
        instanceId,
        generation,
      }
      const parsed = await session.compileBytes(identity, file.bytes, signal, {
        structure: structureRequested,
      })
      signal.throwIfAborted()
      if (!samePythonAnalysisIdentity(identity, parsed.identity))
        throw new Error('A análise não corresponde à fonte Python desta inspeção.')
      if (structureRequested && !parsed.diagnostics.length && !parsed.structure)
        throw new Error('A análise não oferece a estrutura completa desta fonte Python.')
      files.push({
        path: file.path,
        sha256: file.sha256,
        status: parsed.diagnostics.length ? 'failed' : 'passed',
        diagnostics: parsed.diagnostics.map(({ message }) => ({ message })),
        ...(structureRequested && parsed.structure ? { structure: parsed.structure } : {}),
      })
    }
    const report = await verifyStudioPythonInspectionReport(
      {
        version: 1,
        revision: snapshot.revision,
        runtimeManifestSha256: snapshot.configuration.runtime.manifestSha256,
        pythonVersion: interpreter.pythonVersion,
        status: files.every((file) => file.status === 'passed') ? 'passed' : 'failed',
        files,
      },
      metadata,
    )
    signal.throwIfAborted()
    return report
  } finally {
    session.dispose()
  }
}
