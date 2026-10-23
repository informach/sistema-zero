import type { SectionPythonProjectCheck } from '@sistemazero/core/learning'
import { inspectPythonSectionProject } from '../../../admin/src/components/studio/inspect-python-section-project'
import { preparePythonExecutionSnapshot } from '../../src/runtime/python/snapshot'
import { refinePythonProjectDocument } from '../../src/state/pythonProjectValidation'

const settings = await fetch('/configuration.json').then((response) => response.json())
type Scenario = 'valid' | 'wrong-file' | 'invalid' | 'profile' | 'captured' | 'cancel'
async function run(kind: 'classic' | 'pro', name: Scenario) {
  const stored = settings.authoring.projects.find((item: { kind: string }) => item.kind === kind)
  if (!stored) throw new Error('Missing authored project')
  const reference = await refinePythonProjectDocument(stored.project)
  const project = structuredClone(reference)
  project.id = crypto.randomUUID() // Simulation remaps only identity to the authored workspace.
  const source =
    name === 'invalid'
      ? 'def broken(:\n'
      : 'import turtle\nK = 3\ndef ação():\n    for passo in range(3):\n        if passo < 2:\n            turtle.forward(K)\n'
  if (project.kind === 'classic') {
    project.mode = 'bridge'
    project.files['main.py'] = source
    project.files['other.py'] = 'pass\n'
  } else {
    project.tree['main.py'] = { kind: 'file', content: source }
    project.tree['other.py'] = { kind: 'file', content: 'pass\n' }
  }
  if (name === 'profile') project.runtime.profileId = 'different-profile'
  const rules: SectionPythonProjectCheck['rule'][] = [
    { type: 'usesLoop' },
    { type: 'usesConditional' },
    { type: 'declaresVariable', name: 'K' },
    { type: 'definesFunction', name: 'ação' },
    {
      type: 'callsFunction',
      name: 'turtle.forward',
      file: name === 'wrong-file' ? 'other.py' : 'main.py',
    },
  ]
  const checks = rules.map(
    (rule, index): SectionPythonProjectCheck => ({
      id: `objective-${index}`,
      label: `Objetivo ${index}`,
      programmingLanguage: 'python',
      profileId: reference.runtime.profileId,
      rule,
    }),
  )
  const scope = {
    userId: settings.authoring.userId,
    context: {
      kind: 'authoring' as const,
      lessonId: settings.authoring.lessonId,
      draftRevision: settings.authoring.draftRevision,
      blockId: stored.blockId,
      purpose: kind === 'classic' ? ('authoring' as const) : ('rehearsal' as const),
    },
  }
  const capturedProject = structuredClone(project),
    capturedChecks = structuredClone(checks),
    capturedScope = structuredClone(scope)
  const snapshot = await preparePythonExecutionSnapshot(project)
  const controller = new AbortController()
  const frames: string[] = []
  const observer = new MutationObserver(() => {
    for (const frame of document.querySelectorAll('iframe')) {
      if (frame.src && !frames.includes(frame.src)) frames.push(frame.src)
      if (name === 'cancel' && frame.src && frame.src !== 'about:blank')
        controller.abort(new DOMException('Verificação retirada.', 'AbortError'))
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src'],
  })
  let results: Awaited<ReturnType<typeof inspectPythonSectionProject>> | undefined
  let caught: { name: string; message: string } | undefined
  try {
    const pending = inspectPythonSectionProject({
      project,
      referenceProject: reference,
      checks,
      scope,
      signal: controller.signal,
      assertCurrent() {
        controller.signal.throwIfAborted()
      },
    })
    if (name === 'captured') {
      if (project.kind === 'classic') project.files['main.py'] = 'def broken(:\n'
      else project.tree['main.py'] = { kind: 'file', content: 'def broken(:\n' }
      checks[0]!.rule = { type: 'definesFunction', name: 'missing' }
      scope.context.draftRevision = crypto.randomUUID()
    }
    results = await pending
  } catch (error) {
    caught =
      error instanceof Error
        ? { name: error.name, message: error.message }
        : { name: 'Error', message: String(error) }
  } finally {
    controller.abort()
    observer.disconnect()
  }
  return {
    kind,
    name,
    source,
    project: capturedProject,
    checks: capturedChecks,
    scope: capturedScope,
    referenceProject: reference,
    snapshot: {
      revision: snapshot.revision,
      configuration: snapshot.configuration,
      files: snapshot.files.map(({ bytes, ...file }) => ({
        ...file,
        byteLength: bytes.byteLength,
      })),
      directories: snapshot.directories,
    },
    results,
    caught,
    frames,
    framesRemaining: document.querySelectorAll('iframe').length,
  }
}
declare global {
  interface Window {
    studioPythonSectionProof: { run: typeof run }
  }
}
window.studioPythonSectionProof = { run }
