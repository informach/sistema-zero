import type { CenariosHost } from '@sistemazero/molda-cenarios/oficina/autoria'
import { criarHostHttp } from '@sistemazero/molda-cenarios/oficina/host-http'

/**
 * Cliente da oficina de cenários para agentes. É o MESMO cliente que a oficina usa no navegador
 * (`criarHostHttp`), falando com o servidor do app (`/api/cenarios`), com o token de acesso no
 * cabeçalho `Authorization` em vez do cookie. Assim o agente faz o caminho da mão inteiro:
 * reserva, envio direto ao armazenamento e conferência das peças do relevo, e o lote de
 * comandos com a revisão esperada. Não precisa de aba aberta.
 */

export interface AcessoDaOficina {
  /** O endereço do app que serve a oficina (o da comunidade adulta para a equipe). */
  app: string
  /** O gateway da plataforma: só para entrar com e-mail e senha ou renovar o token. */
  gateway?: string
  /** Um token de acesso já emitido (vale pouco tempo), ou o e-mail e a senha de quem é da equipe. */
  token?: string
  email?: string
  senha?: string
}

type Buscar = (endereco: string, opcoes?: RequestInit) => Promise<Response>

/** Confere um endereço de serviço: HTTPS fora do computador local, sem usuário, consulta ou âncora. */
function enderecoDeServico(valor: string, nome: string): string {
  const url = new URL(valor)
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw Error(`O endereço ${nome} é inválido`)
  if (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    throw Error(`Use HTTPS no endereço ${nome} fora do computador local`)
  return url.toString().replace(/\/$/, '')
}

export function criarClienteDaOficina(
  acesso: AcessoDaOficina,
  buscar: Buscar = (endereco, opcoes) => fetch(endereco, opcoes),
): { host: CenariosHost; app: string; baixar(endereco: string): Promise<Uint8Array> } {
  const app = enderecoDeServico(acesso.app, 'do app')
  const gateway = acesso.gateway ? enderecoDeServico(acesso.gateway, 'do gateway') : null
  if (!acesso.token && !(acesso.email && acesso.senha))
    throw Error('Informe um token de acesso, ou o e-mail e a senha de uma conta da equipe')
  if (!acesso.token && !gateway)
    throw Error('Para entrar com e-mail e senha, informe também o endereço do gateway')

  let token = acesso.token ?? null
  let renovacao: string | null = null
  let entrando: Promise<void> | null = null

  async function autenticar(caminho: string, corpo: unknown): Promise<boolean> {
    if (!gateway) return false
    const resposta = await buscar(`${gateway}${caminho}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(corpo),
      redirect: 'error',
      signal: AbortSignal.timeout(20_000),
    })
    const lido = (await resposta.json().catch(() => null)) as {
      tokens?: { accessToken?: unknown; refreshToken?: unknown }
    } | null
    const tokens = lido?.tokens
    if (!resposta.ok || typeof tokens?.accessToken !== 'string') return false
    token = tokens.accessToken
    renovacao = typeof tokens.refreshToken === 'string' ? tokens.refreshToken : null
    return true
  }
  /** Entra (ou renova) uma vez só, mesmo com vários pedidos esperando. */
  function entrar(): Promise<void> {
    entrando ??= (async () => {
      try {
        if (renovacao && (await autenticar('/auth/refresh', { refreshToken: renovacao }))) return
        if (!acesso.email || !acesso.senha)
          throw Error('O token de acesso venceu. Gere outro ou informe e-mail e senha.')
        if (!(await autenticar('/auth/login', { email: acesso.email, password: acesso.senha })))
          throw Error('Não consegui entrar com este e-mail e esta senha')
      } finally {
        entrando = null
      }
    })()
    return entrando
  }

  /** Os pedidos ao app levam o token; um 401 renova uma vez e repete o MESMO pedido. */
  const comToken: Buscar = async (endereco, opcoes = {}) => {
    if (!token) await entrar()
    const enviar = () => {
      const cabecalhos = new Headers(opcoes.headers)
      cabecalhos.set('authorization', `Bearer ${token}`)
      return buscar(endereco, { ...opcoes, headers: cabecalhos, redirect: 'error' })
    }
    const resposta = await enviar()
    if (resposta.status !== 401 || (!renovacao && !(acesso.email && acesso.senha))) return resposta
    await entrar()
    return enviar()
  }

  /** Um arquivo do app (o retrato de uma revisão): pede o endereço assinado e baixa direto. */
  async function baixar(endereco: string): Promise<Uint8Array> {
    if (!endereco.startsWith(`${app}/api/cenarios/`)) throw Error('Endereço de arquivo inesperado')
    const resposta = await comToken(`${endereco}?como=endereco`, {
      headers: { accept: 'application/json' },
    })
    const lido = (await resposta.json().catch(() => null)) as { url?: unknown } | null
    if (!resposta.ok || typeof lido?.url !== 'string')
      throw Error('Não consegui o endereço da imagem.')
    const arquivo = await buscar(lido.url, { redirect: 'error' })
    if (!arquivo.ok) throw Error('Não consegui baixar a imagem.')
    return new Uint8Array(await arquivo.arrayBuffer())
  }

  return {
    app,
    baixar,
    host: criarHostHttp({
      base: `${app}/api/cenarios`,
      buscar: comToken,
      // O envio ao armazenamento vai por endereço assinado: nunca leva o token.
      enviar: buscar,
    }),
  }
}

/** Lê o acesso do ambiente. Nada de segredo em arquivo do repositório nem em documento. */
export function lerAcessoDaOficina(
  ambiente: Record<string, string | undefined> = process.env,
): AcessoDaOficina {
  const app = ambiente.MOLDA_CENARIOS_APP
  if (!app)
    throw Error('Informe MOLDA_CENARIOS_APP (o endereço do app que serve a oficina de cenários)')
  return {
    app,
    ...(ambiente.MOLDA_CENARIOS_GATEWAY ? { gateway: ambiente.MOLDA_CENARIOS_GATEWAY } : {}),
    ...(ambiente.MOLDA_CENARIOS_TOKEN ? { token: ambiente.MOLDA_CENARIOS_TOKEN } : {}),
    ...(ambiente.MOLDA_CENARIOS_EMAIL ? { email: ambiente.MOLDA_CENARIOS_EMAIL } : {}),
    ...(ambiente.MOLDA_CENARIOS_SENHA ? { senha: ambiente.MOLDA_CENARIOS_SENHA } : {}),
  }
}
