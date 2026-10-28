import type { Comodo, Planta } from './comodos'
import { arestaDaChave } from './grade'
import { chaveDaCelula } from './lote'
import type { PecaDoKit } from './pecas'

/**
 * O corte das paredes no Viver e o telhado dos cômodos novos (modo construção).
 *
 * Corte: com a pessoa dentro de casa (numa célula de dentro), fica cortada toda parede cuja linha
 * separa a câmera da pessoa: é a parede que tapa a vista. Fora de casa nada é cortado.
 */
export function paredesCortadasNoViver(
  p: Planta,
  pessoa: { x: number; z: number },
  camera: { x: number; z: number },
): Set<string> {
  const cortadas = new Set<string>()
  if (!p.dentro.has(chaveDaCelula({ x: Math.floor(pessoa.x), z: Math.floor(pessoa.z) })))
    return cortadas
  for (const k of p.paredes) {
    if (p.fixas.has(k)) continue
    const a = arestaDaChave(k)
    const linha = a.eixo === 'x' ? a.z : a.x
    const ladoDaPessoa = Math.sign((a.eixo === 'x' ? pessoa.z : pessoa.x) - linha)
    const ladoDaCamera = Math.sign((a.eixo === 'x' ? camera.z : camera.x) - linha)
    if (ladoDaPessoa !== 0 && ladoDaCamera !== 0 && ladoDaPessoa !== ladoDaCamera) cortadas.add(k)
  }
  return cortadas
}

/** O retângulo do cômodo, se ele for um retângulo cheio (só esses ganham telhado). */
export function retanguloDoComodo(
  c: Comodo,
): { x0: number; z0: number; x1: number; z1: number } | null {
  let x0 = Number.POSITIVE_INFINITY
  let z0 = Number.POSITIVE_INFINITY
  let x1 = Number.NEGATIVE_INFINITY
  let z1 = Number.NEGATIVE_INFINITY
  for (const cel of c.celulas) {
    x0 = Math.min(x0, cel.x)
    z0 = Math.min(z0, cel.z)
    x1 = Math.max(x1, cel.x + 1)
    z1 = Math.max(z1, cel.z + 1)
  }
  return (x1 - x0) * (z1 - z0) === c.celulas.length ? { x0, z0, x1, z1 } : null
}

/** A altura do topo das paredes (onde o telhado começa) e a subida por célula (README do kit). */
export const TELHADO = { altura: 4, subida: 0.5 } as const

function peca(
  no: string,
  x: number,
  y: number,
  z: number,
  giro: number,
): PecaDoKit & { y: number } {
  return {
    chave: `${no}@${x},${y},${z},${giro.toFixed(3)}`,
    arquivo: 'telhado',
    no,
    x,
    z,
    giro,
    y,
  }
}

export type PecaDoTelhado = ReturnType<typeof peca>

/**
 * O telhado de duas águas de um cômodo retangular, com a cumeeira correndo em x, peça por peça
 * como no README de `arte/casa` (o `Cena.telhado` de `cenas.py`). No jogo, o lado de `y0` do
 * Blender é o de z maior: a água sem giro sobe para -z.
 */
export function telhadoDoComodo(r: {
  x0: number
  z0: number
  x1: number
  z1: number
}): PecaDoTelhado[] {
  const { altura: H, subida: s } = TELHADO
  const w = r.x1 - r.x0
  const d = r.z1 - r.z0
  const metade = Math.floor(d / 2)
  const impar = d % 2 === 1
  const pecas: PecaDoTelhado[] = []
  for (let i = 0; i < w; i++) {
    const x = r.x0 + i + 0.5
    const naPonta = i === 0 ? 'esq' : i === w - 1 ? 'dir' : null
    // Os dois lados: o de z maior sobe para -z (giro 0); o outro sobe para +z (meia volta).
    for (const lado of [0, 1] as const) {
      const giro = lado === 0 ? 0 : Math.PI
      const beira = lado === 0 ? r.z1 : r.z0
      const passo = lado === 0 ? -1 : 1
      // Com meia volta, a ponta da esquerda do mundo é a direita da peça.
      const ponta = naPonta && (lado === 0 ? naPonta : naPonta === 'esq' ? 'dir' : 'esq')
      pecas.push(peca('beiral', x, H, beira, giro))
      if (ponta) pecas.push(peca(`testeira-beiral-${ponta}`, x, H, beira, giro))
      for (let k = 0; k < metade; k++) {
        const z = beira + passo * k
        pecas.push(peca('agua', x, H + s * k, z, giro))
        if (ponta) pecas.push(peca(`testeira-${ponta}`, x, H + s * k, z, giro))
      }
      if (impar) {
        const z = beira + passo * metade
        pecas.push(peca('agua-meia', x, H + s * metade, z, giro))
        if (ponta) pecas.push(peca(`testeira-meia-${ponta}`, x, H + s * metade, z, giro))
      }
    }
    const cumeeira = H + (s / 2) * d
    pecas.push(peca('cumeeira', x, cumeeira, (r.z0 + r.z1) / 2, 0))
    if (i === 0) pecas.push(peca('cumeeira-ponta', x, cumeeira, (r.z0 + r.z1) / 2, 0))
    if (i === w - 1) pecas.push(peca('cumeeira-ponta', x, cumeeira, (r.z0 + r.z1) / 2, Math.PI))
  }
  // Os oitões, nas duas linhas de x, no referencial de parede: na de x0 gira -90° (o fora vai
  // para -x) e na de x1, +90° (o giro do Blender é o mesmo em volta do eixo vertical do jogo).
  for (const [linha, giro] of [
    [r.x0, -Math.PI / 2],
    [r.x1, Math.PI / 2],
  ] as const) {
    // Na linha de x0 o +x da peça aponta para +z; na de x1, para -z.
    const altoParaMenosZ = giro > 0 ? 'dir' : 'esq'
    const altoParaMaisZ = giro > 0 ? 'esq' : 'dir'
    for (let c = 0; c < metade; c++) {
      for (const [z, alto] of [
        [r.z1 - 0.5 - c, altoParaMenosZ],
        [r.z0 + 0.5 + c, altoParaMaisZ],
      ] as const) {
        for (let f = 0; f < c; f++) pecas.push(peca('oitao-faixa', linha, H + s * f, z, giro))
        pecas.push(peca(`oitao-${alto}`, linha, H + s * c, z, giro))
      }
    }
    if (impar) {
      for (const [z, alto] of [
        [r.z1 - metade - 0.25, altoParaMenosZ],
        [r.z0 + metade + 0.25, altoParaMaisZ],
      ] as const) {
        for (let f = 0; f < metade; f++)
          pecas.push(peca('oitao-faixa-meia', linha, H + s * f, z, giro))
        pecas.push(peca(`oitao-meia-${alto}`, linha, H + s * metade, z, giro))
      }
    }
  }
  return pecas
}

/** Os telhados de todos os cômodos novos retangulares (o quarto tem o telhado da casa de antes). */
export function telhadosDaObra(p: Planta): PecaDoTelhado[] {
  const pecas: PecaDoTelhado[] = []
  for (const c of p.comodos) {
    if (c.quarto) continue
    const r = retanguloDoComodo(c)
    if (r) pecas.push(...telhadoDoComodo(r))
  }
  return pecas
}
