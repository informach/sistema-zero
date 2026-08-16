import { afterEach, describe, expect, mock, test } from 'bun:test'
import { render, screen } from '@testing-library/react'
import { RoomBuilder } from '../src/components/kids/room/room-builder'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
})

describe('construtor do quarto', () => {
  test('mantém a recuperação visível quando a carga inicial falha', async () => {
    globalThis.fetch = Object.assign(
      mock(async () => Promise.reject(new TypeError('offline'))),
      {
        preconnect: originalFetch.preconnect,
      },
    )

    render(<RoomBuilder />)

    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeTruthy()
  })
})
