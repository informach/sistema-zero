import { describe, expect, it, spyOn } from 'bun:test'
import { gameTwoDRuntime } from '../runtime'

/**
 * Os tetos do Jogo 2D avisam (lote 4 da missão, seção 8.4, 21/11/2026): "quando um limite for
 * alcançado, o usuário deve receber uma mensagem clara e não um jogo silenciosamente incompleto".
 * Antes, o 401º sprite de um grupo e as partículas acima de 400 (ou de 80 numa emissão) sumiam
 * sem nenhum recado. Os tetos não mudaram: só passaram a dizer, uma vez por partida.
 */

interface Group {
  items: unknown[]
}
interface Api {
  createGroup: () => Group
  createSprite: (o: Record<string, number>) => unknown
  spawn: (g: Group, o: Record<string, number>) => unknown
  addToGroup: (g: Group, s: unknown) => void
  createEnemyType: (o: Record<string, unknown>) => Group
  spawnEnemy: (t: Group, x: number, y: number) => unknown
  emitParticles: (x: number, y: number, count: number, color?: string) => void
}

function load(): Api {
  const win = {
    addEventListener() {},
    SZGame2D: undefined,
    performance: { now: () => 0 },
  } as unknown as Record<string, unknown>
  new Function('window', 'requestAnimationFrame', gameTwoDRuntime)(win, () => 0)
  return win.SZGame2D as Api
}

function withWarnings(run: (api: Api, warnings: () => string[]) => void) {
  const warn = spyOn(console, 'warn').mockImplementation(() => {})
  try {
    run(load(), () => warn.mock.calls.map((call) => String(call[0])))
  } finally {
    warn.mockRestore()
  }
}

const cheio = (lista: string[]) => lista.filter((texto) => texto.includes('até 400 sprites'))

describe('os tetos do Jogo 2D avisam a criança', () => {
  it('o 401º sprite de um grupo não entra e avisa uma vez', () => {
    withWarnings((api, warnings) => {
      const g = api.createGroup()
      for (let i = 0; i < 400; i++) api.spawn(g, { x: i, y: 0, w: 4, h: 4 })
      expect(g.items.length).toBe(400)
      expect(cheio(warnings())).toHaveLength(0)
      expect(api.spawn(g, { x: 0, y: 0, w: 4, h: 4 })).toBeNull()
      api.addToGroup(g, api.createSprite({ x: 0, y: 0, w: 4, h: 4 }))
      expect(g.items.length).toBe(400)
      expect(cheio(warnings())).toHaveLength(1)
      expect(cheio(warnings())[0]).toContain('Tirar do grupo quem sair da tela')
    })
  })

  it('pôr sprites direto na lista do grupo, no modo Código, também avisa', () => {
    withWarnings((api, warnings) => {
      const g = api.createGroup()
      for (let i = 0; i < 401; i++) g.items.push(api.createSprite({ x: i, y: 0, w: 4, h: 4 }))
      expect(g.items.length).toBe(400)
      expect(cheio(warnings())).toHaveLength(1)
    })
  })

  it('um tipo de inimigo cheio não solta o 401º e avisa', () => {
    withWarnings((api, warnings) => {
      const tipo = api.createEnemyType({ w: 10, h: 10 })
      for (let i = 0; i < 400; i++) api.spawnEnemy(tipo, i, 0)
      expect(tipo.items.length).toBe(400)
      expect(api.spawnEnemy(tipo, 0, 0)).toBeNull()
      expect(cheio(warnings())).toHaveLength(1)
    })
  })

  it('mais de 80 partículas numa emissão e mais de 400 na tela avisam, cada um uma vez', () => {
    withWarnings((api, warnings) => {
      api.emitParticles(0, 0, 50)
      expect(warnings()).toHaveLength(0)
      api.emitParticles(0, 0, 100)
      api.emitParticles(0, 0, 100)
      const emissao = warnings().filter((texto) => texto.includes('no máximo 80'))
      expect(emissao).toHaveLength(1)
      for (let i = 0; i < 6; i++) api.emitParticles(0, 0, 80)
      const tela = warnings().filter((texto) => texto.includes('chegou a 400 partículas'))
      expect(tela).toHaveLength(1)
    })
  })
})
