import { afterEach, describe, expect, it } from 'bun:test'
import * as THREE from 'three'
import { generateJS } from '#generators'
import type { BehaviorIR } from '#ir'
import { labirintoDosRobosProfissionalExample, mundoDeBlocosProfissionalExample } from '../examples'
import { type KitApi, loadExampleKit } from './kitHarness'
import { stripIds } from './testUtils'

/**
 * ⭐ REGRESSÕES DO FULL REVIEW (Lote C) — nasceram como SONDAS que provaram os
 * bugs contra o motor real (mesma bancada do playthrough) e, com os exemplos
 * corrigidos, viraram o contrato permanente. Cada teste joga o JS GERADO da IR
 * embutida, como a criança joga.
 *
 * O que este arquivo garante (e o que era antes do conserto):
 *  1. Mundo Profissional: clicar no CÉU (ray acima do horizonte) NÃO planta
 *     nada — groundPoint devolve 0 nos dois eixos sem interseção e, antes da
 *     guarda de alcance (|celula − posOf| <= 3 em x E z), nascia um bloco
 *     fantasma na origem, com som e poeira, gastando o teto de 30.
 *  2. Mundo Profissional: no modo reciclar, UM clique recicla exatamente UM
 *     bloco (o primeiro sob o mouse) — antes eram três pick() por molde e um
 *     clique reciclava até 3 blocos ATRAVÉS de oclusão (um por molde).
 *  3. Labirinto Profissional: dois cliques rápidos (< 0,5 s) gastam UM tiro —
 *     antes gastavam DOIS por UM dano (os i-frames de 0,5 s comiam o 2º hit,
 *     mas a zona reciclava o projétil e tocava faísca + som de acerto). O
 *     cooldown proximoTiro (relógio por dt) trava o gatilho.
 */

function jsDoExemplo(example: { ir: { behavior: BehaviorIR } }): string {
  return generateJS({
    behavior: stripIds(example.ir.behavior),
    lifecycle: 'game-3d-advanced',
  })
}

function apertarBotaoDe(stage: Element, screen: string): void {
  const btn = stage.querySelector(`[data-szg3k-screen="${screen}"] button`) as {
    click?: () => void
    dispatchEvent?: (ev: Event) => void
  } | null
  if (!btn) throw new Error(`sem botão na tela "${screen}"`)
  if (btn.click) btn.click()
  else btn.dispatchEvent?.(new Event('click'))
}

function primeiroVivo(api: KitApi, mold: string): unknown {
  let found: unknown = null
  api.forEachAlive(mold, (e) => {
    if (!found) found = e
  })
  return found
}

function tecla(name: string, key: string): void {
  window.dispatchEvent(new KeyboardEvent(name, { key }))
}

afterEach(() => {
  window.dispatchEvent(new Event('pagehide'))
})

