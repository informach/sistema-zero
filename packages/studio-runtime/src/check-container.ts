/**
 * O contêiner da verificação dos objetivos (23/11/2026). Antes, cada "Verificar projeto" ligava um
 * contêiner novo com nome sorteado e o destruía no fim: a criança pagava a subida a cada clique.
 * Agora cada quem pede (o `executionId`, que o Members tira do perfil da criança) tem o seu, que
 * dorme sozinho depois de `CHECK_SANDBOX_SLEEP_AFTER` parado. O aquecimento (`/v1/check/warm`) liga
 * o MESMO contêiner quando a criança abre a parte.
 *
 * Teste que deu certo apaga só a própria pasta; qualquer falha destrói o contêiner, como antes:
 * um Chromium preso nunca fica para o próximo teste da criança.
 */

export const CHECK_SANDBOX_SLEEP_AFTER = '5m'

export const CHECK_SANDBOX_OPTIONS = {
  enableDefaultSession: false,
  transport: 'rpc',
  sleepAfter: CHECK_SANDBOX_SLEEP_AFTER,
} as const

/** O build hospedado usa o `executionId` cru como nome: o prefixo separa os dois contêineres. */
export function checkSandboxId(executionId: string): string {
  return `objetivos-${executionId}`
}

/** Abre e fecha o Chromium da imagem uma vez, para o primeiro teste não pagar a leitura a frio. */
export const CHECK_WARM_COMMAND = 'node /opt/sz-runtime/check-warm.mjs'
export const CHECK_WARM_TIMEOUT_MS = 45_000

interface CheckSandbox {
  exec(command: string, options: { timeout: number }): Promise<{ success: boolean }>
  destroy(): Promise<unknown>
}

export async function finishCheckSandbox(
  sandbox: CheckSandbox,
  cwd: string,
  reusable: boolean,
): Promise<void> {
  if (reusable) {
    const cleaned = await sandbox
      .exec(`rm -rf -- '${cwd}'`, { timeout: 5_000 })
      .then((result) => result.success)
      .catch(() => false)
    if (cleaned) return
  }
  await sandbox.destroy().catch(() => undefined)
}

/** Corpo do aquecimento: `{executionId, threeD}`. O nome segue a régua do pedido de verificação. */
export function readCheckWarmRequest(
  value: unknown,
  isExecutionId: (id: unknown) => id is string,
): { executionId: string; threeD: boolean } | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const { executionId, threeD, ...rest } = value as Record<string, unknown>
  if (Object.keys(rest).length || !isExecutionId(executionId) || typeof threeD !== 'boolean')
    return null
  return { executionId, threeD }
}
