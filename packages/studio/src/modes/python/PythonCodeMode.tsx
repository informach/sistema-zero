import { PythonProPreview } from '../../components/preview/PythonCandidatePreview'
import { isPythonProject } from '../../core/editableProject'
import { pythonProCodeExamples } from '../../python/proExamples'
import { useProjectStore } from '../../state/projectStore'
import { ProWorkspace } from '../pro/ProWorkspace'
import { PythonProCodeEditor } from './PythonProCodeEditor'

/** Python source and execution share the project store; no JavaScript dev server is created. */
export function PythonCodeMode() {
  const project = useProjectStore((state) => state.project)
  if (!project || !isPythonProject(project) || project.kind !== 'pro') return null
  return (
    <ProWorkspace
      key={project.id}
      Editor={PythonProCodeEditor}
      preview={<PythonProPreview />}
      examples={pythonProCodeExamples}
    />
  )
}