describe('Lote C — regressões do full review', () => {
  it('Mundo Profissional: clique no CÉU não planta nada; clique perto do herói planta', async () => {
    const { api, step, stage, renderers } = await loadExampleKit(
      jsDoExemplo(mundoDeBlocosProfissionalExample),
    )
    apertarBotaoDe(stage, 'menu') // "Construir"
    expect(api.state()).toBe('jogando')
    step(90) // a câmera "seguir" converge atrás do herói
    expect(api.countAlive('grama')).toBe(0)

    const canvas = stage.querySelector('canvas')
    if (!canvas) throw new Error('canvas do exemplo não montou')
    // Topo da tela: NDC y = +0,9 — acima do horizonte da câmera de seguir
    // (pitch ~25° para baixo, meia-FOV 30° para cima). O raio sobe, não corta
    // o plano y=0, groundPoint devolve 0 em x E z — a célula (0,0) fica longe
    // do herói (que nasce em z = -4) e a guarda de alcance descarta o clique.
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 0.5, clientY: 0.05 }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))
    step(2)

    // A regressão: NADA nasce (antes: bloco fantasma na origem, com som).
    expect(api.countAlive('grama')).toBe(0)

    // E a guarda NÃO matou a construção: clique no chão AO LADO do herói
    // (célula (0,-2), a 2 do spawn em z = -4) planta normalmente.
    const cam = renderers[0]?.camera
    if (!cam) throw new Error('sem câmera viva')
    const v = new THREE.Vector3(0, 0, -2)
    v.project(cam)
    if (v.z > 1 || Math.abs(v.x) > 0.98 || Math.abs(v.y) > 0.98) {
      throw new Error('o ponto do teste saiu da tela — reposicione o clique')
    }
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: (v.x + 1) / 2,
        clientY: (1 - v.y) / 2,
      }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))
    step(2)
    expect(api.countAlive('grama')).toBe(1)
    const bloco = primeiroVivo(api, 'grama')
    expect(api.posOf(bloco, 'x')).toBeCloseTo(0, 5)
    expect(api.posOf(bloco, 'z')).toBeCloseTo(-2, 5)
  })

  it('Mundo Profissional: no reciclar, UM clique recicla só o bloco DA FRENTE (sem furar oclusão)', async () => {
    const { api, step, stage, renderers } = await loadExampleKit(
      jsDoExemplo(mundoDeBlocosProfissionalExample),
    )
    apertarBotaoDe(stage, 'menu')
    expect(api.state()).toBe('jogando')

    // Dois moldes na MESMA célula (a sobreposição em si é a simplificação já
    // conhecida; a regressão é sobre o CLIQUE ÚNICO remover só UM deles).
    api.spawn('grama', 4, 0, 6)
    api.spawn('pedra', 4, 0, 6)
    step(90) // câmera converge antes de projetar o clique

    tecla('keydown', 'x')
    step(1)
    tecla('keyup', 'x')
    step(1)
    expect(stage.querySelector('.szg3k-hud-top-right')?.textContent).toBe(
      'Modo: reciclar (X troca)',
    )

    const canvas = stage.querySelector('canvas')
    const cam = renderers[0]?.camera
    if (!canvas || !cam) throw new Error('canvas/câmera do exemplo não montou')
    const v = new THREE.Vector3(4, 0.6, 6)
    v.project(cam)
    if (v.z > 1 || Math.abs(v.x) > 0.98 || Math.abs(v.y) > 0.98) {
      throw new Error('o ponto do teste saiu da tela — reposicione o clique')
    }
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true,
        clientX: (v.x + 1) / 2,
        clientY: (1 - v.y) / 2,
      }),
    )
    window.dispatchEvent(new PointerEvent('pointerup'))
    step(2)

    // A regressão: o pick único (sem molde) recicla só o PRIMEIRO sob o mouse,
    // filtrado por isMold — sobra exatamente um dos dois. Antes, o pick por
    // molde enxergava ATRAVÉS da grama e o mesmo clique levava os dois.
    expect(api.countAlive('grama') + api.countAlive('pedra')).toBe(1)
  })

  it('Labirinto Profissional: 2 cliques rápidos = 1 tiro gasto, 1 dano (cooldown de 0,5 s)', async () => {
    const { api, step, stage } = await loadExampleKit(
      jsDoExemplo(labirintoDosRobosProfissionalExample),
    )
    apertarBotaoDe(stage, 'menu') // "Entrar"
    expect(api.state()).toBe('jogando')
    expect(api.countAlive('vigia')).toBe(3)

    const canvas = stage.querySelector('canvas')
    if (!canvas) throw new Error('canvas do exemplo não montou')
    const atirar = (): void => {
      canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      window.dispatchEvent(new PointerEvent('pointerup'))
    }
    const heroi = primeiroVivo(api, 'heroi')
    const alvo = primeiroVivo(api, 'vigia')
    const estacionarOutros = (): void => {
      const outros: unknown[] = []
      for (const mold of ['vigia', 'tanque']) {
        api.forEachAlive(mold, (e) => {
          if (e !== alvo) outros.push(e)
        })
      }
      for (const o of outros) api.place(o, 14, 0, 14)
    }

    // Duelo pinado (a receita do playthrough): alvo a 6 unidades, mira em -Z.
    const pinar = (): void => {
      api.place(alvo, 0, 0, -9)
      estacionarOutros()
      api.place(heroi, 0, 0, -3)
      api.setYaw(heroi, 180)
    }
    pinar()
    step(1)
    atirar() // 1º clique: atira (proximoTiro rearma em 0,5 s)
    pinar()
    step(2)
    atirar() // 2º clique, 2 quadros (~0,07 s) depois: DENTRO do cooldown
    pinar()
    step(2)
    // A regressão: o cooldown ENGOLE o 2º clique — só UM projétil no ar.
    // Antes, os dois tiros nasciam (e o 2º acertava sem dano, só feedback).
    expect(api.countAlive('tiro')).toBe(1)

    // Deixa o projétil voar e resolver (26 u/s, ~7 quadros por 6 u).
    for (let i = 0; i < 28; i++) {
      pinar()
      step(1)
    }
    expect(api.countAlive('tiro')).toBe(0)
    expect(api.countAlive('vigia')).toBe(3)
    expect(api.healthOf(alvo)).toBe(5) // um único −15 nos 20 de vida

    // Passado o cooldown (e a janela de i-frames), o 3º tiro derruba — a
    // trava é só contra o clique afobado, não contra o jogo.
    for (let i = 0; i < 16; i++) {
      pinar()
      step(1)
    }
    atirar()
    for (let i = 0; i < 30 && api.countAlive('vigia') === 3; i++) {
      pinar()
      step(1)
    }
    expect(api.countAlive('vigia')).toBe(2)
  })
})
