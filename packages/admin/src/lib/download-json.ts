/**
 * Baixa um objeto como `.json` no navegador. Vive aqui porque tem dois donos: os importadores
 * locais de autoria (modelo e catálogo para baixar) e a exportação do manifesto da aula.
 */
export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
