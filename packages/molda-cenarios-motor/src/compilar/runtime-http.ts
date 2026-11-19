import {
  lerCenaCompilada,
  MAX_BYTES_DO_MANIFESTO,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import { carregarCenaNoThree, type OpcoesDoRuntimeCompilado } from './runtime-three'

async function lerLimitado(url: URL, maximo: number, sinal: AbortSignal): Promise<Uint8Array> {
  sinal.throwIfAborted()
  const r = await fetch(url, { signal: sinal, credentials: 'omit', redirect: 'error' })
  if (!r.ok || !r.body) {
    await r.body?.cancel()
    throw Error(`Não consegui ler o arquivo do cenário (${r.status}).`)
  }
  const tamanho = r.headers.get('content-length')
  if (tamanho !== null && (!/^\d+$/.test(tamanho) || Number(tamanho) > maximo)) {
    await r.body.cancel()
    throw Error('O arquivo do cenário excede o tamanho permitido.')
  }
  const leitor = r.body.getReader(),
    blocos: Uint8Array[] = []
  let bytes = 0
  try {
    for (;;) {
      sinal.throwIfAborted()
      const { done, value } = await leitor.read()
      if (done) break
      bytes += value.byteLength
      if (bytes > maximo) throw Error('O arquivo do cenário excede o tamanho permitido.')
      blocos.push(value)
    }
  } catch (erro) {
    await leitor.cancel().catch(() => {})
    throw erro
  } finally {
    leitor.releaseLock()
  }
  sinal.throwIfAborted()
  const dados = new Uint8Array(bytes)
  let offset = 0
  for (const b of blocos) {
    dados.set(b, offset)
    offset += b.length
  }
  return dados
}

/** Só acessa arquivos relativos do pacote, sem cookies, redirecionamentos ou sessão da plataforma. */
export async function lerPacoteDoEndereco(
  endereco: string | URL,
  sinal: AbortSignal,
): Promise<PacoteCompilado> {
  const url = new URL(endereco)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw Error('Abra o manifesto em um servidor HTTP sem credenciais ou parâmetros de sessão.')
  const texto = new TextDecoder('utf-8', { fatal: true }).decode(
      await lerLimitado(url, MAX_BYTES_DO_MANIFESTO, sinal),
    ),
    cena = lerCenaCompilada(JSON.parse(texto)),
    arquivos = new Map<string, Uint8Array>(),
    base = new URL('.', url)
  // A conferência de hashes, binários e imagens ocorre antes da instanciação do runtime.
  // Leitura sequencial limita memória/transientes e permite cancelar entre recursos.
  for (const a of cena.arquivos) {
    const dados = await lerLimitado(new URL(a.caminho, base), a.bytes, sinal)
    if (dados.length !== a.bytes) throw Error(`O arquivo “${a.caminho}” está incompleto.`)
    arquivos.set(a.caminho, dados)
  }
  sinal.throwIfAborted()
  return { cena, arquivos }
}

export async function carregarCenaDoEndereco(
  endereco: string | URL,
  sinal: AbortSignal,
  opcoes: OpcoesDoRuntimeCompilado = {},
) {
  return carregarCenaNoThree(await lerPacoteDoEndereco(endereco, sinal), sinal, opcoes)
}
