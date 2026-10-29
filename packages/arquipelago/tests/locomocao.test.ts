import { describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AnimationMixer, type Bone, Group, type Object3D, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {
  AR_PARA_ATERRISSAR,
  CICLO_DA_ESCADA,
  CICLO_DE_ANDAR,
  CICLO_DE_CORRER,
  CICLO_DE_ESCALAR,
  CICLOS_POR_SEGUNDO_MAXIMO,
  CLIPES,
  ciclosPorSegundo,
  criarLocomocao,
  DURACAO_DA_ATERRISSAGEM,
  DURACAO_DA_CORDA,
  DURACAO_DA_MONTARIA,
  DURACAO_DO_DEITAR,
  DURACAO_DO_PARADO,
  DURACAO_DO_PLANAR,
  DURACAO_DO_SENTAR,
  type EntradaDaLocomocao,
  passoDaLocomocao,
  pesosNoChao,
  VELOCIDADE_DO_ANDAR,
  VELOCIDADE_DO_CORRER,
} from '../src/sistemas/locomocao'

const soma = (p: Record<string, number>) => Object.values(p).reduce((a, b) => a + b, 0)
const chao = (velocidade: number): EntradaDaLocomocao => ({
  velocidade,
  noChao: true,
  velY: 0,
  nadando: false,
  especial: null,
})

function rodar(l = criarLocomocao(), e: EntradaDaLocomocao, segundos: number) {
  for (let t = 0; t < segundos; t += 1 / 60) passoDaLocomocao(l, e, 1 / 60)
  return l
}

describe('pesos no chão', () => {
  test('parado é só o Parado; andar e correr nas velocidades dos clipes', () => {
    expect(pesosNoChao(0)).toEqual({ Parado: 1, Andar: 0, Correr: 0 })
    const andar = pesosNoChao(VELOCIDADE_DO_ANDAR)
    expect(andar.Andar).toBeCloseTo(1)
    expect(pesosNoChao(VELOCIDADE_DO_CORRER).Correr).toBeCloseTo(1)
    for (const v of [0.3, 1, 2.2, 3, 4.6, 7]) expect(soma(pesosNoChao(v))).toBeCloseTo(1)
  })

  test('a fase anda pela distância: na velocidade do clipe, um ciclo por duração', () => {
    expect(ciclosPorSegundo(VELOCIDADE_DO_ANDAR)).toBeCloseTo(1 / CICLO_DE_ANDAR.duracao, 3)
    expect(ciclosPorSegundo(VELOCIDADE_DO_CORRER)).toBeCloseTo(1 / CICLO_DE_CORRER.duracao, 3)
    // Muito rápido: as pernas não giram além do máximo (a passada estica).
    expect(ciclosPorSegundo(20)).toBe(CICLOS_POR_SEGUNDO_MAXIMO)
  })
})

describe('máquina de estados', () => {
  test('os pesos somam 1 e chegam ao alvo no tempo da transição', () => {
    const l = rodar(undefined, chao(4.6), 0.5)
    expect(l.pesos.Correr).toBeCloseTo(1)
    expect(soma(l.pesos)).toBeCloseTo(1)
    rodar(l, chao(0), 0.5)
    expect(l.pesos.Parado).toBeCloseTo(1)
  })

  test('pulo: sai do chão subindo, vira queda ao descer e aterrissa', () => {
    const l = rodar(undefined, chao(0), 0.3)
    passoDaLocomocao(
      l,
      { velocidade: 0, noChao: false, velY: 8, nadando: false, especial: null },
      1 / 60,
    )
    expect(l.pulou).toBe(true)
    rodar(l, { velocidade: 0, noChao: false, velY: 4, nadando: false, especial: null }, 0.2)
    expect(l.pesos.Pulo).toBeGreaterThan(0.9)
    rodar(l, { velocidade: 0, noChao: false, velY: -6, nadando: false, especial: null }, 0.3)
    expect(l.pesos.Queda).toBeGreaterThan(0.9)
    passoDaLocomocao(l, chao(0), 1 / 60)
    expect(l.pesos.Aterrissagem).toBeGreaterThan(0.8)
    rodar(l, chao(0), 0.6)
    expect(l.pesos.Aterrissagem).toBe(0)
    expect(l.pesos.Parado).toBeCloseTo(1)
  })

  test('descer um degrau (pouco tempo no ar) não troca a animação nem aterrissa', () => {
    const l = rodar(undefined, chao(2.2), 0.5)
    rodar(l, { velocidade: 2.2, noChao: false, velY: -2, nadando: false, especial: null }, 0.1)
    expect(l.pesos.Queda).toBe(0)
    passoDaLocomocao(l, chao(2.2), 1 / 60)
    expect(l.noAr).toBe(0)
    expect(l.pesos.Aterrissagem).toBe(0)
    expect(AR_PARA_ATERRISSAR).toBeGreaterThan(0.1)
  })

  test('pendurada no cipó: agarrada na corda, e soltar cai e aterrissa', () => {
    const l = rodar(
      undefined,
      { velocidade: 0, noChao: true, velY: 0, nadando: false, especial: 'cipo' },
      0.5,
    )
    expect(l.pesos.Corda).toBeCloseTo(1)
    rodar(l, { velocidade: 3, noChao: false, velY: -5, nadando: false, especial: null }, 0.5)
    expect(l.pesos.Queda).toBeGreaterThan(0.9)
    passoDaLocomocao(l, chao(0), 1 / 60)
    expect(l.pesos.Aterrissagem).toBeGreaterThan(0)
  })

  test('no tronco: o ciclo de subir anda pela distância na casca e para quando ela para', () => {
    const subindo = {
      velocidade: 1.7,
      noChao: true,
      velY: 0,
      nadando: false,
      especial: 'escalada' as const,
    }
    const l = rodar(undefined, subindo, 0.5)
    expect(l.pesos.Escalar).toBeCloseTo(1)
    const antes = l.tempos.Escalar
    rodar(l, { ...subindo, velocidade: 0 }, 0.5)
    expect(l.tempos.Escalar).toBeCloseTo(antes)
    rodar(l, subindo, CICLO_DE_ESCALAR.passada / 1.7 / 2)
    expect((l.tempos.Escalar - antes + 1) % 1).toBeCloseTo(0.5, 1)
  })

  test('na água: nadando para a frente dá braçadas; parada, boia batendo as pernas', () => {
    const agua = { velocidade: 2.6, noChao: false, velY: 0, nadando: true, especial: null }
    const l = rodar(undefined, agua, 1)
    expect(l.pesos.Nado).toBeCloseTo(1)
    expect(soma(l.pesos)).toBeCloseTo(1)
    rodar(l, { ...agua, velocidade: 0 }, 1)
    expect(l.pesos.NadoParado).toBeCloseTo(1)
    expect(soma(l.pesos)).toBeCloseTo(1)
  })

  test('cada modo especial tem o clipe dele (planador, montaria, descanso, tronco caído)', () => {
    const modo = (especial: EntradaDaLocomocao['especial'], velocidade = 0) =>
      rodar(undefined, { velocidade, noChao: true, velY: 0, nadando: false, especial }, 1).pesos
    expect(modo('planar').Planar).toBeCloseTo(1)
    expect(modo('montar').Montar).toBeCloseTo(1)
    expect(modo('sentar').Sentar).toBeCloseTo(1)
    expect(modo('deitar').Deitar).toBeCloseTo(1)
    expect(modo('escada', 0.5).SubirEscada).toBeCloseTo(1)
    // No tronco caído: parada se equilibra; andando, um pé na frente do outro.
    expect(modo('equilibrio').Equilibrar).toBeCloseTo(1)
    expect(modo('equilibrio', 0.8).Andar).toBeCloseTo(1)
  })
})

// ── O arquivo dos clipes: nomes, durações e pés presos ao chão ────────────────────────────────
const ler = async (f: string) => {
  const b = readFileSync(f)
  return new GLTFLoader().parseAsync(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '')
}

describe('locomocao.glb', async () => {
  const loco = await ler(join(import.meta.dir, '..', 'src', 'assets', 'avatar', 'locomocao.glb'))
  const base = await ler(
    join(
      import.meta.dir,
      '..',
      '..',
      'community-kids',
      'public',
      'avatar3d',
      'base',
      'Armature.glb',
    ),
  )

  test('tem os clipes da regra, com as durações dela', () => {
    const nomes = loco.animations.map((a) => a.name).sort()
    expect(nomes).toEqual([...CLIPES].sort())
    const dur = (n: string) => loco.animations.find((a) => a.name === n)?.duration ?? 0
    expect(dur('Andar')).toBeCloseTo(CICLO_DE_ANDAR.duracao, 3)
    expect(dur('Correr')).toBeCloseTo(CICLO_DE_CORRER.duracao, 3)
    expect(dur('Escalar')).toBeCloseTo(CICLO_DE_ESCALAR.duracao, 3)
    expect(dur('SubirEscada')).toBeCloseTo(CICLO_DA_ESCADA.duracao, 3)
    expect(dur('Parado')).toBeCloseTo(DURACAO_DO_PARADO, 3)
    expect(dur('Corda')).toBeCloseTo(DURACAO_DA_CORDA, 3)
    expect(dur('Planar')).toBeCloseTo(DURACAO_DO_PLANAR, 3)
    expect(dur('Sentar')).toBeCloseTo(DURACAO_DO_SENTAR, 3)
    expect(dur('Montar')).toBeCloseTo(DURACAO_DA_MONTARIA, 3)
    expect(dur('Deitar')).toBeCloseTo(DURACAO_DO_DEITAR, 3)
    // A aterrissagem é tocada um pouco mais depressa que o clipe, nunca mais devagar.
    expect(DURACAO_DA_ATERRISSAGEM).toBeLessThanOrEqual(dur('Aterrissagem'))
  })

  test('só giros dos ossos do avatar e a posição da bacia (nada de escala ou ossos a mais)', () => {
    const ossos = new Set<string>()
    base.scene.traverse((o) => {
      if ((o as Bone).isBone) ossos.add(o.name)
    })
    for (const clipe of loco.animations) {
      for (const t of clipe.tracks) {
        const [no, prop] = t.name.split('.')
        expect(ossos.has(no ?? '')).toBe(true)
        expect(prop === 'quaternion' || (prop === 'position' && no === 'mixamorigHips')).toBe(true)
      }
    }
  })

  test('andar e correr: o pé no apoio acompanha o chão (não patina) e nunca entra nele', () => {
    let raiz: Object3D | null = null
    base.scene.traverse((o) => {
      if (!raiz && (o as Bone).isBone) raiz = o
    })
    const anim = new Group()
    anim.rotation.x = Math.PI / 2
    anim.scale.setScalar(0.01)
    if (raiz) anim.add(raiz)
    const mixer = new AnimationMixer(anim)
    const dedo = anim.getObjectByName('mixamorigLeftToeBase')
    for (const [nome, ciclo] of [
      ['Andar', CICLO_DE_ANDAR],
      ['Correr', CICLO_DE_CORRER],
    ] as const) {
      const clipe = loco.animations.find((a) => a.name === nome)
      if (!clipe || !dedo) throw new Error('faltou clipe ou osso')
      mixer.stopAllAction()
      mixer.clipAction(clipe).reset().play()
      const v = ciclo.passada / clipe.duration
      const noChao: number[] = []
      let menorAltura = Infinity
      for (let i = 0; i <= 60; i++) {
        const t = (i / 60) * clipe.duration
        mixer.setTime(t)
        anim.updateMatrixWorld(true)
        const p = dedo.getWorldPosition(new Vector3())
        menorAltura = Math.min(menorAltura, p.y)
        // Com a bola do pé no chão, a posição no mundo (z + v t) fica parada.
        if (p.y < 0.012) noChao.push(p.z + v * t)
      }
      expect(noChao.length).toBeGreaterThan(8)
      // O Mixamo leva a bacia com velocidade que varia no passo, e o script tira só a reta: no
      // correr o pé apoiado ainda anda uns 2 cm (andando, menos de 1).
      expect(Math.max(...noChao) - Math.min(...noChao)).toBeLessThan(0.025)
      expect(menorAltura).toBeGreaterThan(-0.01)
    }
  })
})
