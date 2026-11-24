import type { EntradaDeImportacao } from '@sistemazero/molda-cenarios-motor'

const ehArquivo = (e: FileSystemEntry): e is FileSystemFileEntry =>
  e.isFile && 'file' in e && typeof e.file === 'function'
const ehPasta = (e: FileSystemEntry): e is FileSystemDirectoryEntry =>
  e.isDirectory && 'createReader' in e && typeof e.createReader === 'function'

/** A API de entradas preserva subpastas sem alterar propriedades readonly dos Files. */
export async function arquivosDoDrop(dados: DataTransfer): Promise<EntradaDeImportacao[]> {
  const entradas = Array.from(dados.items)
    .map((i) => i.webkitGetAsEntry?.())
    .filter((e): e is FileSystemEntry => Boolean(e))
  if (!entradas.length) return Array.from(dados.files)
  const arquivos: EntradaDeImportacao[] = []
  let bytes = 0
  let visitados = 0
  async function visitar(e: FileSystemEntry, pasta: string) {
    if (++visitados > 10000 || pasta.length > 4096)
      throw Error('Esta pasta tem arquivos ou níveis demais. Traga em partes menores')
    const caminho = pasta ? `${pasta}/${e.name}` : e.name
    if (ehArquivo(e)) {
      const f = await new Promise<File>((resolve, reject) => e.file(resolve, reject))
      bytes += f.size
      if (arquivos.length >= 5000 || bytes > 512 * 1024 * 1024)
        throw Error('Traga a pasta em partes de até 512 MB e 5.000 arquivos')
      arquivos.push({ caminho, arquivo: f })
    } else if (ehPasta(e)) {
      const leitor = e.createReader()
      for (;;) {
        const filhos = await new Promise<FileSystemEntry[]>((resolve, reject) =>
          leitor.readEntries(resolve, reject),
        )
        if (!filhos.length) break
        for (const filho of filhos) await visitar(filho, caminho)
      }
    }
  }
  for (const e of entradas) await visitar(e, '')
  return arquivos
}
