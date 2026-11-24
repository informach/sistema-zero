import { literalLocalFilePath, readZipFiles } from '@sistemazero/molda/arquivos'

export const LIMITE_DO_CONJUNTO = 512 * 1024 * 1024
export const LIMITE_DE_ARQUIVOS = 5000
export interface ArquivoLocal {
  caminho: string
  arquivo: Blob
}

/** Resolve o pacote sem IO externo. CRC, tamanho inflado e caminhos são conferidos pelo leitor do Molda. */
export async function abrirConjunto(
  entradas: readonly { caminho: string; arquivo: File }[],
): Promise<Map<string, Blob>> {
  const arquivos = new Map<string, Blob>()
  let bytes = 0
  const incluir = (caminho: string, arquivo: Blob) => {
    const normal = literalLocalFilePath(caminho.replaceAll('\\', '/').normalize('NFC'), 'arquivo')
    if (arquivos.has(normal)) throw Error(`Dois arquivos têm o mesmo caminho: ${normal}`)
    bytes += arquivo.size
    if (bytes > LIMITE_DO_CONJUNTO || arquivos.size >= LIMITE_DE_ARQUIVOS)
      throw Error('Traga o pacote em partes de até 512 MB e 5.000 arquivos')
    arquivos.set(normal, arquivo)
  }
  for (const e of entradas) {
    if (/\.zip$/i.test(e.caminho)) {
      const zip = await readZipFiles(e.arquivo, {
        maxBytes: LIMITE_DO_CONJUNTO - bytes,
        maxEntries: LIMITE_DE_ARQUIVOS - arquivos.size,
        include: (nome) => !nome.startsWith('__MACOSX/') && !nome.endsWith('.DS_Store'),
      })
      if (!zip.ok)
        throw Error(`Não consegui abrir ${e.caminho}: pacote inválido ou acima do limite`)
      const pasta = e.caminho.split('/').slice(0, -1).join('/')
      for (const f of zip.files)
        incluir(pasta ? `${pasta}/${f.path}` : f.path, new Blob([new Uint8Array(f.bytes).buffer]))
    } else incluir(e.caminho, e.arquivo)
  }
  return arquivos
}
