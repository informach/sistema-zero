import 'server-only'
import {
  criarSnapshotDePublicacao,
  MIME_DO_MANIFESTO,
  PedidoDePublicacaoSchema,
} from '@sistemazero/molda-cenarios-core/publicacao'
import { digestDosBytes } from '@sistemazero/molda-cenarios-core/v2'
import { conferirConteudoCompilado } from '@sistemazero/molda-cenarios-motor/conteudo'
import type { ConteudoDoCenario } from './cenarios-conteudo'

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
    throw Error('Um arquivo da publicação não está no armazenamento.')
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
      throw Error('O tamanho do arquivo armazenado não corresponde à publicação.')
    if (objeto.contentType !== esperado.mime)
      throw Error('O tipo do arquivo armazenado não corresponde à publicação.')
    const bytes = new Uint8Array(esperado.bytes)
    let posicao = 0
    while (true) {
      sinal?.throwIfAborted()
      const parte = await leitor.read()
      sinal?.throwIfAborted()
      if (parte.done) break
      if (parte.value.length > bytes.length - posicao)
        throw Error('O arquivo excede o tamanho declarado no manifesto.')
      bytes.set(parte.value, posicao)
      posicao += parte.value.length
    }
    if (posicao !== bytes.length) throw Error('O arquivo da publicação foi truncado.')
    if ((await digestDosBytes(bytes)) !== esperado.digest)
      throw Error('O hash do arquivo armazenado não corresponde à publicação.')
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
  sinal?.throwIfAborted()
  const pedido = PedidoDePublicacaoSchema.parse(entrada)
  const manifesto = await lerArquivo({ ...pedido.manifesto, mime: MIME_DO_MANIFESTO }, ler, sinal)
  const snapshot = await criarSnapshotDePublicacao(pedido, manifesto)
  sinal?.throwIfAborted()
  const porDigest = new Map<string, Uint8Array>()
  for (const recurso of snapshot.recursos) {
    if (recurso.papel === 'manifesto') continue
    porDigest.set(recurso.digest, await lerArquivo(recurso, ler, sinal))
  }
  const arquivos = new Map(snapshot.cena.arquivos.map((a) => [a.caminho, porDigest.get(a.digest)!]))
  await conferirConteudoCompilado(snapshot.cena, arquivos, sinal)
  sinal?.throwIfAborted()
  return {
    manifesto,
    conferidos: snapshot.recursos.map((r) => ({
      digest: r.digest,
      bytes: r.bytes,
      tipoDoConteudo: r.mime,
    })),
  }
}
