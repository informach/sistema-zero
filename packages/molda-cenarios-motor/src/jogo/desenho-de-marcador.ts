import {
  type DocumentoDeCenario,
  destransformarPonto,
  type FonteDeAlturas,
  type MarcadorDeCenario,
  rotaDoMarcador,
  transformacaoDoMarcador,
} from '@sistemazero/molda-cenarios-core/v2'
import { Matrix4, Vector3 } from 'three'

type P = { x: number; y: number; z: number }
const ponto = (x = 0, y = 0, z = 0): P => ({ x, y, z })

/** Guias de edição em segmentos locais. Não são arte publicada nem fontes de colisão. */
export function desenhoDoMarcador(
  doc: Pick<DocumentoDeCenario, 'base'>,
  marcador: MarcadorDeCenario,
  fonte?: FonteDeAlturas,
  aspecto = 1.5,
): Float32Array {
  if (!Number.isFinite(aspecto) || aspecto < 0.1 || aspecto > 10)
    throw Error('A proporção da câmera de referência é inválida.')
  const dados: number[] = [],
    c = marcador.configuracao
  const linha = (a: P, b: P) => {
    if (dados.length / 3 + 2 > 32_768)
      throw Error('O marcador exige segmentos demais. Divida o percurso.')
    for (const p of [a, b]) {
      if (![p.x, p.y, p.z].every((v) => Number.isFinite(v) && Math.abs(v) <= 1_000_000))
        throw Error('O desenho do marcador encontrou uma medida inválida.')
      dados.push(p.x, p.y, p.z)
    }
  }
  const circulo = (raio: number, centro: P, plano: 'xy' | 'xz' | 'yz', segmentos = 24) => {
    for (let i = 0; i < segmentos; i++) {
      const em = (n: number) => {
        const a = (n * Math.PI * 2) / segmentos,
          x = Math.cos(a) * raio,
          y = Math.sin(a) * raio
        return {
          x: centro.x + (plano === 'yz' ? 0 : x),
          y: centro.y + (plano === 'xz' ? 0 : plano === 'xy' ? y : x),
          z: centro.z + (plano === 'xy' ? 0 : y),
        }
      }
      linha(em(i), em(i + 1))
    }
  }
  const caixa = (x: number, y: number, z: number) => {
    const cantos = Array.from({ length: 8 }, (_, i) =>
      ponto(((i & 1 ? 1 : -1) * x) / 2, ((i & 2 ? 1 : -1) * y) / 2, ((i & 4 ? 1 : -1) * z) / 2),
    )
    for (let i = 0; i < 8; i++)
      for (const bit of [1, 2, 4]) if (!(i & bit)) linha(cantos[i]!, cantos[i | bit]!)
  }
  const bandeira = () => {
    linha(ponto(), ponto(0, 1))
    linha(ponto(0, 1), ponto(0.5, 0.8))
    linha(ponto(0.5, 0.8), ponto(0, 0.6))
  }
  if (!c || c.tipo === 'ponto') bandeira()
  else if (c.tipo === 'inicio') {
    circulo(0.35, ponto(0, 0.02), 'xz')
    linha(ponto(0, 0.02, 0.25), ponto(0, 0.02, -0.6))
    linha(ponto(0, 0.02, -0.6), ponto(-0.2, 0.02, -0.35))
    linha(ponto(0, 0.02, -0.6), ponto(0.2, 0.02, -0.35))
    bandeira()
  } else if (c.tipo === 'zona') {
    const f = c.forma
    if (f.tipo === 'caixa') caixa(f.tamanho.x, f.tamanho.y, f.tamanho.z)
    else if (f.tipo === 'esfera')
      for (const plano of ['xy', 'xz', 'yz'] as const) circulo(f.raio, ponto(), plano)
    else
      for (let i = 0; i < f.pontos.length; i++) {
        const a = f.pontos[i]!,
          b = f.pontos[(i + 1) % f.pontos.length]!
        linha({ ...a, y: 0 }, { ...b, y: 0 })
        linha({ ...a, y: f.altura }, { ...b, y: f.altura })
        linha({ ...a, y: 0 }, { ...a, y: f.altura })
      }
  } else if (c.tipo === 'rota') {
    const t = transformacaoDoMarcador(doc, marcador, fonte),
      pontos = rotaDoMarcador(doc, marcador, fonte).pontos.map((p) => destransformarPonto(p, t))
    for (let i = 1; i < pontos.length; i++) linha(pontos[i - 1]!, pontos[i]!)
  } else if (c.tipo === 'camera') {
    const alvo = new Vector3(c.alvo.x, c.alvo.y, c.alvo.z),
      distancia = Math.min(3, alvo.length()),
      h = Math.tan((c.campoDeVisao * Math.PI) / 360) * distancia,
      giro = new Matrix4().lookAt(new Vector3(), alvo, new Vector3(0, 1, 0)),
      cantos = [
        [-1, -1],
        [1, -1],
        [1, 1],
        [-1, 1],
      ].map(([x, y]) => new Vector3(x! * h * aspecto, y! * h, -distancia).applyMatrix4(giro))
    for (let i = 0; i < 4; i++) {
      linha(ponto(), cantos[i]!)
      linha(cantos[i]!, cantos[(i + 1) % 4]!)
    }
    linha(ponto(), c.alvo)
  } else if (c.tipo === 'luz') {
    for (const plano of ['xy', 'xz', 'yz'] as const) circulo(0.2, ponto(), plano, 12)
    if (c.luz.tipo === 'foco') {
      const alvo = new Vector3(c.luz.alvo.x, c.luz.alvo.y, c.luz.alvo.z),
        distancia = Math.min(3, c.luz.alcance),
        raio = Math.tan((c.luz.angulo * Math.PI) / 180) * distancia,
        giro = new Matrix4().lookAt(new Vector3(), alvo, new Vector3(0, 1, 0)),
        anel = Array.from({ length: 24 }, (_, i) =>
          new Vector3(
            Math.cos((i * Math.PI) / 12) * raio,
            Math.sin((i * Math.PI) / 12) * raio,
            -distancia,
          ).applyMatrix4(giro),
        )
      for (let i = 0; i < anel.length; i++) {
        linha(anel[i]!, anel[(i + 1) % anel.length]!)
        if (i % 6 === 0) linha(ponto(), anel[i]!)
      }
    }
  } else if (c.tipo === 'regua') {
    linha(ponto(), c.fim)
    const v = new Vector3(c.fim.x, c.fim.y, c.fim.z).normalize(),
      transversal = new Vector3()
        .crossVectors(v, Math.abs(v.y) < 0.9 ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0))
        .normalize()
        .multiplyScalar(0.15)
    for (const centro of [ponto(), c.fim])
      linha(
        { x: centro.x - transversal.x, y: centro.y - transversal.y, z: centro.z - transversal.z },
        { x: centro.x + transversal.x, y: centro.y + transversal.y, z: centro.z + transversal.z },
      )
  } else if (c.tipo === 'escala') {
    const h = c.altura
    circulo(h * 0.1, ponto(0, h * 0.9), 'xy')
    linha(ponto(0, h * 0.8), ponto(0, h * 0.45))
    linha(ponto(-h * 0.2, h * 0.55), ponto(0, h * 0.72))
    linha(ponto(h * 0.2, h * 0.55), ponto(0, h * 0.72))
    linha(ponto(0, h * 0.45), ponto(-h * 0.12))
    linha(ponto(0, h * 0.45), ponto(h * 0.12))
  }
  return Float32Array.from(dados)
}
