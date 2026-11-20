import { GENERATED_JS_HEADER, generateHTML, type ProjectGenerationInput } from '#generators'
import type { SZIRV2 } from '#ir'
import type { Project } from '../core/project'
import { extractInlineAssetMetadata } from '../parsers/html'

export function blockGenerationInput(
  built: SZIRV2,
  project: Project | null,
  force: boolean,
): ProjectGenerationInput & { ir: SZIRV2 } {
  let ir = project?.ir?.htmlShell ? { ...built, htmlShell: project.ir.htmlShell } : built
  let jsSource = project?.files['script.js'] ?? ''
  if (
    project &&
    (force || !project.ir || project.ir.htmlShell?.jsPlacement?.startsWith('inline'))
  ) {
    const metadata = extractInlineAssetMetadata(
      project.files['index.html'],
      project.files['style.css'],
      jsSource,
    )
    jsSource = metadata.jsSource
    const shell = metadata.htmlShell
    if (!project.ir?.htmlShell && shell) {
      // DOM serialization normalizes void tags. Do not install a normalized
      // shell when the existing document was generated from the default one.
      const standard = extractInlineAssetMetadata(
        generateHTML({ title: project.name, body: [] }),
        '',
        '',
      )
      const isStandard = Object.keys({ ...shell, ...standard.htmlShell }).every(
        (key) => Reflect.get(shell, key) === Reflect.get(standard.htmlShell ?? {}, key),
      )
      if (!isStandard) ir = { ...built, htmlShell: shell }
    }
  }
  return {
    ir,
    projectName: project?.name ?? 'Projeto',
    jsHeader:
      force && project && !jsSource.startsWith(GENERATED_JS_HEADER)
        ? undefined
        : GENERATED_JS_HEADER,
  }
}
