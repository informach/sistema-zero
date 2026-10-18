import {
  createStudioRuntimeCatalog,
  StudioRuntimeReleaseSchema,
} from '@sistemazero/core/studio/runtime-catalog'
import * as Blockly from 'blockly/core'
import { isPythonProject } from '../../src/core/editableProject'
import {
  type PythonBlocklyBlock,
  pythonVisualToWorkspace,
  pythonWorkspaceToVisual,
} from '../../src/python/blocks/blockly'
import { PYTHON_PROGRAMMING_CODECS } from '../../src/python/blocks/catalog'
import { commitPythonWorkspaceGesture } from '../../src/python/blocks/commitWorkspace'
import { pythonASTToVisual } from '../../src/python/blocks/projection'
import { bindPythonVisualOrigins } from '../../src/python/blocks/provenance'
import { readPythonWorkspaceState } from '../../src/python/blocks/readWorkspaceState'
import { readPythonWorkspaceDraft } from '../../src/python/blocks/workspaceDraft'
import {
  recoverPythonWorkspaceOrigins,
  savePythonWorkspace,
} from '../../src/python/blocks/workspaceState'
import { createPythonAnalysisController } from '../../src/python/language/controller'
import { preparePythonAnalysisSession } from '../../src/python/language/session'
import type { PythonAnalysisIdentity, PythonParsedDocument } from '../../src/python/language/types'
import type { StudioRuntimeEnvironment } from '../../src/runtime/environment'
import { createStudioRuntimeRegistry } from '../../src/runtime/registry'
import { createProjectStore } from '../../src/state/projectStore'
import { refinePythonProjectDocument } from '../../src/state/pythonProjectValidation'

