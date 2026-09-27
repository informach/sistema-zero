import { describe, expect, it } from 'bun:test'
import { CLOUD_ACCOUNT_COPY, CLOUD_STATUS_COPY, cloudStatusView } from '../src/lib/cloud-status'
import type { CloudSyncState } from '../src/lib/creations-cloud'

/**
 * A ÚNICA tradução do estado da nuvem para a copy da criança (07/09/2026): as ferramentas
 * só desenham o que sai daqui. Trava a tabela inteira + duas regras que morderiam em
 * silêncio: nenhum texto contém "Salvo" (o e2e do Studio usa `getByText('Salvo')` estrito) e
 * nenhum contém travessão (a voz da casa é humana; o scanner do kids não alcança este arquivo
 * porque a copy mora em `src/lib`, então a régua vive aqui).
 */
function state(patch: Partial<CloudSyncState>): CloudSyncState {
  return { status: 'idle', pending: 0, lastSavedAt: null, lastError: null, ...patch }
}

describe('cloudStatusView', () => {
  it('guardando → muted/upload, sem anúncio', () => {
    expect(cloudStatusView(state({ status: 'saving' }))).toEqual({
      tone: 'muted',
      icon: 'upload',
      label: 'Guardando…',
      text: 'Guardando na sua conta…',
      announce: false,
    })
  })

  it('buscando (descida em voo) só sobre idle/saved; guardando vence', () => {
    expect(cloudStatusView(state({ status: 'idle' }), true)?.icon).toBe('download')
    expect(cloudStatusView(state({ status: 'saved' }), true)?.label).toBe('Buscando…')
    expect(cloudStatusView(state({ status: 'saving' }), true)?.icon).toBe('upload')
    expect(cloudStatusView(state({ status: 'offline' }), true)?.icon).toBe('offline')
  })

  it('guardado → ok/cloud com a frase inteira também no rótulo curto', () => {
    const view = cloudStatusView(state({ status: 'saved', lastSavedAt: 1 }))
    expect(view).toMatchObject({ tone: 'ok', icon: 'cloud', announce: false })
    expect(view?.label).toBe('Guardado na sua conta')
    expect(view?.text).toBe('Guardado na sua conta')
  })

  it('sem internet → warn/offline e ANUNCIA', () => {
    expect(cloudStatusView(state({ status: 'offline' }))).toEqual({
      tone: 'warn',
      icon: 'offline',
      label: 'Sem internet agora',
      text: 'Sem internet agora. Vou guardar na sua conta quando voltar.',
      announce: true,
    })
  })

  it('erro → danger/alert com o recado de criança da fila (nunca a mensagem crua)', () => {
    const view = cloudStatusView(
      state({ status: 'error', lastError: 'Sua conta está sem espaço para guardar mais.' }),
    )
    expect(view).toMatchObject({ tone: 'danger', icon: 'alert', announce: true })
    expect(view?.text).toBe('Sua conta está sem espaço para guardar mais.')
    expect(view?.label).toBe('Não consegui guardar')
    // Sem `lastError` (não deveria acontecer) cai na frase própria, não em "undefined".
    expect(cloudStatusView(state({ status: 'error' }))?.text).toBe(CLOUD_STATUS_COPY.error.text)
  })

  it('idle, unsupported e "sem nuvem" não dizem nada', () => {
    expect(cloudStatusView(state({ status: 'idle' }))).toBeNull()
    expect(cloudStatusView(state({ status: 'unsupported' }))).toBeNull()
    expect(cloudStatusView(state({ status: 'unsupported' }), true)).toBeNull()
    expect(cloudStatusView(null)).toBeNull()
    expect(cloudStatusView(null, true)).toBeNull()
  })

  it('nenhuma copy contém "Salvo" nem travessão, e os rótulos curtos cabem numa barra', () => {
    const textos = [
      ...Object.values(CLOUD_STATUS_COPY).flatMap((c) => [c.label, c.text]),
      CLOUD_ACCOUNT_COPY.label,
    ]
    expect(textos.length).toBeGreaterThanOrEqual(11) // anti-vácuo: a tabela existe
    for (const t of textos) {
      expect(t).not.toMatch(/salvo/i)
      expect(t).not.toContain('—')
    }
    for (const c of Object.values(CLOUD_STATUS_COPY)) {
      expect(c.label.length).toBeLessThanOrEqual(22)
    }
  })
})
