import { describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AnimationMixer, type Group, type Object3D, Vector3 } from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * Gato e cachorro do quarto andando e correndo atrás da criança (31/10/2026). Até aqui o GLB só
 * tinha o parado e o bicho deslizava. Agora cada um tem `andar` (ciclo de 0,6 a 0,8 s) e `correr`
 * (0,4 s), feitos em `community-kids/scripts/room-blender/pets.py`, e os pés não escorregam: com o
 * corpo avançando a 1,5 m/s (andar) e 3,5 m/s (correr), cada pata, enquanto está no chão (até 1 cm
 * acima da altura mais baixa dela), anda para trás no mesmo ritmo e fica parada no mundo.
 *
 * Escala: o jogo desenha o GLB do quarto sem escala (`<RoomGlbModel>` direto no grupo de
 * `mundo/pet-que-acompanha.tsx`), então 1 unidade do arquivo é 1 m. A frente do bicho é +Z (o grupo
 * gira para `atan2(vx, vz)`), e é para lá que o corpo avança.
 */

const ESCALA_NO_JOGO = 1
const ITENS = (comunidade: string) =>
  join(import.meta.dir, '..', '..', comunidade, 'public', 'room3d', 'items')
const PETS = ['pet-cachorro', 'pet-gato'] as const
const PARADO = ['corpo', 'cabeca', 'rabo']
/** Materiais que já existiam (nenhum some nem muda de nome). */
const MATERIAIS: Record<(typeof PETS)[number], string[]> = {
  'pet-cachorro': ['fur', 'furLight', 'black', 'pink', 'white', 'furDark', 'red', 'yellow'],
  'pet-gato': ['furDark', 'white', 'pink', 'yellow', 'black'],
}
const CLIPES = [
  { nome: 'andar', velocidade: 1.5, min: 0.6, max: 0.8 },
  { nome: 'correr', velocidade: 3.5, min: 0.4, max: 0.4 },
] as const
const FOLGA_DA_DURACAO = 0.02
const NO_CHAO = 0.01
const ESCORREGA_MAX = 0.1

async function carregar(id: string) {
  const buf = readFileSync(join(ITENS('community-kids'), `${id}.glb`))
  return new GLTFLoader().parseAsync(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    '',
  )
}

function patas(cena: Object3D): Object3D[] {
  const out: Object3D[] = []
  cena.traverse((o) => {
    if (o.name.startsWith('pata-')) out.push(o)
  })
  return out
}

/** Amostra o clipe sozinho e devolve, por pata, o escorregamento médio no chão (m/s). */
function escorregamento(cena: Group, clipe: import('three').AnimationClip, velocidade: number) {
  const mixer = new AnimationMixer(cena)
  mixer.clipAction(clipe).play()
  const pes = patas(cena)
  const n = 1200
  const dt = clipe.duration / n
  const pos = pes.map(() => [] as Vector3[])
  for (let i = 0; i < n; i++) {
    mixer.setTime(i * dt)
    cena.updateMatrixWorld(true)
    pes.forEach((p, k) => {
      pos[k]?.push(p.getWorldPosition(new Vector3()).multiplyScalar(ESCALA_NO_JOGO))
    })
  }
  mixer.stopAllAction()
  return pes.map((p, k) => {
    const ps = pos[k] as Vector3[]
    const chao = Math.min(...ps.map((v) => v.y))
    let soma = 0
    let amostras = 0
    for (let i = 0; i < n; i++) {
      if ((ps[i] as Vector3).y > chao + NO_CHAO) continue
      const antes = ps[(i - 1 + n) % n] as Vector3
      const depois = ps[(i + 1) % n] as Vector3
      // Velocidade da pata no mundo: a do clipe (feito no lugar) mais o avanço do corpo em +Z.
      const vx = (depois.x - antes.x) / (2 * dt)
      const vz = (depois.z - antes.z) / (2 * dt) + velocidade
      soma += Math.hypot(vx, vz)
      amostras++
    }
    return { pata: p.name, medio: soma / amostras, tempoNoChao: (amostras / n) * clipe.duration }
  })
}

describe('gato e cachorro andam e correm sem escorregar (31/10/2026)', () => {
  test('o jogo desenha o bichinho do quarto sem escala (1 unidade = 1 m)', () => {
    const fonte = readFileSync(
      join(import.meta.dir, '..', 'src', 'mundo', 'pet-que-acompanha.tsx'),
      'utf8',
    )
    expect(fonte).toMatch(/<RoomGlbModel\s+itemId=\{petId\}/)
    expect(fonte).not.toMatch(/scale/)
  })

  for (const id of PETS) {
    test(`${id}: o mesmo arquivo nas duas comunidades`, () => {
      const hash = (c: string) =>
        createHash('sha256')
          .update(readFileSync(join(ITENS(c), `${id}.glb`)))
          .digest('hex')
      expect(hash('community')).toBe(hash('community-kids'))
    })

    test(`${id}: parado, nós e materiais de antes continuam`, async () => {
      const gltf = await carregar(id)
      const nomes = gltf.animations.map((a) => a.name)
      for (const c of PARADO) expect(nomes).toContain(c)
      for (const n of ['corpo', 'cabeca', 'rabo'])
        expect(gltf.scene.getObjectByName(n), n).toBeDefined()
      const mats = new Set<string>()
      gltf.scene.traverse((o) => {
        const m = (o as { material?: { name: string } | { name: string }[] }).material
        for (const x of Array.isArray(m) ? m : m ? [m] : []) mats.add(x.name)
      })
      for (const m of MATERIAIS[id]) expect(mats.has(m), m).toBe(true)
      // A frente é +Z: a cabeça fica à frente do rabo.
      const cab = gltf.scene.getObjectByName('cabeca')?.getWorldPosition(new Vector3())
      const rab = gltf.scene.getObjectByName('rabo')?.getWorldPosition(new Vector3())
      expect((cab?.z ?? 0) > (rab?.z ?? 0)).toBe(true)
      expect(patas(gltf.scene)).toHaveLength(4)
    })

    for (const c of CLIPES) {
      test(`${id}: ${c.nome} em laço, ${c.velocidade} m/s sem os pés escorregarem`, async () => {
        const gltf = await carregar(id)
        const clipe = gltf.animations.find((a) => a.name === c.nome)
        expect(clipe, c.nome).toBeDefined()
        if (!clipe) return
        expect(clipe.duration).toBeGreaterThanOrEqual(c.min - FOLGA_DA_DURACAO)
        expect(clipe.duration).toBeLessThanOrEqual(c.max + FOLGA_DA_DURACAO)
        // Laço: o primeiro e o último quadro de cada trilha casam.
        for (const trilha of clipe.tracks) {
          const k = trilha.getValueSize()
          const v = trilha.values
          for (let i = 0; i < k; i++)
            expect(
              Math.abs((v[i] as number) - (v[v.length - k + i] as number)),
              trilha.name,
            ).toBeLessThan(1e-4)
        }
        const porPata = escorregamento(gltf.scene, clipe, c.velocidade)
        expect(porPata).toHaveLength(4)
        for (const p of porPata) {
          expect(p.tempoNoChao, p.pata).toBeGreaterThan(0)
          expect(p.medio, `${p.pata} escorrega`).toBeLessThan(ESCORREGA_MAX * c.velocidade)
        }
      })
    }
  }
})
