import { afterEach, describe, expect, it } from 'bun:test'
import type { WebContainer } from '@webcontainer/api'
import {
  CLASSIC_TEMPLATE_ID,
  claimFsOwnership,
  currentFsOwner,
  getMountedTemplateId,
  getProFsMountedProjectId,
  registerProMountTrigger,
  releaseFsOwnership,
  requestProFsMount,
  resetWebContainerFs,
  setMountedTemplateId,
  setProFsMounted,
  waitForProFsMounted,
} from './webContainerClient'

// Token de DONO ÚNICO do FS + sinal de mount pro são estado de módulo PURO
// (sem WebContainer, que não boota no happy-dom). Testamos a lógica de posse e
// do sinal isoladamente. Este arquivo NÃO mocka `webContainerClient` (ao
// contrário de Terminal.test.tsx), então usa as funções reais.

afterEach(() => {
  // Reseta o estado de módulo para não vazar entre testes: libera o dono atual
  // (qualquer que seja), zera o sinal de mount, o gatilho e o template montado.
  const owner = currentFsOwner()
  if (owner) releaseFsOwnership(owner)
  setProFsMounted(null)
  registerProMountTrigger(null)
  setMountedTemplateId(null)
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
  it('waitForProFsMounted resolve na hora (com true) se já está montado para o projeto', async () => {
    setProFsMounted('p1')
    expect(getProFsMountedProjectId()).toBe('p1')
    await expect(waitForProFsMounted('p1')).resolves.toBe(true)
  })

  it('waitForProFsMounted resolve com FALSE (não rejeita) ao expirar o timeout', async () => {
    // Ninguém monta `nunca`: o escritor único pode estar busy e jamais publicar o
    // sinal. Com timeout curto a espera resolve false (sinal de ocupado) em vez de
    // girar para sempre. Timer real (sem fake timers nesta suíte).
    await expect(waitForProFsMounted('nunca', 5)).resolves.toBe(false)
  })

  it('mount que chega ANTES do timeout vence a corrida (resolve true)', async () => {
    const pending = waitForProFsMounted('p9', 1000)
    setProFsMounted('p9')
    await expect(pending).resolves.toBe(true)
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

  it('setMountedTemplateId / getMountedTemplateId rastreiam o template montado', () => {
    expect(getMountedTemplateId()).toBeNull()
    setMountedTemplateId('react-ts')
    expect(getMountedTemplateId()).toBe('react-ts')
    setMountedTemplateId(CLASSIC_TEMPLATE_ID)
    expect(getMountedTemplateId()).toBe(CLASSIC_TEMPLATE_ID)
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

describe('resetWebContainerFs — preservação de node_modules por template', () => {
  // FS falso: lista as entradas da raiz e registra quais foram apagadas.
  function fakeWc(entries: string[]) {
    const removed: string[] = []
    const wc = {
      fs: {
        readdir: async (_path: string, _opts: { withFileTypes: true }) =>
          entries.map((name) => ({ name })),
        rm: async (path: string) => {
          removed.push(path)
        },
      },
    } as unknown as WebContainer
    return { wc, removed }
  }

  it('sem templateId (compat): preserva node_modules', async () => {
    const { wc, removed } = fakeWc(['src', 'node_modules', 'package.json'])
    await resetWebContainerFs(wc)
    expect(removed).toContain('/src')
    expect(removed).toContain('/package.json')
    expect(removed).not.toContain('/node_modules')
  })

  it('template IGUAL ao montado: preserva node_modules (evita reinstalar)', async () => {
    setMountedTemplateId('react-ts')
    const { wc, removed } = fakeWc(['src', 'node_modules'])
    await resetWebContainerFs(wc, { templateId: 'react-ts' })
    expect(removed).toContain('/src')
    expect(removed).not.toContain('/node_modules')
  })

  it('template DIFERENTE do montado: apaga node_modules (não envenena o npm install)', async () => {
    setMountedTemplateId('react-ts')
    const { wc, removed } = fakeWc(['src', 'node_modules'])
    await resetWebContainerFs(wc, { templateId: 'vanilla-vite' })
    expect(removed).toContain('/src')
    expect(removed).toContain('/node_modules')
  })

  it('pro → classic: apaga node_modules do template pro', async () => {
    setMountedTemplateId('react-ts')
    const { wc, removed } = fakeWc(['index.html', 'node_modules'])
    await resetWebContainerFs(wc, { templateId: CLASSIC_TEMPLATE_ID })
    expect(removed).toContain('/node_modules')
  })

  it('classic → classic: preserva node_modules (mesmo sentinela)', async () => {
    setMountedTemplateId(CLASSIC_TEMPLATE_ID)
    const { wc, removed } = fakeWc(['index.html', 'node_modules'])
    await resetWebContainerFs(wc, { templateId: CLASSIC_TEMPLATE_ID })
    expect(removed).not.toContain('/node_modules')
  })
})
