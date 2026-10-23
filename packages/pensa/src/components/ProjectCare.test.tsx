import { expect, test } from 'bun:test'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PensaApiError, type PensaTransport } from '../core/types'
import { ProjectCare } from './ProjectCare'
import { PROFILE_ID, projectFixture } from './pensa.fixture'

for (const definitive of [true, false]) {
  test(
    definitive
      ? 'a definitive protection refusal refreshes the view and uses a new request on retry'
      : 'an uncertain protection failure retries the same request identity',
    async () => {
      const view = projectFixture()
      view.gameCreation = {
        tool: 'studio',
        profileId: PROFILE_ID,
        creationId: 'jogo',
        saveRevision: '1',
        contentFingerprint: null,
      }
      const requests: unknown[] = []
      let refreshed = 0
      const transport: PensaTransport = {
        async request<T>(_path: string, init?: { method?: string; body?: unknown }): Promise<T> {
          if (!init?.body) throw new Error('This scenario only sends protection requests')
          requests.push(init.body)
          throw definitive
            ? new PensaApiError('A tentativa foi encerrada.', 409, 'REVISION_CONFLICT')
            : new Error('A conexão caiu.')
        },
      }
      render(
        <ProjectCare
          view={view}
          transport={transport}
          onChanged={async () => {
            refreshed++
          }}
        />,
      )
      const save = screen.getByRole('button', { name: 'Guardar esta versão' })
      fireEvent.click(save)
      await screen.findByRole('alert')
      await waitFor(() => expect(save.hasAttribute('disabled')).toBe(false))
      fireEvent.click(save)
      await waitFor(() => expect(requests).toHaveLength(2))
      if (definitive) {
        expect(requests[1]).not.toEqual(requests[0])
        expect(refreshed).toBe(2)
      } else {
        expect(requests[1]).toEqual(requests[0])
        expect(refreshed).toBe(0)
      }
    },
  )
}
