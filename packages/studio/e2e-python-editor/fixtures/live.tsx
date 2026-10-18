import type { LiveWorkspaceView } from '@sistemazero/core/live'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import type { Root } from 'react-dom/client'
import {
  LiveBlockWorkspace,
  LiveContinuedWorkspace,
} from '../../../member-shell/src/components/live/live-workspace'
import type { LiveLessonWorkspace } from '../../../member-shell/src/lib/live/lesson-slot'

export function createLiveProbe(root: Root) {
  return {
    async create(role: 'child' | 'teacher', surface: 'room' | 'library' = 'room') {
      const setup = await (await fetch(`/live-probe/actor?role=${role}`)).json()
      if (surface === 'library') {
        const workspace: LiveWorkspaceView = await (
          await fetch(`/api/live/workspaces/${setup.workspaceId}`)
        ).json()
        root.render(<LiveContinuedWorkspace workspace={workspace} deviceId={setup.deviceId} />)
        return
      }
      const context: LiveLessonWorkspace = {
        ...setup,
        learners: [{ id: setup.learnerId, name: 'Alice' }],
        publishToMural: false,
      }
      root.render(
        <LiveBlockWorkspace
          workspace={context}
          blockId={setup.blockId}
          title="Projeto da oficina"
        />,
      )
    },
    source(value: string) {
      const editor = monaco.editor
        .getEditors()
        .find((item) => item.getModel()?.uri.path.endsWith('/main.py'))
      const model = editor?.getModel()
      if (!editor || !model) throw new Error('Live source editor not ready')
      editor.executeEdits('qualification', [{ range: model.getFullModelRange(), text: value }])
    },
    read: () =>
      monaco.editor
        .getModels()
        .find((model) => model.uri.path.endsWith('/main.py'))
        ?.getValue(),
    close: () => root.unmount(),
  }
}
declare global {
  var studioLiveProbe: ReturnType<typeof createLiveProbe>
}
