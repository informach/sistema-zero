/** Um nome de arquivo portátil, nunca URL, endereço de disco ou caminho que saia do pacote. */
export function conferirCaminhoCompilado(caminho: string): string {
  if (
    typeof caminho !== 'string' ||
    !caminho.length ||
    caminho.length > 1024 ||
    !/^[A-Za-z0-9_./-]+$/.test(caminho)
  )
    throw Error('O caminho do arquivo compilado é inválido.')
  const segmentos = caminho.split('/')
  if (
    segmentos.some(
      (s) =>
        !s ||
        s === '.' ||
        s === '..' ||
        s.length > 240 ||
        s.endsWith('.') ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(s),
    )
  )
    throw Error('O caminho do arquivo compilado não é portátil.')
  return caminho
}
