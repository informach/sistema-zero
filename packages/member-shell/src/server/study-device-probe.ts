import { getEnv } from '../lib/env'

const PROBE_TIMEOUT_MS = 3_000
const DEVICE_TOKEN = /^[A-Za-z0-9_-]{43}$/

/**
 * Este navegador é de ALUNO com uma autorização VIVA? Usado pelo proxy só na raiz `/` sem
 * sessão, para decidir entre a escolha "Quem vai entrar?" e a entrada do aluno. O Auth só
 * reconhece o navegador enquanto ele tem um acesso vivo (sem isso a lista vem vazia).
 * Qualquer falha responde `false`: na dúvida a pessoa vê a escolha, nunca uma lista.
 */
export async function hasLiveStudyDevice(
  deviceToken: string | undefined,
  forward: Record<string, string>,
): Promise<boolean> {
  if (!deviceToken || !DEVICE_TOKEN.test(deviceToken)) return false
  try {
    const res = await fetch(new URL('/auth/kids/device', getEnv().GATEWAY_URL), {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...forward },
      body: JSON.stringify({ deviceToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    if (!res.ok) return false
    const body = (await res.json().catch(() => null)) as { profiles?: unknown } | null
    return Array.isArray(body?.profiles) && body.profiles.length > 0
  } catch {
    return false
  }
}
