import { conferirGlb, GlbInvalido } from '@sistemazero/molda-cenarios-core/v2'
import type { EntradaDeImportacao } from '@sistemazero/molda-cenarios-motor'
import type { ModeloParaImportar } from './portas'

export interface ArquivoRecusado {
  arquivo: string
  motivo: string
}

export interface ArquivosPreparados {
  prontos: ModeloParaImportar[]
  recusados: ArquivoRecusado[]
}

let motor: Promise<typeof import('@sistemazero/molda-cenarios-motor')> | null = null
/** Não baixa o motor apenas para sair de uma biblioteca que não importou nada. */
export function encerrarPreparacao(): Promise<void> {
  return (
    motor?.then(
      (m) => m.encerrarFotografo(),
      () => undefined,
    ) ?? Promise.resolve()
  )
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
  arquivos: readonly EntradaDeImportacao[],
  aoAndar?: (feitos: number, total: number) => void,
  sinal?: AbortSignal,
): Promise<ArquivosPreparados> {
  // O motor 3D só é baixado quando alguém traz um modelo.
  sinal?.throwIfAborted()
  motor ??= import('@sistemazero/molda-cenarios-motor')
  const { fotografarModelo, converterArquivos } = await motor
  const prontos: ModeloParaImportar[] = [],
    recusados: ArquivoRecusado[] = [],
    vistos = new Set<string>()
  sinal?.throwIfAborted()
  const convertidos = await converterArquivos(arquivos, aoAndar, sinal)
  recusados.push(...convertidos.recusados)
  for (let i = 0; i < convertidos.modelos.length; i++) {
    sinal?.throwIfAborted()
    const arquivo = convertidos.modelos[i]!
    try {
      const conteudo = arquivo.bytes
      conferirGlb(conteudo)
      const digest = arquivo.digest
      if (!vistos.has(digest)) {
        const pasta = arquivo.caminho.split('/').slice(0, -1).join('/')
        if (pasta.length > 240)
          throw new GlbInvalido('O nome completo da pasta passa de 240 caracteres')
        vistos.add(digest)
        const foto = await fotografarModelo(conteudo.slice().buffer)
        sinal?.throwIfAborted()
        prontos.push({
          nome: nomeDoArquivo(arquivo.caminho.split('/').at(-1)!),
          pasta,
          etiquetas: [],
          conteudo,
          digest,
          miniatura: foto.miniatura,
          min: arquivo.min,
          max: arquivo.max,
          triangulos: arquivo.triangulos,
        })
      }
    } catch (erro) {
      sinal?.throwIfAborted()
      recusados.push({
        arquivo: arquivo.caminho,
        motivo: erro instanceof GlbInvalido ? erro.message : 'Não foi possível ler este modelo',
      })
    }
    aoAndar?.(i + 1, convertidos.modelos.length)
  }
  return { prontos, recusados }
}
