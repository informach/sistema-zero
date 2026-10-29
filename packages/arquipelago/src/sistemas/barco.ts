import type { Ponto } from './cipo'

/** Propostas da fase3-04, em metros e segundos. Sem gravar a viagem. */
export const BARCO = {
  amostrasPorTrecho: 20, // Curva preparada uma vez, com consulta binária no passo.
  passoDoArco: 10, // Graus entre guias no arco externo.
  avancoDaProa: 8, // Sai reto do píer antes de contornar a ilha.
  raioDeSaida: 60, // Canal entre as ilhas antes de alcançar o arco externo.
  velocidade: 12, // Travessia curta, reduzida automaticamente perto dos cais.
  pertoDoCais: 10, // Faixa de aproximação a 2 m/s.
  velocidadeNoCais: 2,
  embarque: 1.5, // Tempo para passar do cais ao convés.
  passoAlto: 0.6, // Eleva os pés acima da amurada durante a passagem.
  alcance: 1.25, // Só embarca junto da âncora, fora da luneta.
  raioExterno: 120, // Fora do anel de 82 m e das rodas de nado.
  setorDeSaida: 110, // Entre Nuvens (80°) e Vale dos Dinos (140°).
  setorDeChegada: -70, // Aproxima o cais do Recife pelo mar a leste.
  corredor: 5, // Meia largura livre nas boias, incluindo casco e pneus.
  esperaDaIlha: 27, // Dentro da troca (30 m), fora da espera pelo chão (25 m).
  esperaMaxima: 20, // Falha de carga devolve ao porto de origem, sem deixar no mar.
} as const

export interface Porto {
  barco: Ponto
  giro: number
  embarque: Ponto
}
export interface AmostraDaRota extends Ponto {
  distancia: number
}
export interface RotaDoBarco {
  pontos: AmostraDaRota[]
  comprimento: number
}
export type FaseDoBarco = 'atracado' | 'embarque' | 'viagem' | 'espera' | 'desembarque'
export interface Travessia {
  portos: readonly [Porto, Porto]
  rota: RotaDoBarco
  passageiro: Ponto
  centroDoRecife: { x: number; z: number }
  fase: FaseDoBarco
  origem: 0 | 1
  destino: 0 | 1
  distancia: number
  anterior: {
    distancia: number
    tempo: number
    fase: FaseDoBarco
    pose: Ponto & { giro: number }
    pe: Ponto
  }
  tempo: number
  espera: number
  recifePronto: boolean
  inicio: Ponto
  pose: Ponto & { giro: number }
  pe: Ponto
  /** Âncora animada em coordenadas do mundo, atualizada pelo desenho. */
  visual: Ponto
  devolvendo: boolean
}

const rad = (graus: number) => (graus * Math.PI) / 180
const polar = (r: number, graus: number): Ponto => ({
  x: r * Math.cos(rad(graus)),
  y: 0,
  z: r * Math.sin(rad(graus)),
})
const suave = (t: number) => t * t * (3 - 2 * t)