export async function createAnalysisControllerProbe() {
  const config = await (await fetch('/configuration')).json()
  const distribution = await (await fetch('/distribution')).json()
  const release = StudioRuntimeReleaseSchema.parse(distribution.release)
  const catalog = await createStudioRuntimeCatalog({
    releases: [release],
    profiles: [
      {
        id: release.profileId,
        languages: ['python'],
        kinds: ['classic', 'pro'],
        modes: ['blocks', 'bridge', 'code'],
        levels: [],
        releases: [{ id: release.releaseId, manifestSha256: release.manifestSha256 }],
      },
    ],
  })
  let project = await refinePythonProjectDocument(
    await (await fetch('/project/classic-portable')).json(),
  )
  const url = new URL('analysis.html', config.providerFrameURL)
  const environment: StudioRuntimeEnvironment = {
    catalog,
    registry: createStudioRuntimeRegistry([]),
    access: () => ({
      releaseStatus: 'active',
      grantedCapabilities: ['edit'],
      grantedExtensionIds: [],
      hostOperations: [{ capability: 'edit', state: 'available' }],
      curation: null,
    }),
    resolvePythonAnalysis: async () => ({ url: url.href, allowedOrigins: [url.origin] }),
  }
  let epoch = 1,
    generation = 0,
    mounts = 0,
    releases = 0
  const requests: string[] = []
  const results = new Map<string, PythonParsedDocument | string>()
  const controller = createPythonAnalysisController({
    project: () => project,
    environment: () => environment,
    writerEpoch: () => epoch,
    mountFrame() {
      const frame = document.createElement('iframe')
      frame.hidden = true
      frame.dataset.pythonAnalysis = 'true'
      document.body.append(frame)
      mounts++
      return {
        frame,
        release: () => {
          releases++
          frame.remove()
        },
      }
    },
    async prepareSession(options) {
      const parser = await preparePythonAnalysisSession(options)
      return {
        get closed() {
          return parser.closed
        },
        parse: (identity, source, signal) => {
          requests.push(source)
          return parser.parse(identity, source, signal)
        },
        render: (node, signal) => parser.render(node, signal),
        dispose: () => parser.dispose(),
      }
    },
  })
  const identity = (): PythonAnalysisIdentity => ({
    projectId: project.id,
    instanceId: 'analysis-controller-probe',
    path: 'main.py',
    revision: 'a'.repeat(64),
    generation: ++generation,
  })
  return {
    start(label: string, source: string) {
      void controller
        .run({ current: () => true, execute: (parser) => parser.parse(identity(), source) })
        .then(
          (result) => results.set(label, result),
          (error: unknown) =>
            results.set(label, error instanceof Error ? error.name : String(error)),
        )
    },
    async roundtrip(source: string) {
      return controller.run({
        current: () => true,
        execute: async (parser) => {
          const first = await parser.parse(identity(), source)
          if (!first.tree) throw new Error('Invalid qualification program')
          const rendered = await parser.render(first.tree)
          return parser.parse(identity(), rendered)
        },
      })
    },
    async visualGesture(withHistory = false, recoverDraft = false) {
      if (project.kind !== 'classic') throw new Error('Classic qualification only')
      const source = '# título 🐢\r\nx = 3  # placar\r\nprint(x)\r\n'
      project = { ...project, files: { ...project.files, 'main.py': source } }
      const store = createProjectStore()
      store.getState().hydrateProject(project)
      const unsubscribe = store.subscribe((state) => {
        if (state.project && isPythonProject(state.project)) project = state.project
      })
      let workspace = new Blockly.Workspace()
      try {
        let document = await controller.run({
          current: () => true,
          execute: (parser) => parser.parse(identity(), source),
        })
        if (!document.tree) throw new Error('Invalid fixture')
        const projection = pythonASTToVisual(document.tree)
        const rootIds = pythonVisualToWorkspace(projection, workspace)
        workspace.getBlockById(rootIds[0]!)!.moveBy(48, 72)
        Blockly.serialization.workspaceComments.append(
          { id: 'my-note', text: 'Ideia do meu jogo 🐢', x: 12, y: 24, width: 200, height: 100 },
          workspace,
        )
        let origins = bindPythonVisualOrigins(
          pythonWorkspaceToVisual(workspace, rootIds),
          document.tree,
        )
        await new Promise((resolve) => setTimeout(resolve, 20))
        workspace.clearUndo()
        const number = workspace.getAllBlocks(false).find((block) => block.type === 'sz_py_integer')
        const field = number?.inputList
          .flatMap((input) => input.fieldRow)
          .find((field) => field.name)
        if (!field) throw new Error('No integer field in parsed program')
        field.setValue('4')
        let captured = pythonWorkspaceToVisual(
          workspace,
          rootIds,
          projection.typeIgnores,
          undefined,
          origins,
        )
        const commit = () =>
          commitPythonWorkspaceGesture({
            store,
            analysis: controller,
            document,
            rootIds,
            workspace: savePythonWorkspace(workspace, origins),
            projection: captured,
            codecs: PYTHON_PROGRAMMING_CODECS,
            current: () => true,
          })
        const pending = commit()
        const staged = store.getState().project
        if (!staged || !isPythonProject(staged)) throw new Error('No staged document')
        const draft = readPythonWorkspaceDraft(staged)
        const synchronous = { pending: draft?.pending, source: staged.files?.['main.py'] }
        const result = await pending
        document = result
        origins = bindPythonVisualOrigins(captured, result.tree!)
        const history: string[] = []
        const publish = async () => {
          await new Promise((resolve) => setTimeout(resolve, 20))
          captured = pythonWorkspaceToVisual(workspace, rootIds, [], undefined, origins)
          document = await commit()
          origins = bindPythonVisualOrigins(captured, document.tree!)
          history.push(document.source)
        }
        if (withHistory) {
          field.setValue('4000')
          await publish()
          field.setValue('5')
          await publish()
          workspace.undo(false)
          await publish()
          workspace.undo(true)
          await publish()
          const printed = workspace
            .getAllBlocks(false)
            .find((block) => block.type === 'sz_py_print') as PythonBlocklyBlock
          Blockly.Events.setGroup(true)
          try {
            printed.setPythonOption('args:count', 2)
            const second = workspace.newBlock('sz_py_integer')
            second.setFieldValue('900', 'NUMBER')
            printed.getInput('args:1')!.connection!.connect(second.outputConnection!)
          } finally {
            Blockly.Events.setGroup(false)
          }
          await publish()
          workspace.undo(false)
          await publish()
          workspace.undo(true)
          await publish()
        }
        let recovery:
          | { error: string; source: string; pending: boolean; restoredSource?: string }
          | undefined
        if (recoverDraft) {
          const printed = workspace
            .getAllBlocks(false)
            .find((block) => block.type === 'sz_py_print') as PythonBlocklyBlock
          printed.setPythonOption('args:count', 3)
          let error = ''
          try {
            await commitPythonWorkspaceGesture({
              store,
              analysis: controller,
              document,
              rootIds,
              workspace: savePythonWorkspace(workspace, origins),
              projection: () => pythonWorkspaceToVisual(workspace, rootIds, [], undefined, origins),
              codecs: PYTHON_PROGRAMMING_CODECS,
              current: () => true,
            })
          } catch (issue) {
            error = issue instanceof Error ? issue.message : String(issue)
          }
          const stagedProject = store.getState().project!
          if (!isPythonProject(stagedProject)) throw new Error('Missing staged project')
          const saved = readPythonWorkspaceDraft(stagedProject)!
          recovery = { error, source: document.source, pending: saved.pending }
          workspace.dispose()
          controller.reset()
          workspace = new Blockly.Workspace()
          Blockly.serialization.workspaces.load(
            readPythonWorkspaceState(saved.workspace),
            workspace,
          )
          document = await controller.run({
            current: () => true,
            execute: (parser) => parser.parse(identity(), saved.baseSource),
          })
          origins = recoverPythonWorkspaceOrigins(workspace, document.tree!)
          const reopened = workspace
            .getAllBlocks(false)
            .find((block) => block.type === 'sz_py_print')!
          const argument = workspace.newBlock('sz_py_integer')
          argument.setFieldValue('42', 'NUMBER')
          reopened.getInput('args:2')!.connection!.connect(argument.outputConnection!)
          await publish()
          recovery.restoredSource = document.source
        }
        const current = store.getState().project
        if (!current || !isPythonProject(current)) throw new Error('No committed document')
        return {
          synchronous,
          source: current.files?.['main.py'],
          parsed: document.source,
          history,
          recovery,
          draft: readPythonWorkspaceDraft(current)?.pending
            ? readPythonWorkspaceDraft(current)
            : null,
          retainedWorkspace: readPythonWorkspaceDraft(current)?.workspace,
        }
      } finally {
        unsubscribe()
        workspace.dispose()
      }
    },
    state: () => ({ mounts, releases, requests, results: Object.fromEntries(results) }),
    handoff() {
      epoch++
      controller.reset()
    },
    changeProject() {
      project = { ...project, id: 'other-python-project' }
      controller.reset()
    },
    dispose: () => controller.dispose(),
  }
}
declare global {
  var pythonAnalysisControllerProbe: Awaited<ReturnType<typeof createAnalysisControllerProbe>>
}
