import { throwPythonInspectionFailure } from './python-inspection'

const phases = [
  'options',
  'resources',
  'launch',
  'navigation',
  'startup-first',
  'startup-next',
  'observe',
] as const

interface DiagnosticOwner {
  stderr?: string
  signal: AbortSignal
  check(): void
  read(): Promise<string>
}

/** The isolated process writes only this bounded stage journal, never learner data. */
export async function rethrowPythonMissionFailure(
  error: unknown,
  owner: DiagnosticOwner,
): Promise<never> {
  const stderr =
    owner.stderr ??
    (error && typeof error === 'object' && 'stderr' in error && typeof error.stderr === 'string'
      ? error.stderr
      : '')
  let phase = phases.find((value) => stderr.includes(`STUDIO_PYTHON_MISSION_PHASE:${value}`))
  if (!phase && !owner.signal.aborted) {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      owner.check()
      const content = await Promise.race([
        owner.read(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Diagnostic unavailable')), 2000)
        }),
      ])
      owner.check()
      if (content.length < 256) {
        const value: unknown = JSON.parse(content)
        if (
          value &&
          typeof value === 'object' &&
          'version' in value &&
          value.version === 1 &&
          'phase' in value
        )
          phase = phases.find((candidate) => candidate === value.phase)
      }
    } catch {
      // Optional diagnostics cannot replace the command failure, retry it or approve a result.
    } finally {
      clearTimeout(timer)
    }
  }
  if (phase) throwPythonInspectionFailure(error, `mission-${phase}`)
  throw error
}
