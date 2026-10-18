import {
  STUDIO_PYTHON_PLAYTEST_LIMITS,
  StudioPythonPlaytestRecipeSchema,
  verifyStudioPythonPlaytestCapture,
  verifyStudioPythonPlaytestReport,
} from '@sistemazero/core/studio/python-playtest'
import {
  inspectPreparedPythonProject,
  type PreparedPythonProject,
  type PythonProjectPreparationOptions,
  preparedPythonBrowserOptions,
  withIsolatedPythonProject,
} from './python-inspection'

/** Execution phase runs after compilation, in the same owner, with a new protected browser/worker. */
export async function playtestPreparedPythonProject(
  project: PreparedPythonProject,
  recipeInput: unknown,
) {
  const recipe = StudioPythonPlaytestRecipeSchema.parse(recipeInput)
  const { sandbox, snapshot, cwd, deployment, step, check } = project
  if (!deployment.distribution.files.some((file) => file.path === 'playtest.mjs'))
    throw new Error('Esta distribuição ainda não oferece execução protegida Python.')
  check()
  await step(
    sandbox.writeFile(
      `${cwd}/python-playtest-options.json`,
      JSON.stringify({
        ...preparedPythonBrowserOptions(project),
        recipe,
      }),
      { encoding: 'utf-8' },
    ),
  )
  check()
  const executed = await step(
    sandbox.exec('node /opt/sz-runtime/python-playtest.mjs', { cwd, timeout: 115_000 }),
  )
  check()
  if (!executed.success) throw new Error('A execução Python isolada não pôde ser concluída.')
  const result = await step(
    sandbox.readFile(`${cwd}/python-playtest-result.json`, { encoding: 'utf-8' }),
  )
  check()
  if (
    new TextEncoder().encode(result.content).byteLength > STUDIO_PYTHON_PLAYTEST_LIMITS.reportBytes
  )
    throw new Error('O relatório de execução Python excede o limite.')
  const report = await verifyStudioPythonPlaytestReport(
    JSON.parse(result.content),
    snapshot,
    recipe,
  )
  check()
  let captureBytes: Uint8Array | undefined
  if (report.capture) {
    const captured = await step(
      sandbox.readFile(`${cwd}/${report.capture.path}`, { encoding: 'base64' }),
    )
    check()
    if (
      captured.content.length > 4 * Math.ceil(STUDIO_PYTHON_PLAYTEST_LIMITS.captureBytes / 3) ||
      captured.content.length % 4 !== 0 ||
      !/^[A-Za-z0-9+/]+={0,2}$/.test(captured.content)
    )
      throw new Error('A captura Python excede o limite ou possui codificação inválida.')
    captureBytes = Uint8Array.from(atob(captured.content), (char) => char.charCodeAt(0))
    await verifyStudioPythonPlaytestCapture(report.capture, captureBytes)
    check()
  }
  return { report, captureBytes }
}

/** One immutable validation operation; never starts execution when compilation failed. */
export async function runIsolatedPythonValidation(
  options: PythonProjectPreparationOptions & {
    structure?: boolean
    recipe: unknown
    beforeExecution?(): Promise<void>
  },
) {
  const recipe = StudioPythonPlaytestRecipeSchema.parse(options.recipe)
  const structure = options.structure === true
  const beforeExecution = options.beforeExecution
  return withIsolatedPythonProject(options, async (project) => {
    const inspection = await inspectPreparedPythonProject(project, structure)
    project.check()
    if (inspection.status === 'failed') return { inspection, execution: undefined }
    if (beforeExecution) await project.step(beforeExecution())
    project.check()
    const execution = await playtestPreparedPythonProject(project, recipe)
    project.check()
    return { inspection, execution }
  })
}
