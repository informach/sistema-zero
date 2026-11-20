import { GENERATED_JS_HEADER, generateHTML, type ProjectGenerationInput } from '#generators'
import type { HTMLShell, SZIRV2 } from '#ir'
import { createBlankProjectSnapshot } from '../core/blankProject'
import type { Project } from '../core/project'
import { extractInlineAssetMetadata } from '../parsers/html'

const TITLE_ELEMENT = /<title>[\s\S]*?<\/title>/i

/** The head with its title emptied: the title of a generated head is the project name. */
function untitled(shell: HTMLShell): HTMLShell {
  return shell.head === undefined
    ? shell
    : { ...shell, head: shell.head.replace(TITLE_ELEMENT, '<title></title>') }
}

let generatedShells: readonly HTMLShell[] | undefined

/**
 * The heads the Studio writes by itself, title emptied: the generator default and the blank
 * template of a new project. DOM serialization normalizes void tags, so both are read back
 * through the same parser as the saved document. Computed once, on first use.
 */
function studioGeneratedShells(): readonly HTMLShell[] {
  generatedShells ??= [
    generateHTML({ title: '', body: [] }),
    createBlankProjectSnapshot('', '').files['index.html'],
  ].flatMap((html) => {
    const shell = extractInlineAssetMetadata(html, '', '').htmlShell
    return shell ? [untitled(shell)] : []
  })
  return generatedShells
}

/**
 * A saved head the Studio generated (default or blank template, whatever the title) is not a
 * child's customization. Installing it as a shell would freeze the title after a rename and,
 * for the blank template, drop the viewport from every later generation.
 */
function isStudioGeneratedShell(shell: HTMLShell): boolean {
  const saved = untitled(shell)
  return studioGeneratedShells().some((standard) =>
    Object.keys({ ...saved, ...standard }).every(
      (key) => Reflect.get(saved, key) === Reflect.get(standard, key),
    ),
  )
}

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
    if (!project.ir?.htmlShell && shell && !isStudioGeneratedShell(shell))
      ir = { ...built, htmlShell: shell }
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
