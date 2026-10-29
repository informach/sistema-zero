import { expect, test } from 'bun:test'
import { Box3, Vector3 } from 'three'
import { giroDaIlha, ilhasEmVolta, rodasDaIlhaNoModelo, trajetoDaPonte } from '../src/mundo/medidas'
import { noCorredorDoBarco } from '../src/sistemas/barco'
import {
  BOIAS_DA_ILHA_CENTRAL,
  BOIAS_DA_ILHA_DO_ANEL,
  CORRENTEZA,
} from '../src/sistemas/correnteza'
import { MERGULHO } from '../src/sistemas/mergulho'
import { viagemReal } from './ajuda-barco'
import { arquivoDaIlha, carregarGlb } from './ajuda-colisores'
import { caminhoSubmerso, mundoSubmerso, R } from './ajuda-mergulho'

for (const [nome, alvo] of [
  ['navio', 'bau'],
  ['navio', 'pagina-diario'],
  ['labirinto', 'tesouro'],
] as const) {
  test(`${nome}: a cápsula real chega a ${alvo} sem atravessar os col-*`, async () => {
    const caminho = await caminhoSubmerso(nome, alvo)
    expect(caminho.length).toBeGreaterThan(3)
    expect(caminho.every((p) => p.y >= -2.5)).toBe(true)
  }, 30_000)
}
test('modelos reais ficam dentro das boias e fora do barco e das pontes', async () => {
  const recife = ilhasEmVolta().find((i) => i.ilha.id === 'recife')!
  const giro = giroDaIlha(recife.ilha),
    [, ...rodasDosModelos] = rodasDaIlhaNoModelo(recife.ilha, BOIAS_DA_ILHA_DO_ANEL)
  const rota = viagemReal().rota
  const pontes = ilhasEmVolta().flatMap((i) => trajetoDaPonte(i.ilha))
  for (const [i, nome] of (['navio', 'labirinto'] as const).entries()) {
    const roda = rodasDosModelos[i]
    if (!roda) throw new Error(`sem a roda do ${nome}`)
    const cena = await carregarGlb(arquivoDaIlha(`recife-${nome}.glb`))
    const limites = new Box3()
      .setFromObject(cena)
      .translate(new Vector3(MERGULHO[nome].x, 0, MERGULHO[nome].z))
    for (let x = limites.min.x; x <= limites.max.x; x += 0.5)
      for (let z = limites.min.z; z <= limites.max.z; z += 0.5) {
        expect(Math.hypot(x - roda.x, z - roda.z)).toBeLessThan(roda.livre - 1)
        const p = {
          x: recife.centro.x + x * Math.cos(giro) + z * Math.sin(giro),
          z: recife.centro.z + z * Math.cos(giro) - x * Math.sin(giro),
        }
        expect(noCorredorDoBarco(rota, p)).toBe(false)
        expect(pontes.every((b) => Math.hypot(p.x - b.x, p.z - b.z) > 2)).toBe(true)
      }
  }
}, 30_000)

test('as rodas do Recife se ligam e ficam longe da sua ilha e das outras ilhas', () => {
  const ilhas = ilhasEmVolta()
  const recife = ilhas.find((i) => i.ilha.id === 'recife')!
  const noMundo = (ilha: (typeof ilhas)[number]) => {
    const g = giroDaIlha(ilha.ilha)
    return rodasDaIlhaNoModelo(ilha.ilha, BOIAS_DA_ILHA_DO_ANEL).map((r) => ({
      x: ilha.centro.x + r.x * Math.cos(g) + r.z * Math.sin(g),
      z: ilha.centro.z - r.x * Math.sin(g) + r.z * Math.cos(g),
      livre: r.livre,
    }))
  }
  const [daIlha, ...dosModelos] = noMundo(recife)
  if (!daIlha) throw new Error('sem a roda do Recife')
  for (const r of dosModelos) {
    // Encosta na da ilha: dá para nadar da praia até o navio e o labirinto.
    expect(Math.hypot(r.x - daIlha.x, r.z - daIlha.z)).toBeLessThan(r.livre + daIlha.livre - 3)
  }
  // Entre cada roda do Recife e as outras rodas sobra a faixa inteira da correnteza: o mar até a
  // sua ilha e as vizinhas continua fechado (o caminho é a ponte).
  const outras = [
    { x: 0, z: 0, livre: BOIAS_DA_ILHA_CENTRAL },
    ...ilhas.filter((i) => i.ilha.id !== 'recife' && i.ilha.id !== 'nuvens').flatMap(noMundo),
  ]
  for (const r of [daIlha, ...dosModelos])
    for (const o of outras)
      expect(Math.hypot(r.x - o.x, r.z - o.z) - r.livre - o.livre).toBeGreaterThan(CORRENTEZA.faixa)
})

test('o foco baixo da câmera cabe no porão onde a cabeça em pé encostava no teto', async () => {
  const caminho = await caminhoSubmerso('navio', 'bau')
  const corpo = caminho.at(-1)!
  const cena = await carregarGlb(arquivoDaIlha('recife-navio.glb'))
  const world = mundoSubmerso(cena)
  try {
    const bate = (altura: number) => {
      let tocou = false
      world.intersectionsWithShape(
        { ...corpo, y: corpo.y + altura },
        { x: 0, y: 0, z: 0, w: 1 },
        new R.Ball(0.45),
        () => {
          tocou = true
          return false
        },
      )
      return tocou
    }
    expect(bate(0.9)).toBe(true)
    expect(bate(MERGULHO.focoDaCamera)).toBe(false)
    expect(bate(MERGULHO.focoDaCamera - MERGULHO.sondaAbaixo)).toBe(false)
  } finally {
    world.free()
  }
})
