import { beforeAll, describe, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import type { RapierContext } from '@react-three/rapier'
import { GRAVIDADE, PASSO_DA_FISICA, RAIO_DO_ANEL, RAIO_DO_RASO } from '../src/mundo/medidas'
import { lerConforto } from '../src/sistemas/conforto'
import { CORPO } from '../src/sistemas/corpo'
import {
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { passoComColisao } from '../src/sistemas/modos/colisao'
import {
  type AmostraDeQualidade,
  criarAmostra,
  nivelForcado,
  observarQuadro,
  PERFIS_DE_QUALIDADE,
  perfilDoAparelho,
} from '../src/sistemas/qualidade'

function amostrar(e: AmostraDeQualidade, ms: number, segundos: number) {
  for (let i = 0; i < Math.round((segundos * 1000) / ms); i++) e = observarQuadro(e, ms)
  return e
}

describe('qualidade automática', () => {
  test('desktop, toque, Chromebook e poucos núcleos começam com orçamento próprio', () => {
    expect(perfilDoAparelho({ toque: false, userAgent: 'Windows', nucleos: 8 })).toEqual({
      meta: 60,
      inicial: 'completo',
    })
    expect(perfilDoAparelho({ toque: true, userAgent: 'iPad', nucleos: 8 })).toEqual({
      meta: 30,
      inicial: 'medio',
    })
    expect(
      perfilDoAparelho({
        toque: false,
        userAgent: 'Mozilla/5.0 (X11; CrOS x86_64 14541)',
        nucleos: 8,
      }),
    ).toEqual({ meta: 30, inicial: 'medio' })
    expect(perfilDoAparelho({ toque: false, userAgent: '', nucleos: 4 })).toEqual({
      meta: 30,
      inicial: 'medio',
    })
    expect(perfilDoAparelho({ toque: false, userAgent: '', nucleos: 2 })).toEqual({
      meta: 30,
      inicial: 'leve',
    })
    for (const nucleos of [undefined, 0, -1, Number.NaN, Infinity])
      expect(perfilDoAparelho({ toque: false, userAgent: '', nucleos })).toEqual({
        meta: 60,
        inicial: 'completo',
      })
  })

  test('armazenamento antigo ou inválido usa automática; URL não altera a preferência', () => {
    expect(lerConforto('{}').qualidade).toBe('automatica')
    expect(lerConforto('{"qualidade":"errada"}').qualidade).toBe('automatica')
    for (const qualidade of ['leve', 'completa', 'automatica'] as const)
      expect(lerConforto(JSON.stringify({ qualidade })).qualidade).toBe(qualidade)
    expect(nivelForcado('automatica', null)).toBeNull()
    expect(nivelForcado('completa', 'leve')).toBe('leve')
    expect(nivelForcado('leve', 'completa')).toBe('completo')
    expect(nivelForcado('leve', 'invalida')).toBe('leve')
  })

  test('média de quadros ruins reduz um nível, nunca antes de oito segundos', () => {
    const inicial = criarAmostra(60, 'completo')
    const antes = amostrar(inicial, 25, 7.975)
    expect(antes.nivel).toBe('completo')
    const medio = observarQuadro(antes, 25)
    expect(medio.nivel).toBe('medio')
    expect(amostrar(medio, 25, 7.975).nivel).toBe('medio')
    expect(amostrar(medio, 25, 8).nivel).toBe('leve')
    expect(amostrar(medio, 25, 80).nivel).toBe('leve')
    expect(inicial).toEqual(criarAmostra(60, 'completo'))
  })

  test('recuperação exige vinte segundos e cinco janelas boas consecutivas', () => {
    const inicial = criarAmostra(60, 'leve')
    expect(amostrar(inicial, 16, 19).nivel).toBe('leve')
    const medio = amostrar(inicial, 16, 20)
    expect(medio.nivel).toBe('medio')
    expect(amostrar(medio, 16, 20).nivel).toBe('completo')
    const misto = amostrar(amostrar(inicial, 20, 20), 16, 8)
    expect(misto.nivel).toBe('leve')
    expect(amostrar(misto, 16, 2).nivel).toBe('medio')
  })

  test('faixa neutra, ruído isolado e metas diferentes não ficam alternando', () => {
    expect(amostrar(criarAmostra(60, 'medio'), 19, 120).nivel).toBe('medio')
    let e = criarAmostra(60, 'medio')
    for (let i = 0; i < 20; i++) {
      e = amostrar(e, 25, 2)
      e = amostrar(e, 16, 2)
    }
    expect(e.nivel).toBe('medio')
    expect(amostrar(criarAmostra(30, 'medio'), 37, 120).nivel).toBe('medio')
    expect(amostrar(criarAmostra(30, 'medio'), 50, 8).nivel).toBe('leve')
    expect(amostrar(criarAmostra(30, 'medio'), 1000 / 30, 21).nivel).toBe('completo')
  })

  test('pausas e intervalos inválidos limpam evidência antiga; desempenho de 5 FPS ainda conta', () => {
    const antes = amostrar(criarAmostra(60, 'completo'), 25, 7)
    for (const ms of [0, -1, Number.NaN, Infinity, 1001])
      expect(observarQuadro(antes, ms)).toEqual(criarAmostra(60, 'completo'))
    expect(amostrar(criarAmostra(60, 'completo'), 200, 8).nivel).toBe('medio')
  })

  test('leve não tem vento nem ondinhas e névoa não fecha sobre a central vista do anel', () => {
    expect(PERFIS_DE_QUALIDADE.leve).toMatchObject({ vento: 0, ondinhas: false, dpr: 0.75 })
    for (const p of Object.values(PERFIS_DE_QUALIDADE)) {
      expect(p.nevoaInicio).toBeGreaterThan(RAIO_DO_RASO + 20)
      expect(p.nevoaFim).toBeGreaterThan(RAIO_DO_ANEL + RAIO_DO_RASO + 20)
    }
  })
})

// A mesma versão Rapier do renderer, sem instalar outro motor só para o teste.
const require = createRequire(import.meta.url)
const R: RapierContext['rapier'] = require(
  require.resolve('@dimforge/rapier3d-compat', {
    paths: [require.resolve('@react-three/rapier')],
  }),
)
beforeAll(async () => {
  await R.init()
})

function jogar(fps: 30 | 60, nivel: AmostraDeQualidade['nivel']) {
  const world = new R.World({ x: 0, y: -GRAVIDADE, z: 0 })
  try {
    world.timestep = PASSO_DA_FISICA
    world.createCollider(R.ColliderDesc.cuboid(30, 0.5, 30).setTranslation(0, -0.5, 0))
    const corpo = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(
        0,
        CORPO.doCentroAoPe + CORPO.folga,
        0,
      ),
    )
    const col = world.createCollider(R.ColliderDesc.capsule(CORPO.meiaAltura, CORPO.raio), corpo)
    const k = world.createCharacterController(CORPO.folga)
    const c = criarEstadoDoCorpo()
    const mundo: MundoDoMovimento = {
      cipos: [],
      troncos: [],
      aguas: [],
      equilibrios: [],
      escadas: [],
      escorregadores: [],
      bordas: [],
      rodasDeNado: [],
      foco: { x: 0, y: 0, z: 0 },
    }
    world.step()
    let saldo = 0,
      passos = 0,
      qualidade = criarAmostra(fps, nivel)
    const percurso: { x: number; y: number; z: number }[] = []
    for (let quadro = 0; quadro < fps * 4; quadro++) {
      qualidade = observarQuadro(qualidade, 1000 / fps)
      saldo += 1 / fps
      while (saldo >= PASSO_DA_FISICA) {
        const e: EntradaDoPasso = {
          dt: PASSO_DA_FISICA,
          agora: (passos * 1000) / 60,
          parado: false,
          p: corpo.translation(),
          ix: 0,
          iz: 1,
          pedidoX: 0,
          pedidoZ: 1,
          ladoX: 1,
          ladoZ: 0,
          pulou: passos === 30,
          usou: false,
          correr: false,
          ritmo: 1,
          conversa: null,
          gravidade: GRAVIDADE,
          nivelDoMar: -10,
        }
        c.noModo += e.dt
        passoComColisao(
          MODOS[c.modo],
          c,
          e,
          mundo,
          col,
          k,
          k,
          R.QueryFilterFlags.EXCLUDE_SENSORS,
          () => true,
          () => {},
        )
        corpo.setNextKinematicTranslation(c.prox)
        world.step()
        percurso.push({ ...corpo.translation() })
        passos++
        saldo -= PASSO_DA_FISICA
      }
    }
    return percurso
  } finally {
    world.free()
  }
}

test('andar e pular com Rapier real a 30 e 60 quadros têm os mesmos 240 passos e trajetória', () => {
  const referencia = jogar(60, 'completo')
  expect(referencia).toHaveLength(240)
  expect(referencia.at(-1)!.z).toBeGreaterThan(8)
  expect(Math.max(...referencia.map((p) => p.y))).toBeGreaterThan(2)
  expect(referencia.at(-1)!.y).toBeLessThan(1)
  for (const nivel of ['leve', 'medio', 'completo'] as const)
    for (const fps of [30, 60] as const) expect(jogar(fps, nivel)).toEqual(referencia)
})
