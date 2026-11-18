import {
  type CaminhoDeCenario,
  curvaDoCaminho,
  lateraisDaCurva,
} from '@sistemazero/molda-cenarios-core/v2'

/** Mesmo perfil em dupla precisão usado pela faixa nativa, antes de gerar buffers GPU. */
export function perfilDoPiso(caminho: CaminhoDeCenario) {
  const origem = caminho.pontos[0]!,
    curva = curvaDoCaminho({
      ...caminho,
      pontos: caminho.pontos.map((p) => ({ x: p.x - origem.x, z: p.z - origem.z })),
    }),
    laterais = lateraisDaCurva(curva)
  return {
    origem,
    curva,
    em(distancia: number, lateral: number) {
      const d = Math.min(curva.comprimento, Math.max(0, distancia))
      let a = 0,
        b = curva.distancias.length - 1
      while (b - a > 1) {
        const m = (a + b) >> 1
        if (curva.distancias[m]! <= d) a = m
        else b = m
      }
      const proximo = (a + 1) % curva.pontos.length,
        p = curva.pontos[a]!,
        q = curva.pontos[proximo]!,
        n = laterais[a]!,
        m = laterais[proximo]!,
        comprimento = curva.distancias[a + 1]! - curva.distancias[a]!,
        t = (d - curva.distancias[a]!) / comprimento,
        lx = n.x + (m.x - n.x) * t,
        lz = n.z + (m.z - n.z) * t
      return {
        x: p.x + (q.x - p.x) * t + lx * lateral,
        z: p.z + (q.z - p.z) * t + lz * lateral,
        duX: (q.x - p.x + (m.x - n.x) * lateral) / comprimento,
        duZ: (q.z - p.z + (m.z - n.z) * lateral) / comprimento,
        dlX: lx,
        dlZ: lz,
      }
    },
  }
}
