import type { CenariosPublicadosDoJogo } from '@sistemazero/arquipelago-contracts'
import { lerCenaCompilada, type PacoteCompilado } from '@sistemazero/molda-cenarios-core/compilar'
import {
  MIME_DO_MANIFESTO,
  PerfilDePublicacaoSchema,
  PublicacaoParaOJogoSchema,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import {
  type BuscarArquivoCompilado,
  lerBytesDoCenario,
} from '@sistemazero/molda-cenarios-motor/leitura'

/** A plataforma autoriza e assina; o jogo confere novamente o inventário antes do runtime.
 * Nenhum rascunho, cookie, chave de armazenamento ou progresso da conta entra no pacote. */
export async function lerCenarioPublicado(
  porta: CenariosPublicadosDoJogo,
  ilha: string,
  sinal: AbortSignal,
  buscar: BuscarArquivoCompilado = fetch,
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
  const ler = async (esperado: { digest: string; bytes: number; mime: string }) => {
    sinal.throwIfAborted()
    const r = await porta.arquivo(publicacao.id, esperado.digest, sinal)
    sinal.throwIfAborted()
    if (r.status !== 200) throw Error(`Não consegui localizar um arquivo publicado (${r.status}).`)
    const meta = r.corpo as { url?: unknown; bytes?: unknown; tipoDoConteudo?: unknown } | null
    if (
      !meta ||
      typeof meta.url !== 'string' ||
      meta.bytes !== esperado.bytes ||
      meta.tipoDoConteudo !== esperado.mime
    )
      throw Error('O arquivo publicado não corresponde ao inventário.')
    const bytes = await lerBytesDoCenario(new URL(meta.url), esperado.bytes, sinal, buscar)
    if (bytes.length !== esperado.bytes || (await digestDosBytes(bytes)) !== esperado.digest)
      throw Error('O conteúdo do arquivo publicado não corresponde ao inventário.')
    sinal.throwIfAborted()
    return bytes
  }
  const manifesto = await ler({ ...publicacao.manifesto, mime: MIME_DO_MANIFESTO })
  const cena = lerCenaCompilada(new TextDecoder('utf-8', { fatal: true }).decode(manifesto))
  if (
    cena.fonte.cenario !== publicacao.fonte.cenario ||
    cena.fonte.revisao !== publicacao.fonte.revisao ||
    cena.fonte.digest !== publicacao.fonte.digest
  )
    throw Error('O manifesto publicado pertence a outra revisão.')
  const arquivos = new Map<string, Uint8Array>()
  const porDigest = new Map<string, { bytes: number; mime: string; conteudo: Uint8Array }>()
  for (const a of cena.arquivos) {
    sinal.throwIfAborted()
    let anterior = porDigest.get(a.digest)
    if (anterior && (anterior.bytes !== a.bytes || anterior.mime !== a.mime))
      throw Error('O inventário repete um hash com metadados diferentes.')
    if (!anterior) {
      anterior = { bytes: a.bytes, mime: a.mime, conteudo: await ler(a) }
      porDigest.set(a.digest, anterior)
    }
    arquivos.set(a.caminho, anterior.conteudo)
  }
  const pacote: PacoteCompilado = { cena, arquivos }
  return { publicacao, pacote }
}
