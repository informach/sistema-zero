import type { ProRunPhase } from '../../state/proRun'

/**
 * A pílula de estado do palco, igual no Pro e no clássico (redesenho de 11/2026): uma tabela
 * só de cores e palavras para a fase de execução. Verde rodando, azul preparando, cinza parado,
 * amarelo esperando, vermelho parou com um problema.
 */
export const STAGE_PILL: Record<ProRunPhase, { tone: string; key: string }> = {
  idle: { tone: 'sz-pro-pill--quiet', key: 'run.status.idle' },
  preparing: { tone: 'sz-pro-pill--prep', key: 'run.status.preparing' },
  running: { tone: 'sz-pro-pill--run', key: 'run.status.running' },
  waiting: { tone: 'sz-pro-pill--wait', key: 'run.status.waiting' },
  done: { tone: 'sz-pro-pill--done', key: 'run.status.done' },
  error: { tone: 'sz-pro-pill--error', key: 'run.status.error' },
  unsupported: { tone: 'sz-pro-pill--error', key: 'run.status.unsupported' },
}