/** Curva amostrada uma vez. O laço só consulta números e escreve na saída recebida. */
export function criarRotaDoBarco(a: Porto, b: Porto): RotaDoBarco {
  const guias: Ponto[] = [
    a.barco,
    { x: a.barco.x, y: 0, z: a.barco.z + BARCO.avancoDaProa },
    polar(BARCO.raioDeSaida, BARCO.setorDeSaida),
    polar(BARCO.raioExterno, BARCO.setorDeSaida),
  ]
  for (
    let angulo = BARCO.setorDeSaida - BARCO.passoDoArco;
    angulo >= BARCO.setorDeChegada;
    angulo -= BARCO.passoDoArco
  )
    guias.push(polar(BARCO.raioExterno, angulo))
  guias.push(b.barco)
  const pontos: AmostraDaRota[] = []
  let comprimento = 0
  for (let i = 0; i < guias.length - 1; i++) {
    const p0 = guias[Math.max(0, i - 1)]!
    const p1 = guias[i]!
    const p2 = guias[i + 1]!
    const p3 = guias[Math.min(guias.length - 1, i + 2)]!
    // Catmull-Rom: vinte amostras por trecho, só na construção da rota.
    for (let j = 0; j < BARCO.amostrasPorTrecho; j++) {
      const t = j / BARCO.amostrasPorTrecho
      const eixo = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t * t +
          (-a + 3 * b - 3 * c + d) * t * t * t)
      const p = {
        x: eixo(p0.x, p1.x, p2.x, p3.x),
        y: 0,
        z: eixo(p0.z, p1.z, p2.z, p3.z),
        distancia: 0,
      }
      const anterior = pontos.at(-1)
      if (anterior) comprimento += Math.hypot(p.x - anterior.x, p.z - anterior.z)
      p.distancia = comprimento
      pontos.push(p)
    }
  }
  const ultimo = pontos.at(-1)!
  comprimento += Math.hypot(b.barco.x - ultimo.x, b.barco.z - ultimo.z)
  pontos.push({ ...b.barco, distancia: comprimento })
  return { pontos, comprimento }
}

export function amostrarRota(
  rota: RotaDoBarco,
  distancia: number,
  saida: Ponto & { giro: number },
): void {
  const d = Math.max(0, Math.min(rota.comprimento, distancia))
  let baixo = 0
  let alto = rota.pontos.length - 1
  while (alto - baixo > 1) {
    const meio = (baixo + alto) >> 1
    if (rota.pontos[meio]!.distancia < d) baixo = meio
    else alto = meio
  }
  const a = rota.pontos[baixo]!
  const b = rota.pontos[alto]!
  const t = (d - a.distancia) / Math.max(1e-6, b.distancia - a.distancia)
  saida.x = a.x + (b.x - a.x) * t
  saida.y = a.y + (b.y - a.y) * t
  saida.z = a.z + (b.z - a.z) * t
  saida.giro = Math.atan2(-(b.z - a.z), b.x - a.x)
}

export function criarTravessia(
  portos: readonly [Porto, Porto],
  passageiro: Ponto,
  centroDoRecife: { x: number; z: number },
): Travessia {
  return {
    portos,
    passageiro,
    centroDoRecife,
    rota: criarRotaDoBarco(...portos),
    fase: 'atracado',
    origem: 0,
    destino: 1,
    distancia: 0,
    anterior: {
      distancia: 0,
      tempo: 0,
      fase: 'atracado',
      pose: { ...portos[0].barco, giro: portos[0].giro },
      pe: { ...portos[0].embarque },
    },
    tempo: 0,
    espera: 0,
    recifePronto: false,
    inicio: { x: 0, y: 0, z: 0 },
    pose: { ...portos[0].barco, giro: portos[0].giro },
    pe: { ...portos[0].embarque },
    visual: { ...portos[0].embarque },
    devolvendo: false,
  }
}

export function podeEmbarcar(
  v: Travessia,
  porto: 0 | 1,
  aberta: boolean,
  noChao: boolean,
  p: Ponto,
): boolean {
  const e = v.portos[porto].embarque
  return (
    aberta &&
    noChao &&
    v.fase === 'atracado' &&
    (porto === 0 || v.recifePronto) &&
    Math.hypot(p.x - e.x, p.z - e.z) <= BARCO.alcance &&
    Math.abs(p.y - e.y) < 0.5
  )
}

export function embarcar(v: Travessia, porto: 0 | 1, pe: Ponto): void {
  v.origem = porto
  v.destino = porto === 0 ? 1 : 0
  v.fase = 'embarque'
  v.tempo = v.espera = 0
  v.devolvendo = false
  v.distancia = porto === 0 ? 0 : v.rota.comprimento
  Object.assign(v.inicio, pe)
  Object.assign(v.pose, v.portos[porto].barco, { giro: v.portos[porto].giro })
}

