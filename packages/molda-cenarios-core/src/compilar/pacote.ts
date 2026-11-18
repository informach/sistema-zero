import { digestDosBytes } from '../v2/glb'
import { type CenaCompilada, lerCenaCompilada } from './schema'

export interface PacoteCompilado {
  cena: CenaCompilada
  arquivos: ReadonlyMap<string, Uint8Array>
}

/** Confere o inventário antes do decoder. Não substitui a validação do formato de cada arquivo. */
export async function conferirInventarioCompilado(
  entrada: unknown,
  arquivos: ReadonlyMap<string, Uint8Array>,
  sinal?: AbortSignal,
): Promise<void> {
  sinal?.throwIfAborted()
  const cena = lerCenaCompilada(entrada)
  const declarados = new Set(cena.arquivos.map((arquivo) => arquivo.caminho))
  for (const caminho of arquivos.keys()) {
    if (!declarados.has(caminho)) throw Error(`O arquivo “${caminho}” não pertence ao inventário.`)
  }
  for (const arquivo of cena.arquivos) {
    sinal?.throwIfAborted()
    const bytes = arquivos.get(arquivo.caminho)
    if (!bytes) throw Error(`O arquivo “${arquivo.caminho}” está ausente do inventário.`)
    if (bytes.byteLength !== arquivo.bytes)
      throw Error(`O tamanho em bytes de “${arquivo.caminho}” não corresponde ao manifesto.`)
    const digest = await digestDosBytes(bytes)
    sinal?.throwIfAborted()
    if (digest !== arquivo.digest)
      throw Error(`O hash do conteúdo de “${arquivo.caminho}” não corresponde ao manifesto.`)
  }
}
