import { conferirGlb, digestDosBytes, GlbInvalido } from '@sistemazero/molda-cenarios-core/v2'
import { COPY } from './copy'
import type { ModeloParaImportar } from './portas'

export interface ArquivoRecusado {
  arquivo: string
  motivo: string
}

export interface ArquivosPreparados {
  prontos: ModeloParaImportar[]
  recusados: ArquivoRecusado[]
}

/** "arvore_grande-02.glb" vira "Arvore grande 02". */
export function nomeDoArquivo(arquivo: string): string {
  const semExtensao = arquivo.replace(/\.[^.]+$/, '')
  const limpo = semExtensao.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  const nome = limpo ? limpo.charAt(0).toLocaleUpperCase('pt-BR') + limpo.slice(1) : 'Modelo'
  return nome.slice(0, 120)
}

/** A pasta de um arquivo trazido de dentro de uma pasta escolhida ou arrastada. */
export function pastaDoArquivo(caminho: string): string {
  const partes = caminho.split('/').filter(Boolean)
  // O primeiro nível é a própria pasta escolhida; o último, o arquivo.
  return partes.slice(1, -1).join('/').slice(0, 240)
}

/**
 * Confere, mede e fotografa cada arquivo no navegador. O que não serve fica de fora com o
 * motivo, e o resto segue: um arquivo ruim não derruba a importação inteira.
 */
export async function prepararArquivos(
  arquivos: readonly File[],
  aoAndar?: (feitos: number, total: number) => void,
): Promise<ArquivosPreparados> {
  // O motor 3D só é baixado quando alguém traz um modelo.
  const { fotografarModelo } = await import('@sistemazero/molda-cenarios-motor')
  const prontos: ModeloParaImportar[] = [],
    recusados: ArquivoRecusado[] = [],
    vistos = new Set<string>()
  for (let i = 0; i < arquivos.length; i++) {
    const arquivo = arquivos[i]!
    try {
      if (!/\.glb$/i.test(arquivo.name)) throw new GlbInvalido(COPY.biblioteca.soGlb)
      const conteudo = new Uint8Array(await arquivo.arrayBuffer())
      conferirGlb(conteudo)
      const digest = await digestDosBytes(conteudo)
      if (!vistos.has(digest)) {
        vistos.add(digest)
        const foto = await fotografarModelo(conteudo.slice().buffer)
        prontos.push({
          nome: nomeDoArquivo(arquivo.name),
          pasta: pastaDoArquivo(arquivo.webkitRelativePath || arquivo.name),
          etiquetas: [],
          conteudo,
          digest,
          miniatura: foto.miniatura,
          min: foto.min,
          max: foto.max,
          triangulos: foto.triangulos,
        })
      }
    } catch (erro) {
      recusados.push({
        arquivo: arquivo.name,
        motivo: erro instanceof GlbInvalido ? erro.message : 'Não foi possível ler este modelo',
      })
    }
    aoAndar?.(i + 1, arquivos.length)
  }
  return { prontos, recusados }
}
