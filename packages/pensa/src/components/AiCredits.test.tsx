import { expect, test } from 'bun:test'
import type { AiCreditsView } from '@sistemazero/core/ai-credits'
import { renderHook, waitFor } from '@testing-library/react'
import type { PensaTransport } from '../core/types'
import { usePensaCredits } from './AiCredits'

const CREDITS: AiCreditsView = {
  dayLimit: 50,
  dayRemaining: 13,
  monthLimit: 500,
  monthRemaining: 300,
  monthRenewsOn: '2026-09-01',
}

const transport: PensaTransport = {
  request: async <T,>() => ({ credits: CREDITS }) as T,
}

test('o medidor fala com a criança por padrão e em créditos na comunidade adulta', async () => {
  const kids = renderHook(() => usePensaCredits(transport))
  await waitFor(() => expect(kids.result.current.inline).toBe('✨ 13 ideias hoje'))
  const adult = renderHook(() => usePensaCredits(transport, undefined, undefined, 'adult'))
  await waitFor(() => expect(adult.result.current.inline).toBe('13 créditos hoje'))
})
