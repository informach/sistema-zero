import 'server-only'
import {
  criarSnapshotDePublicacao,
  MIME_DO_MANIFESTO,
  PedidoDePublicacaoSchema,
  resumirPublicacao,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { conferirConteudoCompilado } from '@sistemazero/molda-cenarios-motor/conteudo'
import { ConteudoDeCenarioInvalido, type ConteudoDoCenario } from './cenarios-conteudo'

export type LerConteudoPublicado = (
  digest: string,
  sinal?: AbortSignal,
) => Promise<ConteudoDoCenario | null>

/** Lê apenas o inventário autorizado pelo chamador, nunca uma chave ou URL do navegador. */
async function lerArquivo(
  esperado: { digest: string; bytes: number; mime: string },
  ler: LerConteudoPublicado,
  sinal?: AbortSignal,
): Promise<Uint8Array> {
  sinal?.throwIfAborted()
  const objeto = await ler(esperado.digest, sinal)
  if (!objeto) {
    sinal?.throwIfAborted()
    throw new ConteudoDeCenarioInvalido('Um arquivo da publicação não está no armazenamento.')
  }
  const leitor = objeto.body.getReader()
  let completo = false
  const cancelar = () => {
    void leitor.cancel(sinal?.reason).catch(() => undefined)
  }
  sinal?.addEventListener('abort', cancelar, { once: true })
  try {
    sinal?.throwIfAborted()
    if (objeto.contentLength !== esperado.bytes)
      throw new ConteudoDeCenarioInvalido(
        'O tamanho do arquivo armazenado não corresponde à publicação.',
      )
    if (objeto.contentType !== esperado.mime)
      throw new ConteudoDeCenarioInvalido(
        'O tipo do arquivo armazenado não corresponde à publicação.',
      )
    const bytes = new Uint8Array(esperado.bytes)
    let posicao = 0
    while (true) {
      sinal?.throwIfAborted()
      const parte = await leitor.read()
      sinal?.throwIfAborted()
      if (parte.done) break
      if (parte.value.length > bytes.length - posicao)
        throw new ConteudoDeCenarioInvalido('O arquivo excede o tamanho declarado no manifesto.')
      bytes.set(parte.value, posicao)
      posicao += parte.value.length
    }
    if (posicao !== bytes.length)
      throw new ConteudoDeCenarioInvalido('O arquivo da publicação foi truncado.')
    if ((await digestDosBytes(bytes)) !== esperado.digest)
      throw new ConteudoDeCenarioInvalido(
        'O hash do arquivo armazenado não corresponde à publicação.',
      )
    sinal?.throwIfAborted()
    completo = true
    return bytes
  } finally {
    sinal?.removeEventListener('abort', cancelar)
    if (!completo) await leitor.cancel().catch(() => undefined)
    leitor.releaseLock()
  }
}

/** O chamador exige autorização da equipe/fonte antes de fornecer a porta de leitura do espaço.
 * O pacote inteiro é limitado pelo manifesto canônico e conferido antes da confirmação HMAC. */
export async function conferirPacoteDaPublicacao(
  entrada: unknown,
  ler: LerConteudoPublicado,
  sinal?: AbortSignal,
) {
  const { manifesto, snapshot } = await lerManifestoDaPublicacao(entrada, ler, sinal)
  const porDigest = new Map<string, Uint8Array>()
  for (const recurso of snapshot.recursos) {
    if (recurso.papel === 'manifesto') continue
    porDigest.set(recurso.digest, await lerArquivo(recurso, ler, sinal))
  }
  const arquivos = new Map(snapshot.cena.arquivos.map((a) => [a.caminho, porDigest.get(a.digest)!]))
  try {
    await conferirConteudoCompilado(snapshot.cena, arquivos, sinal)
  } catch (erro) {
    sinal?.throwIfAborted()
    throw new ConteudoDeCenarioInvalido(
      erro instanceof Error ? erro.message : 'O pacote compilado é inválido',
    )
  }
  sinal?.throwIfAborted()
  return {
    manifesto,
    /** O que o Members guarda: inventário e procedência, sem o manifesto inteiro. */
    resumo: resumirPublicacao(snapshot),
    conferidos: snapshot.recursos.map((r) => ({
      digest: r.digest,
      bytes: r.bytes,
      tipoDoConteudo: r.mime,
    })),
  }
}

/** Na reserva, os recursos ainda não foram enviados: confere somente o manifesto real. */
export async function lerManifestoDaPublicacao(
  entrada: unknown,
  ler: LerConteudoPublicado,
  sinal?: AbortSignal,
) {
  sinal?.throwIfAborted()
  const pedido = PedidoDePublicacaoSchema.parse(entrada)
  const manifesto = await lerArquivo({ ...pedido.manifesto, mime: MIME_DO_MANIFESTO }, ler, sinal)
  try {
    const snapshot = await criarSnapshotDePublicacao(pedido, manifesto)
    sinal?.throwIfAborted()
    return { manifesto, snapshot }
  } catch (erro) {
    sinal?.throwIfAborted()
    throw new ConteudoDeCenarioInvalido(
      erro instanceof Error ? erro.message : 'O manifesto é inválido',
    )
  }
}
