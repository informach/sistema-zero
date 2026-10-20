export function editorDemoPath(projectId: string, search: string): string {
  const path = `/editor/${encodeURIComponent(projectId)}`
  // App lê o opt-in ao ser importado, depois da navegação da entrada leve.
  const mission = new URLSearchParams(search).get('missao')
  return mission ? `${path}?${new URLSearchParams({ missao: mission })}` : path
}
