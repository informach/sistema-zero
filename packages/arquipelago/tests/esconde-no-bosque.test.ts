import { beforeAll, describe, expect, test } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BICHOS_DO_BOSQUE } from '@sistemazero/arquipelago-contracts'
import type { Object3D } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { ESCONDERIJOS_NO_MODELO, LUGARES_NO_CERCADO, TOPO_DO_BOSQUE } from '../src/mundo/bosque'
import {
  CORPO_DO_BICHO,
  chaoLivre,
  gradeDoBicho,
  MACIOS_PARA_O_BICHO,
} from '../src/mundo/chao-livre'
import { type ColisorDaIlha, lerColisores } from '../src/mundo/colisores-da-ilha'
import { acharCaminho, type Grade } from '../src/sistemas/caminho'
import { CORPO } from '../src/sistemas/corpo'
import { RAIO_DA_PISTA, RAIO_DE_ACHAR } from '../src/sistemas/esconde'

const ARQUIVO = join(import.meta.dir, '..', 'src', 'assets', 'ilhas', 'bosque.glb')

let raiz: Object3D
let colisores: ColisorDaIlha[]
let grade: Grade
/** Onde a criança (a cápsula do personagem) cabe de pé no chão. */
let criancaCabe: (x: number, z: number) => boolean

beforeAll(async () => {
  const buf = readFileSync(ARQUIVO)
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  raiz = (await new GLTFLoader().parseAsync(ab, '')).scene
  raiz.updateMatrixWorld(true)
  colisores = lerColisores(raiz)
  grade = gradeDoBicho(colisores, TOPO_DO_BOSQUE)
  criancaCabe = chaoLivre(colisores, {
    chao: TOPO_DO_BOSQUE,
    raio: CORPO.raio,
    altura: CORPO.doCentroAoPe * 2,
    raioDaIlha: 12,
  })
})

describe('esconde-esconde no Bosque', () => {
  test('o Blender ainda não tem as âncoras: valem as medidas do código', () => {
    for (let i = 1; i <= 4; i++) expect(raiz.getObjectByName(`esconderijo-${i}`)).toBeUndefined()
  })

  test('cada esconderijo fica perto de algo que o esconde, longe dos outros', () => {
    const lista = BICHOS_DO_BOSQUE.map((b) => ESCONDERIJOS_NO_MODELO[b])
    for (const [i, a] of lista.entries()) {
      for (const b of lista.slice(i + 1)) {
        // As pistas não se misturam: de um esconderijo não se vê a pista do outro.
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(RAIO_DA_PISTA * 1.2)
      }
    }
  })

  test('a criança alcança cada bicho: cabe de pé a menos de "Achar" dele', () => {
    for (const b of BICHOS_DO_BOSQUE) {
      const e = ESCONDERIJOS_NO_MODELO[b]
      let cabe = false
      for (let a = 0; a < 16 && !cabe; a++) {
        const ang = (a / 16) * Math.PI * 2
        for (const r of [0.8, 1.0, 1.2]) {
          if (r < RAIO_DE_ACHAR && criancaCabe(e.x + Math.sin(ang) * r, e.z + Math.cos(ang) * r))
            cabe = true
        }
      }
      expect(`${b}: ${cabe}`).toBe(`${b}: true`)
    }
  })

  test('os lugares do cercadinho ficam livres e separados', () => {
    const livre = chaoLivre(colisores, {
      chao: TOPO_DO_BOSQUE,
      raio: CORPO_DO_BICHO.raio,
      altura: CORPO_DO_BICHO.altura,
      raioDaIlha: 12,
    })
    expect(LUGARES_NO_CERCADO).toHaveLength(BICHOS_DO_BOSQUE.length)
    for (const [i, l] of LUGARES_NO_CERCADO.entries()) {
      expect(livre(l.x, l.z)).toBe(true)
      for (const m of LUGARES_NO_CERCADO.slice(i + 1)) {
        expect(Math.hypot(l.x - m.x, l.z - m.z)).toBeGreaterThan(0.65)
      }
    }
  })

  test('de cada esconderijo há caminho até cada lugar do cercadinho, sem passar por nada duro', () => {
    // A folga da conferência é menor que a da grade (as retas ligam centros de casas de 25 cm).
    const duro = chaoLivre(
      colisores.filter((c) => !MACIOS_PARA_O_BICHO.some((m) => c.nome.startsWith(m))),
      { chao: TOPO_DO_BOSQUE, raio: 0.12, altura: CORPO_DO_BICHO.altura, raioDaIlha: 12.3 },
    )
    const cercado = raiz.getObjectByName('cercado')?.position
    expect(cercado).toBeDefined()
    for (const b of BICHOS_DO_BOSQUE) {
      const e = ESCONDERIJOS_NO_MODELO[b]
      for (const l of LUGARES_NO_CERCADO) {
        const c = acharCaminho(grade, e, l)
        expect(c).not.toBeNull()
        if (!c) continue
        for (let i = 1; i < c.length; i++) {
          const a = c[i - 1]
          const z = c[i]
          if (!a || !z) continue
          const n = Math.ceil(Math.hypot(z.x - a.x, z.z - a.z) / 0.1)
          for (let k = 0; k <= n; k++) {
            const x = a.x + ((z.x - a.x) * k) / n
            const y = a.z + ((z.z - a.z) * k) / n
            // Saindo do esconderijo ele ainda está encostado no que o esconde.
            if (Math.hypot(x - e.x, y - e.z) < 0.6) continue
            expect(`${b} ${x.toFixed(2)},${y.toFixed(2)}: ${duro(x, y)}`).toEndWith('true')
          }
        }
        // Entra no cercadinho pela frente: a porteira abre para o meio da ilha.
        const antes = c.at(-2)
        if (antes && cercado) expect(antes.z).toBeGreaterThan(cercado.z - 0.6)
      }
    }
  })
})
