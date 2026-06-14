import { afterEach, describe, expect, it } from 'bun:test'
import {
  claimFsOwnership,
  currentFsOwner,
  getProFsMountedProjectId,
  registerProMountTrigger,
  releaseFsOwnership,
  requestProFsMount,
  setProFsMounted,
  waitForProFsMounted,
} from './webContainerClient'

// Token de DONO ÚNICO do FS + sinal de mount pro são estado de módulo PURO
// (sem WebContainer, que não boota no happy-dom). Testamos a lógica de posse e
// do sinal isoladamente. Este arquivo NÃO mocka `webContainerClient` (ao
// contrário de Terminal.test.tsx), então usa as funções reais.

afterEach(() => {
  // Reseta o estado de módulo para não vazar entre testes: libera o dono atual
  // (qualquer que seja), zera o sinal de mount e o gatilho registrado.
  const owner = currentFsOwner()
  if (owner) releaseFsOwnership(owner)
  setProFsMounted(null)
  registerProMountTrigger(null)
})

describe('claimFsOwnership / releaseFsOwnership (dono único do FS)', () => {
  it('o primeiro a reivindicar vira dono; o segundo é recusado', () => {
    const a = Symbol('a')
    const b = Symbol('b')
    expect(claimFsOwnership(a)).toBe(true)
    expect(currentFsOwner()).toBe(a)
    expect(claimFsOwnership(b)).toBe(false)
    expect(currentFsOwner()).toBe(a)
  })

  it('reivindicar de novo com o mesmo dono é idempotente', () => {
    const a = Symbol('a')
    expect(claimFsOwnership(a)).toBe(true)
    expect(claimFsOwnership(a)).toBe(true)
    expect(currentFsOwner()).toBe(a)
  })

  it('soltar o dono libera o FS para outra instância', () => {
    const a = Symbol('a')
    const b = Symbol('b')
    expect(claimFsOwnership(a)).toBe(true)
    expect(claimFsOwnership(b)).toBe(false)
    releaseFsOwnership(a)
    expect(currentFsOwner()).toBeNull()
    expect(claimFsOwnership(b)).toBe(true)
    expect(currentFsOwner()).toBe(b)
  })

  it('soltar quem NÃO é dono é no-op (não desloga o dono real)', () => {
    const a = Symbol('a')
    const b = Symbol('b')
    expect(claimFsOwnership(a)).toBe(true)
    releaseFsOwnership(b)
    expect(currentFsOwner()).toBe(a)
  })
})

describe('sinal de FS pro montado', () => {
  it('waitForProFsMounted resolve na hora se já está montado para o projeto', async () => {
    setProFsMounted('p1')
    expect(getProFsMountedProjectId()).toBe('p1')
    let resolved = false
    await waitForProFsMounted('p1').then(() => {
      resolved = true
    })
    expect(resolved).toBe(true)
  })

  it('waitForProFsMounted espera até o mount do projeto correto', async () => {
    let resolved = false
    const pending = waitForProFsMounted('p2').then(() => {
      resolved = true
    })
    // Montar OUTRO projeto não resolve a espera de p2.
    setProFsMounted('outro')
    await Promise.resolve()
    expect(resolved).toBe(false)
    // Montar p2 resolve.
    setProFsMounted('p2')
    await pending
    expect(resolved).toBe(true)
  })

  it('setProFsMounted(null) invalida o sinal (não resolve esperas)', async () => {
    let resolved = false
    void waitForProFsMounted('p3').then(() => {
      resolved = true
    })
    setProFsMounted(null)
    await Promise.resolve()
    expect(getProFsMountedProjectId()).toBeNull()
    expect(resolved).toBe(false)
  })
})

describe('gatilho de mount pro (registerProMountTrigger / requestProFsMount)', () => {
  it('requestProFsMount aciona o gatilho registrado', () => {
    let calls = 0
    registerProMountTrigger(() => {
      calls += 1
    })
    requestProFsMount()
    requestProFsMount()
    expect(calls).toBe(2)
  })

  it('requestProFsMount é no-op sem provider registrado', () => {
    registerProMountTrigger(null)
    expect(() => requestProFsMount()).not.toThrow()
  })

  it('o Terminal pro: pedir mount + esperar resolve quando o provider monta', async () => {
    // Simula o escritor único: ao ser acionado, monta o FS do projeto.
    registerProMountTrigger(() => setProFsMounted('proj'))
    let resolved = false
    const pending = waitForProFsMounted('proj').then(() => {
      resolved = true
    })
    // Antes de pedir, ainda não montou.
    await Promise.resolve()
    expect(resolved).toBe(false)
    // Pede o mount (como o Terminal pro faz) → gatilho monta → espera resolve.
    requestProFsMount()
    await pending
    expect(resolved).toBe(true)
  })
})
