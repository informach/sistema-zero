import type { EditableStudioProject } from '@sistemazero/studio'

/** Source navigation lives outside the observer shell, whose editing controls are inert. */
export function StudioReviewSource({ project }: { project: EditableStudioProject }) {
  if (project.programmingLanguage !== 'python') return null
  const files =
    project.kind === 'pro'
      ? Object.entries(project.tree).flatMap(([path, node]) =>
          node.kind === 'file' ? [{ path, content: node.content }] : [],
        )
      : Object.entries(project.files).map(([path, content]) => ({ path, content }))
  return (
    <section
      aria-label="Arquivos da versão enviada"
      className="space-y-3 border-t border-border p-3"
    >
      <h3 className="text-sm font-semibold">Arquivos da versão enviada</h3>
      <p className="text-sm text-muted-foreground">
        Abra cada arquivo para conferir o código preservado nesta entrega. Esta leitura não altera o
        trabalho.
      </p>
      {files.map((file) => (
        <details
          key={file.path}
          open={file.path === project.python.entrypoint}
          className="min-w-0 rounded-lg border border-border"
        >
          <summary className="cursor-pointer break-all px-3 py-2 font-mono text-sm">
            {file.path}
            {file.path === project.python.entrypoint ? ' · início do jogo' : ''}
          </summary>
          {!file.content ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Arquivo vazio.</p>
          ) : null}
          <pre
            role="region"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: The bounded source area must be scrollable with the keyboard.
            tabIndex={0}
            aria-label={`Código de ${file.path}`}
            className="max-h-96 overflow-auto whitespace-pre-wrap break-all border-t border-border bg-muted/30 p-3 text-xs"
          >
            <code>{file.content}</code>
          </pre>
        </details>
      ))}
    </section>
  )
}
