import {
  PYTHON_MISSION_LIMITS,
  PythonMissionExecutionArtifactsSchema,
  verifyPythonMissionRequest,
  verifyPythonMissionValidationReport,
} from '@sistemazero/core/studio/python-mission-execution'
import {
  inspectPreparedPythonProject,
  type PreparedPythonProject,
  type PythonProjectPreparationOptions,
  preparedPythonBrowserOptions,
  throwPythonInspectionFailure,
  withIsolatedPythonProject,
} from './python-inspection'
import { rethrowPythonMissionFailure } from './python-mission-diagnostics'

/** One immutable materialization, one fresh protected page/worker per objective, one outer owner. */
export async function runIsolatedPythonMissions(
  options: PythonProjectPreparationOptions & {
    structure: boolean
    mission: unknown
    beforeExecution?(): Promise<void>
  },
) {
  const mission = await verifyPythonMissionRequest(options.mission, options.snapshot)
  const execute = async (project: PreparedPythonProject) => {
    let operation: 'mission-inspection' | 'mission-options' | 'mission-execute' | 'mission-report' =
      'mission-inspection'
    try {
      const inspection = await inspectPreparedPythonProject(project, options.structure)
      project.check()
      if (inspection.status !== 'passed')
        return verifyPythonMissionValidationReport(
          {
            version: 1,
            projectId: project.snapshot.projectId,
            status: 'failed',
            inspection,
          },
          project.snapshot,
          mission,
          options.structure,
        )
      if (!project.deployment.distribution.files.some((file) => file.path === 'playtest.mjs'))
        throw new Error('O ambiente não oferece execução protegida para as missões Python.')
      if (options.beforeExecution) await project.step(options.beforeExecution())
      project.check()
      operation = 'mission-options'
      await project.step(
        project.sandbox.writeFile(
          `${project.cwd}/python-mission-options.json`,
          JSON.stringify({ ...preparedPythonBrowserOptions(project), mission }),
          { encoding: 'utf-8' },
        ),
      )
      project.check()
      operation = 'mission-execute'
      const diagnosticOwner = {
        signal: project.signal,
        check: project.check,
        read: async () =>
          (
            await project.step(
              project.sandbox.readFile(`${project.cwd}/python-mission-phase.json`, {
                encoding: 'utf-8',
              }),
            )
          ).content,
      }
      const executed = await project
        .step(
          project.sandbox.exec('node /opt/sz-runtime/python-mission.mjs', {
            cwd: project.cwd,
            timeout: PYTHON_MISSION_LIMITS.runnerMs + 2000,
          }),
        )
        .catch((error) => rethrowPythonMissionFailure(error, diagnosticOwner))
      project.check()
      if (!executed.success)
        return rethrowPythonMissionFailure(
          new Error('A execução protegida das missões Python não concluiu.'),
          { ...diagnosticOwner, stderr: executed.stderr },
        )
      operation = 'mission-report'
      const file = await project.step(
        project.sandbox.readFile(`${project.cwd}/python-mission-result.json`, {
          encoding: 'utf-8',
        }),
      )
      project.check()
      if (new TextEncoder().encode(file.content).byteLength > PYTHON_MISSION_LIMITS.responseBytes)
        throw new Error('O relatório das missões Python excede o limite.')
      const result = PythonMissionExecutionArtifactsSchema.parse(JSON.parse(file.content))
      const report = await verifyPythonMissionValidationReport(
        {
          version: 1,
          projectId: project.snapshot.projectId,
          status: result.executions.every((item) => item?.report?.status === 'passed')
            ? 'passed'
            : 'failed',
          inspection,
          mission: result.mission,
          executions: result.executions,
        },
        project.snapshot,
        mission,
        options.structure,
      )
      project.check()
      return report
    } catch (error) {
      throwPythonInspectionFailure(error, operation)
    }
  }
  return withIsolatedPythonProject(options, execute, 'mission')
}