function peNoConves(v: Travessia): void {
  const cos = Math.cos(v.pose.giro),
    sin = Math.sin(v.pose.giro)
  v.pe.x = v.pose.x + v.passageiro.x * cos + v.passageiro.z * sin
  v.pe.y = v.pose.y + v.passageiro.y
  v.pe.z = v.pose.z - v.passageiro.x * sin + v.passageiro.z * cos
}

/** Pausa não altera nem o tempo. Destino indisponível devolve pelo mesmo caminho. */
export function passoDaTravessia(v: Travessia, dt: number, pausado: boolean): void {
  if (pausado || v.fase === 'atracado') return
  v.anterior.distancia = v.distancia
  v.anterior.tempo = v.tempo
  v.anterior.fase = v.fase
  Object.assign(v.anterior.pose, v.pose)
  Object.assign(v.anterior.pe, v.pe)
  v.tempo += dt
  if (v.fase === 'embarque' || v.fase === 'desembarque') {
    peNoConves(v)
    const entrando = v.fase === 'embarque'
    const a = v.inicio
    const b = entrando ? v.pe : v.portos[v.destino].embarque
    const t = suave(Math.min(1, v.tempo / BARCO.embarque))
    v.pe.x = a.x + (b.x - a.x) * t
    v.pe.y = a.y + (b.y - a.y) * t + Math.sin(Math.PI * t) * BARCO.passoAlto
    v.pe.z = a.z + (b.z - a.z) * t
    if (v.tempo >= BARCO.embarque) {
      v.fase = entrando ? 'viagem' : 'atracado'
      v.tempo = 0
    }
    return
  }
  const perto =
    Math.hypot(v.pose.x - v.centroDoRecife.x, v.pose.z - v.centroDoRecife.z) < BARCO.esperaDaIlha
  if (v.destino === 1 && perto && !v.recifePronto) {
    v.fase = 'espera'
    v.espera += dt
    if (v.espera >= BARCO.esperaMaxima) {
      v.destino = 0
      v.devolvendo = true
      v.fase = 'viagem'
    }
    return
  }
  v.fase = 'viagem'
  const cais = Math.min(v.distancia, v.rota.comprimento - v.distancia)
  const velocidade =
    BARCO.velocidadeNoCais +
    (BARCO.velocidade - BARCO.velocidadeNoCais) * suave(Math.min(1, cais / BARCO.pertoDoCais))
  v.distancia = Math.max(
    0,
    Math.min(v.rota.comprimento, v.distancia + (v.destino === 1 ? 1 : -1) * velocidade * dt),
  )
  amostrarRota(v.rota, v.distancia, v.pose)
  if (v.destino === 0) v.pose.giro += Math.PI
  // Mantém o giro da arte no cais, misturando pela menor volta nos últimos metros.
  const porto = v.distancia < BARCO.pertoDoCais ? v.portos[0] : v.portos[1]
  const peso =
    1 -
    suave(Math.min(1, Math.min(v.distancia, v.rota.comprimento - v.distancia) / BARCO.pertoDoCais))
  v.pose.giro +=
    Math.atan2(Math.sin(porto.giro - v.pose.giro), Math.cos(porto.giro - v.pose.giro)) * peso
  peNoConves(v)
  if (v.distancia === (v.destino === 1 ? v.rota.comprimento : 0)) {
    v.fase = 'desembarque'
    v.tempo = 0
    Object.assign(v.inicio, v.pe)
  }
}

/** Distância ao caminho, usada uma vez para abrir só as boias dos portos. */
export function noCorredorDoBarco(rota: RotaDoBarco, p: { x: number; z: number }): boolean {
  for (let i = 1; i < rota.pontos.length; i++) {
    const a = rota.pontos[i - 1]!,
      b = rota.pontos[i]!
    const dx = b.x - a.x,
      dz = b.z - a.z
    const t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / Math.max(1e-9, dx * dx + dz * dz)),
    )
    if (Math.hypot(p.x - a.x - dx * t, p.z - a.z - dz * t) < BARCO.corredor) return true
  }
  return false
}
