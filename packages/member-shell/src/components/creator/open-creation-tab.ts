/**
 * "Editar no Pinta/Molda": abre o app numa aba nova já naquela criação (o Pinta lê
 * `?desenho=`, o Molda `?criacao=` no 1º render).
 *
 * `tab` é a aba que o Estúdio já abriu DENTRO do clique, quando ele precisou preparar algo
 * antes de saber o id (o desenho de um jogo de exemplo, copiado para o Pinta só agora): o
 * Safari do iPad bloqueia o `window.open` feito depois de um `await`, então a aba nasce no
 * gesto e aqui só recebe o endereço. Sem ela (ou já fechada), abre como sempre.
 */
export function openDrawingInPinta(drawingId: string, tab?: Window | null): void {
  openInNewTab(`/pinta?desenho=${encodeURIComponent(drawingId)}`, tab)
}

export function openCreationInMolda(creationId: string): void {
  openInNewTab(`/molda?criacao=${encodeURIComponent(creationId)}`)
}

function openInNewTab(url: string, tab?: Window | null): void {
  if (tab && !tab.closed) {
    tab.location.replace(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
