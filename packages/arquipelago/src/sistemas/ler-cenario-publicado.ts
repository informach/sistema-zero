import type { CenariosPublicadosDoJogo } from '@sistemazero/arquipelago-contracts'
import { lerCenaCompilada, type PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import {
  MIME_DO_MANIFESTO,
  PerfilDePublicacaoSchema,
  type PublicacaoParaOJogo,
  PublicacaoParaOJogoSchema,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import {
  type BuscarArquivoCompilado,
  lerBytesDoCenario,
} from '@sistemazero/molda-cenarios-motor/leitura'

/** A plataforma autoriza e assina; o jogo confere novamente o inventário antes do runtime.
 * Nenhum rascunho, cookie, chave de armazenamento ou progresso da conta entra no pacote. */
type PacoteDaPublicacao = { publicacao: PublicacaoParaOJogo; pacote: PacoteCompilado }

/**
 * Pacotes já baixados e conferidos, pela versão exata (id, versão e hash do manifesto): voltar a
 * uma ilha não baixa tudo de novo. Guarda as últimas `maximo` versões; o pacote é só leitura
 * depois de baixado (o carregador copia o que entrega ao three).
 */
export function criarMemoriaDePublicacoes(maximo = 3) {
  const guardados = new Map<string, PacoteDaPublicacao>()
  return {
    ler(chave: string) {
      const v = guardados.get(chave)
      if (!v) return undefined
      // A mais usada vai para o fim: sai primeiro a esquecida há mais tempo.
      guardados.delete(chave)
      guardados.set(chave, v)
      return v
    },
    guardar(chave: string, v: PacoteDaPublicacao) {
      guardados.delete(chave)
      guardados.set(chave, v)
      while (guardados.size > maximo) guardados.delete(guardados.keys().next().value!)
    },
    limpar() {
      guardados.clear()
    },
    get tamanho() {
      return guardados.size
    },
  }
}
export type MemoriaDePublicacoes = ReturnType<typeof criarMemoriaDePublicacoes>
const chaveDaVersao = (p: PublicacaoParaOJogo) => `${p.id}:${p.versao}:${p.manifesto.digest}`

export async function lerCenarioPublicado(
  porta: CenariosPublicadosDoJogo,
  ilha: string,
  sinal: AbortSignal,
  buscar: BuscarArquivoCompilado = fetch,
  memoria?: MemoriaDePublicacoes,
) {
  sinal.throwIfAborted()
  const perfil = PerfilDePublicacaoSchema.parse({ tipo: 'arquipelago-v2', ilha })
  const resposta = await porta.perfil(perfil.ilha, sinal)
  sinal.throwIfAborted()
  if (resposta.status !== 200)
    throw Error(`Não consegui consultar o cenário publicado (${resposta.status}).`)
  const corpo = resposta.corpo
  if (!corpo || typeof corpo !== 'object' || !Object.hasOwn(corpo, 'publicacao'))
    throw Error('A consulta do cenário respondeu fora do combinado.')
  const publicacao = PublicacaoParaOJogoSchema.nullable().parse(
    (corpo as { publicacao: unknown }).publicacao,
  )
  if (!publicacao) return null
  if (publicacao.perfil.ilha !== perfil.ilha)
    throw Error('O cenário publicado pertence a outra ilha.')
  const lembrado = memoria?.ler(chaveDaVersao(publicacao))
  if (lembrado) return lembrado
  type Esperado = { digest: string; bytes: number; mime: string }
  const baixar = async (esperado: Esperado, meta: unknown) => {
    const m = meta as { url?: unknown; bytes?: unknown; tipoDoConteudo?: unknown } | null
    if (
      !m ||
      typeof m.url !== 'string' ||
      m.bytes !== esperado.bytes ||
      m.tipoDoConteudo !== esperado.mime
    )
      throw Error('O arquivo publicado não corresponde ao inventário.')
    const bytes = await lerBytesDoCenario(new URL(m.url), esperado.bytes, sinal, buscar)
    if (bytes.length !== esperado.bytes || (await digestDosBytes(bytes)) !== esperado.digest)
      throw Error('O conteúdo do arquivo publicado não corresponde ao inventário.')
    sinal.throwIfAborted()
    return bytes
  }
  const ler = async (esperado: Esperado) => {
    sinal.throwIfAborted()
    const r = await porta.arquivo(publicacao.id, esperado.digest, sinal)
    sinal.throwIfAborted()
    if (r.status !== 200) throw Error(`Não consegui localizar um arquivo publicado (${r.status}).`)
    return baixar(esperado, r.corpo)
  }
  const manifesto = await ler({ ...publicacao.manifesto, mime: MIME_DO_MANIFESTO })
  const cena = lerCenaCompilada(new TextDecoder('utf-8', { fatal: true }).decode(manifesto))
  if (
    cena.fonte.cenario !== publicacao.fonte.cenario ||
    cena.fonte.revisao !== publicacao.fonte.revisao ||
    cena.fonte.digest !== publicacao.fonte.digest
  )
    throw Error('O manifesto publicado pertence a outra revisão.')
  const unicos = new Map<string, Esperado>()
  for (const a of cena.arquivos) {
    const anterior = unicos.get(a.digest)
    if (anterior && (anterior.bytes !== a.bytes || anterior.mime !== a.mime))
      throw Error('O inventário repete um hash com metadados diferentes.')
    unicos.set(a.digest, { digest: a.digest, bytes: a.bytes, mime: a.mime })
  }
  const conteudos = await lerArquivosPublicados(
    [...unicos.values()],
    async (lote) => {
      // Host com leitura em lote: um pedido por até 100 arquivos (o limite da conta agradece).
      if (!porta.arquivos) return lote.map((e) => () => ler(e))
      sinal.throwIfAborted()
      const r = await porta.arquivos(
        publicacao.id,
        lote.map((e) => e.digest),
        sinal,
      )
      sinal.throwIfAborted()
      if (r.status !== 200)
        throw Error(`Não consegui localizar os arquivos publicados (${r.status}).`)
      const lista = (r.corpo as { arquivos?: unknown } | null)?.arquivos
      if (!Array.isArray(lista) || lista.length !== lote.length)
        throw Error('Os arquivos publicados não correspondem ao inventário.')
      return lote.map((e, i) => {
        const meta = lista[i] as { digest?: unknown } | null
        if (meta?.digest !== e.digest)
          throw Error('Os arquivos publicados não correspondem ao inventário.')
        return () => baixar(e, meta)
      })
    },
    sinal,
  )
  const arquivos = new Map<string, Uint8Array>()
  for (const a of cena.arquivos) arquivos.set(a.caminho, conteudos.get(a.digest)!)
  const pacote: PacoteCompilado = { cena, arquivos },
    resultado: PacoteDaPublicacao = { publicacao, pacote }
  memoria?.guardar(chaveDaVersao(publicacao), resultado)
  return resultado
}

const POR_LOTE = 100,
  DOWNLOADS_SIMULTANEOS = 4

/** Pede os endereços em lotes e baixa poucos arquivos por vez: o pacote chega sem um pedido por
 * arquivo e sem abrir dezenas de conexões de uma vez no aparelho da criança. */
export async function lerArquivosPublicados<T extends { digest: string }>(
  esperados: readonly T[],
  enderecos: (
    lote: readonly T[],
  ) => Promise<ReadonlyArray<Uint8Array | (() => Promise<Uint8Array>)>>,
  sinal: AbortSignal,
): Promise<Map<string, Uint8Array>> {
  const conteudos = new Map<string, Uint8Array>()
  for (let i = 0; i < esperados.length; i += POR_LOTE) {
    sinal.throwIfAborted()
    const lote = esperados.slice(i, i + POR_LOTE)
    const tarefas = await enderecos(lote)
    let proximo = 0
    const trabalhar = async () => {
      while (proximo < tarefas.length) {
        const k = proximo++
        const t = tarefas[k]!
        conteudos.set(lote[k]!.digest, typeof t === 'function' ? await t() : t)
      }
    }
    await Promise.all(
      Array.from({ length: Math.min(DOWNLOADS_SIMULTANEOS, tarefas.length) }, trabalhar),
    )
  }
  sinal.throwIfAborted()
  return conteudos
}
