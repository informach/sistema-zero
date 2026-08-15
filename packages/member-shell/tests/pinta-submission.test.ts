import { describe, expect, mock, test } from 'bun:test'
import { preparePintaSubmission } from '../src/lib/pinta-submission'

describe('preparePintaSubmission', () => {
  test('save=false aborta antes de ler ou serializar o desenho', async () => {
    const getAsset = mock(() => ({ id: 'asset' }))
    const toWire = mock((asset: unknown) => asset)

    const result = await preparePintaSubmission({ save: async () => false, getAsset }, toWire)

    expect(result).toEqual({ ok: false })
    expect(getAsset).not.toHaveBeenCalled()
    expect(toWire).not.toHaveBeenCalled()
  })

  test('save=true lê a revisão confirmada e devolve o payload wire', async () => {
    const asset = { id: 'asset' }
    const wire = { id: 'asset', encoded: true }
    const result = await preparePintaSubmission(
      { save: async () => true, getAsset: () => asset },
      (value) => (value === asset ? wire : null),
    )

    expect(result).toEqual({ ok: true, asset: wire })
  })
})
