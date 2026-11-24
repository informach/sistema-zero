import {
  lerCenaCompilada,
  MAX_BYTES_DO_MANIFESTO,
  type PacoteCompilado,
} from '@sistemazero/molda-cenarios-core/compilar'
import { lerBytesDoCenario } from './leitura-http'
import { carregarCenaNoThree, type OpcoesDoRuntimeCompilado } from './runtime-three'

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
      await lerBytesDoCenario(url, MAX_BYTES_DO_MANIFESTO, sinal),
    ),
    cena = lerCenaCompilada(JSON.parse(texto)),
    arquivos = new Map<string, Uint8Array>(),
    base = new URL('.', url)
  // A conferência de hashes, binários e imagens ocorre antes da instanciação do runtime.
  // Leitura sequencial limita memória/transientes e permite cancelar entre recursos.
  for (const a of cena.arquivos) {
    const dados = await lerBytesDoCenario(new URL(a.caminho, base), a.bytes, sinal)
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
