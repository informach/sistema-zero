import 'server-only'
import { type PalettePreference, readPalette } from '@sistemazero/core/palette'
import { getEnv } from '../lib/env'
import type { ForwardHeaders } from './refresh'

/**
 * Busca a cor do perfil no gateway, para o PROXY hidratar o espelho em cookie antes do render.
 *
 * Roda no máximo uma vez por (aparelho, perfil, validade do cookie): depois disso o dono bate e
 * o proxy nem chega aqui. Gateway fora devolve `'unavailable'`, e quem chama grava um cookie
 * CURTO — a página renderiza na cor da casa e a próxima navegação tenta de novo.
 */
export type PaletteFetchResult = PalettePreference | 'unavailable'

/**
 * ⚠️⚠️ Este é um orçamento de RENDER, não de API. A busca acontece DENTRO do proxy, antes do
 * primeiro byte de HTML: um gateway pendurado vira tempo que a criança passa olhando uma tela
 * branca. Um segundo já é generoso para uma chamada na rede interna, e estourar não custa nada
 * — a página sai na cor da casa e a navegação seguinte tenta de novo.
 */
const TIMEOUT_MS = 1_000

/**
 * ⚠️⚠️ O single-flight vive em `globalThis` via `Symbol.for`, NUNCA em escopo de módulo: o
 * Turbopack separa proxy, RSC e route handlers em bundles com cópias próprias deste arquivo, e
 * um Map de módulo daria uma ida ao gateway POR BUNDLE. A rajada de prefetch RSC de uma
 * navegação é exatamente o caso em que isso apareceria.
 */
const INFLIGHT_KEY = Symbol.for('@sistemazero/community:palette-inflight')

function inflight(): Map<string, Promise<PaletteFetchResult>> {
  const store = globalThis as Record<symbol, unknown>
  let map = store[INFLIGHT_KEY] as Map<string, Promise<PaletteFetchResult>> | undefined
  if (!map) {
    map = new Map()
    store[INFLIGHT_KEY] = map
  }
  return map
}

export function fetchPaletteOnce(
  accessToken: string,
  forward: ForwardHeaders,
): Promise<PaletteFetchResult> {
  const map = inflight()
  const pending = map.get(accessToken)
  if (pending) return pending
  const promise = fetchPalette(accessToken, forward).finally(() => map.delete(accessToken))
  map.set(accessToken, promise)
  return promise
}

async function fetchPalette(
  accessToken: string,
  forward: ForwardHeaders,
): Promise<PaletteFetchResult> {
  try {
    const res = await fetch(new URL('/members/preferences', getEnv().GATEWAY_URL), {
      headers: { authorization: `Bearer ${accessToken}`, ...forward },
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    // ⚠️ Um 4xx aqui NÃO é "sem cor": é sessão/borda recusando. Tratar como `null` gravaria um
    // espelho mentiroso de 6 horas; `unavailable` grava um curto e tenta de novo.
    if (!res.ok) return 'unavailable'
    const data = (await res.json().catch(() => null)) as { palette?: unknown } | null
    return readPalette(data?.palette)
  } catch {
    return 'unavailable'
  }
}
