import { beforeAll, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import type { RapierContext } from '@react-three/rapier'
import { COLISORES_DO_PIER } from '../src/mundo/colisao-da-ilha-central'
import { type ColisorDaIlha, lerColisores } from '../src/mundo/colisores-da-ilha'
import { giroDaIlha, ilhasEmVolta, PIER } from '../src/mundo/medidas'
import { embarcar } from '../src/sistemas/barco'
import { CORPO } from '../src/sistemas/corpo'
import {
  criarEstadoDoCorpo,
  type EntradaDoPasso,
  MODOS,
  type MundoDoMovimento,
} from '../src/sistemas/modos'
import { passoComColisao } from '../src/sistemas/modos/colisao'
import { viagemReal } from './ajuda-barco'
import { arquivoDaIlha, carregarGlb } from './ajuda-colisores'

const require = createRequire(import.meta.url)
const R: RapierContext['rapier'] = require(
  require.resolve('@dimforge/rapier3d-compat', { paths: [require.resolve('@react-three/rapier')] }),
)
beforeAll(async () => {
  await R.init()
})

test('um obstáculo durante o embarque devolve ao cais, sem soltar o corpo na água', () => {
  const world = new R.World({ x: 0, y: -24, z: 0 })
  try {
    const v = viagemReal()
    const p = v.portos[0].embarque
    const corpo = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(
        p.x,
        p.y + CORPO.doCentroAoPe + CORPO.folga,
        p.z,
      ),
    )
    const col = world.createCollider(R.ColliderDesc.capsule(CORPO.meiaAltura, CORPO.raio), corpo)
    world.createCollider(R.ColliderDesc.cuboid(0.1, 3, 4).setTranslation(p.x + 1, 1, p.z))
    const k = world.createCharacterController(CORPO.folga)
    const c = criarEstadoDoCorpo()
    c.modo = 'barco'
    c.barco = v
    embarcar(v, 0, p)
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
    for (let i = 0; i < 400 && c.modo === 'barco'; i++) {
      const e: EntradaDoPasso = {
        dt: 1 / 60,
        agora: (i * 1000) / 60,
        parado: false,
        p: corpo.translation(),
        ix: 0,
        iz: 0,
        pedidoX: 0,
        pedidoZ: 0,
        ladoX: 1,
        ladoZ: 0,
        pulou: false,
        usou: false,
        correr: false,
        ritmo: 1,
        patins: false,
        conversa: null,
        gravidade: 24,
        nivelDoMar: 0,
      }
      passoComColisao(
        MODOS.barco,
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
      expect(c.prox.x).toBeLessThan(p.x + 1 - CORPO.raio)
      expect(c.nadando).toBe(false)
    }
    expect(c).toMatchObject({ modo: 'chao' })
    expect(c.prox.x).toBeCloseTo(p.x, 2)
    expect(c.prox.z).toBeCloseTo(p.z, 2)
  } finally {
    world.free()
  }
})

test('Rapier real leva o corpo dos dois cais ao convés e de volta ao chão', async () => {
  const recife = ilhasEmVolta().find((i) => i.ilha.id === 'recife')!
  const pier = await carregarGlb(join(import.meta.dir, '../src/assets/mundo/pier.glb'))
  const ilha = await carregarGlb(arquivoDaIlha('recife.glb'))
  const world = new R.World({ x: 0, y: -24, z: 0 })
  try {
    const registrar = (lista: readonly ColisorDaIlha[], x: number, z: number, giro: number) => {
      const corpo = world.createRigidBody(
        R.RigidBodyDesc.fixed()
          .setTranslation(x, 0, z)
          .setRotation({ x: 0, y: Math.sin(giro / 2), z: 0, w: Math.cos(giro / 2) }),
      )
      for (const c of lista) {
        if (c.nome === 'col-barco-1') continue
        let d: ReturnType<typeof R.ColliderDesc.cuboid>
        if (c.forma === 'malha') d = R.ColliderDesc.trimesh(c.vertices, c.indices)
        else {
          d =
            c.forma === 'caixa'
              ? R.ColliderDesc.cuboid(...c.meio)
              : R.ColliderDesc.cylinder(c.meiaAltura, c.raio)
          d.setTranslation(...c.posicao).setRotation({
            x: c.rotacao[0],
            y: c.rotacao[1],
            z: c.rotacao[2],
            w: c.rotacao[3],
          })
        }
        world.createCollider(d, corpo)
      }
    }
    registrar([...lerColisores(pier), ...COLISORES_DO_PIER], PIER.x, PIER.z, 0)
    registrar(lerColisores(ilha), recife.centro.x, recife.centro.z, giroDaIlha(recife.ilha))
    const viagem = viagemReal()
    viagem.recifePronto = true
    const inicio = viagem.portos[0].embarque
    const corpo = world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(
        inicio.x,
        inicio.y + CORPO.doCentroAoPe + CORPO.folga,
        inicio.z,
      ),
    )
    const col = world.createCollider(R.ColliderDesc.capsule(CORPO.meiaAltura, CORPO.raio), corpo)
    const k = world.createCharacterController(CORPO.folga)
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
    const c = criarEstadoDoCorpo()
    const entrada: EntradaDoPasso = {
      dt: 1 / 60,
      agora: 0,
      parado: false,
      p: corpo.translation(),
      ix: 1,
      iz: 1,
      pedidoX: 1,
      pedidoZ: 1,
      ladoX: 1,
      ladoZ: 0,
      pulou: true,
      usou: true,
      correr: true,
      ritmo: 1,
      patins: false,
      conversa: null,
      gravidade: 24,
      nivelDoMar: 0,
    }
    world.step()
    for (const porto of [0, 1] as const) {
      embarcar(viagem, porto, viagem.portos[porto].embarque)
      c.barco = viagem
      c.modo = 'barco'
      let passos = 0
      while (c.modo === 'barco' && passos++ < 10000) {
        entrada.p = corpo.translation()
        entrada.agora += 1000 / 60
        passoComColisao(
          MODOS.barco,
          c,
          entrada,
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
      }
      expect(c).toMatchObject({ modo: 'chao' })
      expect(viagem.devolvendo).toBe(false)
      const destino = viagem.portos[porto === 0 ? 1 : 0].embarque
      expect(c.prox.x).toBeCloseTo(destino.x, 2)
      expect(c.prox.z).toBeCloseTo(destino.z, 2)
      expect(c.nadando).toBe(false)
    }
  } finally {
    world.free()
  }
})
