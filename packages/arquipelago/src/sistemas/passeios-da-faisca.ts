import { ARTE_DA_FAISCA } from '../mundo/faisca/arte.generated'
import type { PlanoDeRecorte } from '../mundo/faisca/recortar-malha'
import type { PisoDaFaisca } from './refino-da-faisca'

type Ponto = { x: number; z: number }
export interface ModuloDePasseio {
  modelo: string
  x: number
  z: number
  giro: number
  planos: PlanoDeRecorte[]
}
const r = 3.5
const modulos = {
  reino: ['caminho_terra_reto', 'caminho_terra_curvo'],
  faroeste: ['trilha_terra_reta', 'trilha_terra_curva'],
  templo: ['caminho_lajes_reto', 'caminho_lajes_curvo'],
} as const
/** Monta curvas de raio nativo e recorta sobras, sem estreitar nem esticar o piso. */
export function montarPasseio(pontos: readonly Ponto[], tipo: PisoDaFaisca): ModuloDePasseio[] {
  const [reto, curvo] = modulos[tipo],
    meta = ARTE_DA_FAISCA.pecas[curvo].encaixe
  const canto = meta.pontos.find((p) => p.nome === 'canto_da_celula')!.posicao,
    C = { x: canto[0], z: canto[2] },
    saida: ModuloDePasseio[] = []
  const curvas = pontos.map((p, i) => {
    if (i === 0 || i === pontos.length - 1)
      return { entrada: p, saida: p, angulo: 0, sinal: 1, direcao: 0 }
    const a = pontos[i - 1]!,
      b = pontos[i + 1]!,
      la = Math.hypot(p.x - a.x, p.z - a.z),
      lb = Math.hypot(b.x - p.x, b.z - p.z),
      ux = (p.x - a.x) / la,
      uz = (p.z - a.z) / la,
      vx = (b.x - p.x) / lb,
      vz = (b.z - p.z) / lb
    const angulo = Math.acos(Math.max(-1, Math.min(1, ux * vx + uz * vz))),
      sinal = Math.sign(ux * vz - uz * vx) || 1,
      t = r * Math.tan(angulo / 2)
    if (t > Math.min(la, lb) - 0.01)
      throw Error('Curva do catálogo não cabe entre os pontos de projeto')
    return {
      entrada: { x: p.x - ux * t, z: p.z - uz * t },
      saida: { x: p.x + vx * t, z: p.z + vz * t },
      angulo,
      sinal,
      direcao: Math.atan2(uz, ux),
    }
  })
  const reta = (a: Ponto, b: Ponto) => {
    const d = Math.hypot(b.x - a.x, b.z - a.z)
    if (d < 0.001) return
    const ux = (b.x - a.x) / d,
      uz = (b.z - a.z) / d
    for (let t = 0; t < d - 0.001; t += 7) {
      const len = Math.min(7, d - t)
      saida.push({
        modelo: reto,
        x: a.x + ux * (t + 3.5),
        z: a.z + uz * (t + 3.5),
        giro: -Math.atan2(uz, ux),
        planos: len < 6.999 ? [{ x: 1, z: 0, limite: -3.5 + len }] : [],
      })
    }
  }
  for (let i = 0; i < curvas.length - 1; i++) {
    const origemDaReta = pontos[i]!,
      fim = pontos[i + 1]!,
      dx = fim.x - origemDaReta.x,
      dz = fim.z - origemDaReta.z
    if (
      (curvas[i + 1]!.entrada.x - curvas[i]!.saida.x) * dx +
        (curvas[i + 1]!.entrada.z - curvas[i]!.saida.z) * dz <
      -0.001
    )
      throw Error('Curvas adjacentes se sobrepõem')
    reta(curvas[i]!.saida, curvas[i + 1]!.entrada)
    const v = curvas[i + 1]!
    if (v.angulo < 0.001) continue
    let inicio = { ...v.entrada },
      direcao = v.direcao
    for (let total = 0; total < v.angulo - 0.001; ) {
      const angulo = Math.min(Math.PI / 2, v.angulo - total),
        giro = v.sinal > 0 ? -direcao : angulo + Math.PI - direcao
      const p =
        v.sinal > 0
          ? { x: C.x, z: C.z - r }
          : { x: C.x + r * Math.sin(angulo), z: C.z - r * Math.cos(angulo) }
      const c = Math.cos(giro),
        s = Math.sin(giro),
        origem = { x: inicio.x - c * p.x - s * p.z, z: inicio.z + s * p.x - c * p.z }
      saida.push({
        modelo: curvo,
        ...origem,
        giro,
        planos: [
          {
            x: Math.cos(angulo),
            z: Math.sin(angulo),
            limite: C.x * Math.cos(angulo) + C.z * Math.sin(angulo),
          },
        ],
      })
      const fim =
        v.sinal > 0
          ? { x: C.x + r * Math.sin(angulo), z: C.z - r * Math.cos(angulo) }
          : { x: C.x, z: C.z - r }
      inicio = { x: origem.x + c * fim.x + s * fim.z, z: origem.z - s * fim.x + c * fim.z }
      direcao += v.sinal * angulo
      total += angulo
    }
  }
  return saida
}
export const PERCURSO_DO_PILOTO = [
  { x: 0, z: 150 },
  { x: 0, z: 137 },
  { x: 20, z: 139 },
  { x: 20, z: 147 },
  { x: 35, z: 147 },
  { x: 58, z: 139 },
  { x: 58, z: 133.5 },
]

/** A rede usada pelo desenho, pela física e pelo registro de arte é a mesma. */
export function passeiosDaFaisca(piso: PisoDaFaisca): ModuloDePasseio[] {
  return [
    ...montarPasseio(PERCURSO_DO_PILOTO, piso),
    ...montarPasseio(
      [
        { x: 0, z: 137 },
        { x: -24, z: 132 },
      ],
      piso,
    ),
    ...montarPasseio(
      [
        { x: 0, z: 137 },
        { x: 20, z: 153 },
        { x: 22, z: 171 },
      ],
      piso,
    ),
    ...montarPasseio(
      [
        { x: -14, z: 145 },
        { x: -9, z: 143 },
      ],
      piso,
    ),
  ]
}
