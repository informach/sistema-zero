import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js'
import { createRef } from 'react'
import type { Root } from 'react-dom/client'
import { StudioEmbed } from '../../../admin/src/components/studio/studio-embed'
import type { StudioAuthoringRuntimeScope } from '../../../admin/src/components/studio/use-studio-authoring-runtime'
import { refinePythonProjectDocument } from '../../src/state/pythonProjectValidation'
import type { StudioHandle } from '../../src/studio/types'

export function createAuthoringProbe(root: Root) {
  const handle = createRef<StudioHandle>()
  return {
    async create(kind: 'classic' | 'pro', purpose: 'authoring' | 'rehearsal') {
      const setup = await (
        await fetch(`/authoring-probe/setup?kind=${kind}&purpose=${purpose}`)
      ).json()
      const project = await refinePythonProjectDocument(setup.project)
      const scope: StudioAuthoringRuntimeScope = setup.scope
      root.render(
        <StudioEmbed
          handleRef={handle}
          initialProject={project}
          runtimeScope={scope}
          className="h-[700px]"
          lessonConfig={{ allowedModes: kind === 'pro' ? ['code'] : ['bridge'], pythonLevel: 2 }}
          features={{ ai: false, terminal: false, professional: kind === 'pro' }}
        />,
      )
    },
    read: () => handle.current?.getProject(),
    async source(value: string) {
      const editor = monaco.editor
        .getEditors()
        .find((item) => item.getModel()?.uri.path.endsWith('/main.py'))
      const model = editor?.getModel()
      if (!editor || !model) throw new Error('Source editor not ready')
      editor.executeEdits('qualification', [{ range: model.getFullModelRange(), text: value }])
      await handle.current?.save()
    },
    close: () => root.unmount(),
  }
}
declare global {
  var studioAuthoringProbe: ReturnType<typeof createAuthoringProbe>
}
