import type { CloudSyncState } from './creations-cloud'
import type { HostChromeStatus } from './host-chrome'

/**
 * A ÚNICA tradução do estado da nuvem para copy de criança (era o miolo do antigo
 * `cloud-save-badge.tsx`, que vivia acima da ferramenta). Pura: as ferramentas recebem o
 * resultado pelo contrato `hostChrome` e só desenham.
 *
 * Decisões travadas (18/08): recados de `CLOUD_MESSAGES`, nunca a mensagem crua do
 * servidor; `idle`/`unsupported` não mostram NADA (não é o momento de falar de nuvem);
 * só offline/erro são ANUNCIADOS ao leitor de tela (`announce`) — o guardando↔guardado
 * de cada autosave repetia o recado a cada ciclo; sem botão de tentar de novo (a fila
 * volta sozinha).
 *
 * ⚠️ Nenhum `label`/`text` pode conter a palavra "Salvo": o e2e do Studio
 * (`smoke.spec.ts`) usa `getByText('Salvo')` em modo estrito e um segundo "Salvo" na
 * mesma barra o derrubaria. Travado em `tests/cloud-status.test.ts`.
 */
export interface CloudStatusView extends HostChromeStatus {
  /** Leitor de tela deve anunciar (só offline/erro). */
  announce: boolean
}

export const CLOUD_STATUS_COPY = {
  saving: { label: 'Guardando…', text: 'Guardando na sua conta…' },
  syncing: { label: 'Buscando…', text: 'Buscando o que você guardou na sua conta…' },
  saved: { label: 'Guardado na sua conta', text: 'Guardado na sua conta' },
  offline: {
    label: 'Sem internet agora',
    text: 'Sem internet agora. Vou guardar na sua conta quando voltar.',
  },
  error: { label: 'Não consegui guardar', text: 'Não consegui guardar na sua conta.' },
} as const

export function cloudStatusView(
  state: CloudSyncState | null,
  /** A DESCIDA está em andamento (o host sabe: `pullMissing`/reconcile em voo). */
  syncing = false,
): CloudStatusView | null {
  if (!state) return null
  if (state.status === 'saving') {
    return { tone: 'muted', icon: 'upload', ...CLOUD_STATUS_COPY.saving, announce: false }
  }
  if (syncing && (state.status === 'idle' || state.status === 'saved')) {
    return { tone: 'muted', icon: 'download', ...CLOUD_STATUS_COPY.syncing, announce: false }
  }
  if (state.status === 'saved') {
    return { tone: 'ok', icon: 'cloud', ...CLOUD_STATUS_COPY.saved, announce: false }
  }
  if (state.status === 'offline') {
    return { tone: 'warn', icon: 'offline', ...CLOUD_STATUS_COPY.offline, announce: true }
  }
  if (state.status === 'error') {
    return {
      tone: 'danger',
      icon: 'alert',
      label: CLOUD_STATUS_COPY.error.label,
      text: state.lastError ?? CLOUD_STATUS_COPY.error.text,
      announce: true,
    }
  }
  return null
}
