import { describe, expect, it } from 'bun:test'
import { OFFICIAL_CATALOG } from '#official-extensions'
import { lifecycleContractForExtensions } from './lifecycle'

function exposesMethod(source: string, method: string): boolean {
  return (
    new RegExp(`\\b${method}\\s*:`).test(source) ||
    source.includes(`Object.defineProperty(api, '${method}'`)
  )
}

describe('contrato interno de ciclo de vida das extensões oficiais', () => {
  it('é obrigatório, único e implementado pelo bootstrap de cada motor', () => {
    for (const extension of OFFICIAL_CATALOG) {
      const contract = extension.runtime.lifecycle
      expect(contract.extensionId, extension.manifest.id).toBe(extension.manifest.id)
      expect(contract.globalName, extension.manifest.id).toBeTruthy()
      expect(contract.runMethod, extension.manifest.id).toBeTruthy()
      expect(
        exposesMethod(extension.runtime.bootstrapScript, contract.runMethod ?? ''),
        `${extension.manifest.id}: run`,
      ).toBe(true)
      for (const method of [
        contract.bootMethod,
        contract.restartMethod,
        contract.pauseMethod,
        contract.resumeMethod,
        contract.disposeMethod,
      ]) {
        if (method) {
          expect(
            exposesMethod(extension.runtime.bootstrapScript, method),
            `${extension.manifest.id}: ${method}`,
          ).toBe(true)
        }
      }
      expect(lifecycleContractForExtensions([{ extensionId: extension.manifest.id }])).toBe(
        contract,
      )
    }
  })

  it('usa o adapter DOM leve quando não há motor', () => {
    expect(lifecycleContractForExtensions([])).toEqual({ target: 'core' })
  })

  it('recusa IR com mais de um runtime dono do palco', () => {
    expect(() =>
      lifecycleContractForExtensions([
        { extensionId: 'world-3d' },
        { extensionId: 'game-3d-advanced' },
      ]),
    ).toThrow('Extensões de runtime incompatíveis')
  })
})
