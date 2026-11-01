/** Baixa um objeto como `.json` no navegador (o manifesto exportado). */
export function baixarJson(nome: string, dados: unknown) {
  const blob = new Blob([`${JSON.stringify(dados, null, 2)}\n`], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
