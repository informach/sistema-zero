import type { EditableStudioProject as Project } from '@sistemazero/studio'

/** Bounded textual context only; binary materials and dependency locks never enter this prompt. */
export function studioDescriptionInput(project: Project, title: string) {
  const base = { projectId: project.id, title: title.slice(0, 200) }
  if (project.programmingLanguage === 'python') {
    const entries =
      project.kind === 'pro'
        ? Object.entries(project.tree).flatMap(([path, node]) =>
            node.kind === 'file' ? [[path, node.content] as const] : [],
          )
        : Object.entries(project.files)
    const sources = entries
      .filter(([path]) => path.endsWith('.py'))
      .sort(
        ([a], [b]) =>
          Number(a !== project.python.entrypoint) - Number(b !== project.python.entrypoint) ||
          a.localeCompare(b),
      )
      .slice(0, 6)
      .map(([path, content]) => ({ path, content: content.slice(0, 4000) }))
    return { ...base, kind: 'python' as const, projectKind: project.kind, sources }
  }
  if (project.kind !== 'pro')
    return {
      ...base,
      kind: 'classic' as const,
      files: {
        html: project.files['index.html'].slice(0, 20000),
        css: project.files['style.css'].slice(0, 20000),
        js: project.files['script.js'].slice(0, 40000),
      },
    }
  const sources = Object.entries(project.tree ?? {})
    .filter(
      ([path, node]) =>
        node.kind === 'file' &&
        /^(?!.*(?:\.\.|node_modules|package-lock))[A-Za-z0-9_./-]+\.(?:[cm]?[jt]sx?|html|css|json)$/.test(
          path,
        ) &&
        !path.startsWith('public/'),
    )
    .sort(
      ([a], [b]) =>
        Number(!/\/(main|game|config)\.[jt]sx?$/.test(a)) -
          Number(!/\/(main|game|config)\.[jt]sx?$/.test(b)) || a.localeCompare(b),
    )
    .slice(0, 6)
    .flatMap(([path, node]) =>
      node.kind === 'file' ? [{ path, content: node.content.slice(0, 4000) }] : [],
    )
  return { ...base, kind: 'pro' as const, sources }
}
