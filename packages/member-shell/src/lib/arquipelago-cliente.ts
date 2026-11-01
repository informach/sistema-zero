import {
  arquivoDoCanal,
  CANAIS_DO_CLIENTE,
  type CanalDoCliente,
  ManifestoDoClienteSchema,
  PonteiroDoCanalSchema,
  pastaDaVersao,
  versaoCompativel,
} from '@sistemazero/arquipelago-contracts'

/**
 * De onde o jogo vem (lacunas, 01/11/2026, a publicação separada). Com o CDN configurado no
 * ambiente (`NEXT_PUBLIC_ARQUIPELAGO_CDN`, a origem pública do balde), a página lê o canal
 * (`NEXT_PUBLIC_ARQUIPELAGO_CANAL`: `estavel`, o padrão, ou `teste`) e importa a entrada da versão
 * para a qual ele aponta. Sem CDN, segue o manifesto que o serviço do jogo publica, como antes.
 */
export interface OrigemDoCliente {
  cdn: string
  canal: CanalDoCliente
}

export function origemDoCliente(
  env: { cdn?: string; canal?: string } = {
    cdn: process.env.NEXT_PUBLIC_ARQUIPELAGO_CDN,
    canal: process.env.NEXT_PUBLIC_ARQUIPELAGO_CANAL,
  },
): OrigemDoCliente | null {
  const cdn = env.cdn?.trim()
  if (!cdn) return null
  let url: URL
  try {
    url = new URL(cdn)
  } catch {
    return null
  }
  // Só uma origem https, sem caminho, busca ou credenciais: o jogo é código que a página executa.
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    return null
  if (url.pathname !== '/' && url.pathname !== '') return null
  const canal = (CANAIS_DO_CLIENTE as readonly string[]).includes(env.canal ?? '')
    ? (env.canal as CanalDoCliente)
    : 'estavel'
  return { cdn: url.origin, canal }
}

/**
 * A URL da entrada do jogo: pelo canal no CDN ou pelo manifesto do serviço. `null` quando não há
 * versão aceita (manifesto ou ponteiro ilegível, ou contrato fora da janela).
 */
export async function localizarEntrada(
  origem: OrigemDoCliente | null,
  base: string,
  buscar: typeof fetch = fetch,
): Promise<string | null> {
  if (origem) {
    const r = await buscar(`${origem.cdn}/${arquivoDoCanal(origem.canal)}`, { cache: 'no-store' })
    if (!r.ok) return null
    const ponteiro = PonteiroDoCanalSchema.safeParse(await r.json().catch(() => null))
    if (!ponteiro.success || ponteiro.data.canal !== origem.canal) return null
    if (!versaoCompativel(ponteiro.data.versaoContrato)) return null
    return `${origem.cdn}/${pastaDaVersao(ponteiro.data.versao)}${ponteiro.data.entrada}`
  }
  const r = await buscar(`${base}/cliente/manifesto.json`, { cache: 'no-store' })
  if (!r.ok) return null
  const manifesto = ManifestoDoClienteSchema.safeParse(await r.json().catch(() => null))
  // A atual e a anterior valem (A35): o jogo e a plataforma sobem em dias diferentes.
  if (!manifesto.success || !versaoCompativel(manifesto.data.versaoContrato)) return null
  return `${base}/cliente/${manifesto.data.entrada}`
}
