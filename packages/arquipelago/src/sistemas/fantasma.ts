import {
  AMOSTRAS_MAXIMAS_DO_FANTASMA,
  DURACAO_MAXIMA_DO_FANTASMA_MS,
  type Fantasma,
  PASSO_DO_FANTASMA_MS,
  type PercursoId,
} from '@sistemazero/arquipelago-contracts'

const VOLTA = 2 * Math.PI
const normalizar = (giro: number) => ((giro % VOLTA) + VOLTA) % VOLTA
const diferenca = (de: number, ate: number) => Math.atan2(Math.sin(ate - de), Math.cos(ate - de))
const valido = (t: number, x: number, y: number, z: number, g: number) =>
  Number.isFinite(t) &&
  Number.isFinite(x) &&
  Number.isFinite(y) &&
  Number.isFinite(z) &&
  Number.isFinite(g) &&
  t >= 0 &&
  t <= DURACAO_MAXIMA_DO_FANTASMA_MS &&
  Math.abs(x) <= 500 &&
  Math.abs(y) <= 500 &&
  Math.abs(z) <= 500

/** Um buffer por montagem. `quadro` não cria objetos/arrays e usa o relógio ativo da corrida. */
export function criarGravadorDeFantasma() {
  const dados = new Float32Array(AMOSTRAS_MAXIMAS_DO_FANTASMA * 5)
  let n = 0,
    t0 = 0,
    x0 = 0,
    y0 = 0,
    z0 = 0,
    g0 = 0,
    proximo = PASSO_DO_FANTASMA_MS
  let gravando = false
  function colocar(t: number, x: number, y: number, z: number, giro: number) {
    const i = n++ * 5
    dados[i] = t
    dados[i + 1] = x
    dados[i + 2] = y
    dados[i + 3] = z
    dados[i + 4] = normalizar(giro)
  }
  function quadro(t: number, x: number, y: number, z: number, giro: number) {
    if (!gravando) return
    t = Math.round(t)
    if (!Number.isFinite(t) || t < t0 || t > DURACAO_MAXIMA_DO_FANTASMA_MS) {
      gravando = false
      return
    }
    if (t === t0) return // Pausa não cria amostras nem muda a última pose.
    if (!valido(t, x, y, z, giro)) {
      gravando = false
      return
    }
    const dg = diferenca(g0, giro)
    while (proximo <= t) {
      const f = (proximo - t0) / (t - t0)
      colocar(proximo, x0 + (x - x0) * f, y0 + (y - y0) * f, z0 + (z - z0) * f, g0 + dg * f)
      proximo += PASSO_DO_FANTASMA_MS
    }
    t0 = t
    x0 = x
    y0 = y
    z0 = z
    g0 = normalizar(giro)
  }
  return {
    comecar(x: number, y: number, z: number, giro: number) {
      n = 0
      t0 = 0
      x0 = x
      y0 = y
      z0 = z
      g0 = normalizar(giro)
      proximo = PASSO_DO_FANTASMA_MS
      gravando = valido(0, x, y, z, giro)
      if (gravando) colocar(0, x, y, z, giro)
    },
    quadro,
    cancelar() {
      gravando = false
    },
    terminar(
      percurso: PercursoId,
      tempoMs: number,
      x: number,
      y: number,
      z: number,
      giro: number,
    ): Fantasma | null {
      quadro(tempoMs, x, y, z, giro)
      if (!gravando || !Number.isInteger(tempoMs) || tempoMs < 1) {
        gravando = false
        return null
      }
      gravando = false
      if (dados[(n - 1) * 5]! < tempoMs) colocar(tempoMs, x, y, z, giro)
      const amostras: Fantasma['amostras'] = []
      for (let i = 0; i < n; i++)
        amostras.push([
          Math.round(dados[i * 5 + 1]! * 100),
          Math.round(dados[i * 5 + 2]! * 100),
          Math.round(dados[i * 5 + 3]! * 100),
          Math.round((normalizar(dados[i * 5 + 4]!) / VOLTA) * 65_536) % 65_536,
        ])
      return { versao: 1, percurso, tempoMs, passoMs: PASSO_DO_FANTASMA_MS, amostras }
    },
  }
}

/** Escreve na pose recebida. O renderer não cria vetores nem mexe na física. */
export function amostrarFantasma(
  f: Fantasma,
  tempoMs: number,
  pose: { x: number; y: number; z: number; giro: number },
): void {
  const t = Math.max(0, Math.min(f.tempoMs, Number.isFinite(tempoMs) ? tempoMs : 0))
  const i = Math.min(f.amostras.length - 2, Math.floor(t / f.passoMs))
  const a = f.amostras[i]!,
    b = f.amostras[i + 1]!
  const duracao = Math.min(f.passoMs, f.tempoMs - i * f.passoMs)
  const p = (t - i * f.passoMs) / duracao
  pose.x = (a[0] + (b[0] - a[0]) * p) / 100
  pose.y = (a[1] + (b[1] - a[1]) * p) / 100
  pose.z = (a[2] + (b[2] - a[2]) * p) / 100
  const ga = (a[3] / 65_536) * VOLTA,
    gb = (b[3] / 65_536) * VOLTA
  pose.giro = normalizar(ga + diferenca(ga, gb) * p)
}
