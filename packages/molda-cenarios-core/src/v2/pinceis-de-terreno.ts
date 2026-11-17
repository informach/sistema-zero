import { type CampoDeAlturas, type RegiaoDoCampo, regiaoDoRetangulo } from './campo-de-alturas'
import { TerrenoInvalido } from './terreno'

/**
 * Pincéis de terreno. Cada função aplica UMA pincelada no campo recebido (altera o campo) e
 * devolve a região de amostras tocadas, ou nulo se o pincel caiu fora do terreno. Um gesto é
 * uma sequência de pinceladas; quem chama une as regiões e regrava só as peças atingidas.
 *
 * Tudo aqui é determinístico e sem funções transcendentes: ver `campo-de-alturas.ts`.
 */
export interface PincelDeTerreno {
  x: number
  z: number
  /** Raio em metros. */
  raio: number
  /** 0 a 1: quanto da ação vale no centro. */
  forca: number
  /** 0 a 1: fração do raio com efeito cheio antes da borda suave. Padrão 0,5. */
  dureza?: number
}

const invalidar = (frase: string): never => {
  throw new TerrenoInvalido(frase)
}
const limitar = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
/** Curva suave de 0 a 1, com derivada zero nas pontas. */
export const suave = (t: number) => {
  const s = limitar(t, 0, 1)
  return s * s * (3 - 2 * s)
}

function conferirPincel(p: PincelDeTerreno) {
  if (
    !Number.isFinite(p.x) ||
    !Number.isFinite(p.z) ||
    !(p.raio > 0) ||
    p.raio > 4096 ||
    !(p.forca >= 0) ||
    p.forca > 1 ||
    (p.dureza !== undefined && !(p.dureza >= 0 && p.dureza <= 1))
  )
    invalidar('O pincel de terreno é inválido')
}
const conferirMedida = (v: number, limite = 20_000) => {
  if (!Number.isFinite(v) || Math.abs(v) > limite) invalidar('A medida do pincel é inválida')
}

/** Peso de 0 a 1 de uma amostra à distância `d` do centro, sem contar a força. */
export function pesoDoPincel(d: number, raio: number, dureza = 0.5): number {
  const t = d / raio
  if (t >= 1) return 0
  if (t <= dureza) return 1
  return suave(1 - (t - dureza) / (1 - dureza))
}

/** Percorre as amostras sob o pincel. `fn` recebe a altura atual e devolve a nova. */
function pincelar(
  campo: CampoDeAlturas,
  p: PincelDeTerreno,
  fn: (h: number, peso: number, x: number, z: number, i: number) => number,
): RegiaoDoCampo | null {
  conferirPincel(p)
  const regiao = regiaoDoRetangulo(campo, p.x - p.raio, p.z - p.raio, p.x + p.raio, p.z + p.raio)
  if (!regiao || p.forca === 0) return null
  const largura = campo.colunas + 1
  for (let iz = regiao.z0; iz <= regiao.z1; iz++) {
    const z = campo.origem.z + iz * campo.passo
    for (let ix = regiao.x0; ix <= regiao.x1; ix++) {
      const x = campo.origem.x + ix * campo.passo,
        dx = x - p.x,
        dz = z - p.z,
        peso = pesoDoPincel(Math.sqrt(dx * dx + dz * dz), p.raio, p.dureza) * p.forca
      if (peso <= 0) continue
      const i = iz * largura + ix
      campo.alturas[i] = limitar(fn(campo.alturas[i]!, peso, x, z, i), campo.min, campo.max)
    }
  }
  return regiao
}

/** Sobe o chão até `metros` no centro. Valor negativo abaixa. */
export function elevarTerreno(campo: CampoDeAlturas, p: PincelDeTerreno, metros: number) {
  conferirMedida(metros)
  return pincelar(campo, p, (h, peso) => h + metros * peso)
}
export const abaixarTerreno = (campo: CampoDeAlturas, p: PincelDeTerreno, metros: number) =>
  elevarTerreno(campo, p, -metros)

/**
 * Leva o chão para uma altura. É o Aplainar (altura lida no começo do gesto) e o
 * Nivelar na altura (altura digitada).
 */
export function aplainarTerreno(campo: CampoDeAlturas, p: PincelDeTerreno, altura: number) {
  conferirMedida(altura)
  return pincelar(campo, p, (h, peso) => h + (altura - h) * peso)
}

/** Platô: miolo exatamente na altura pedida e borda suave em volta. */
export function fazerPlato(
  campo: CampoDeAlturas,
  p: Omit<PincelDeTerreno, 'forca'>,
  altura: number,
) {
  return aplainarTerreno(campo, { dureza: 0.75, ...p, forca: 1 }, altura)
}

/** Aproxima cada amostra da média das vizinhas, lida antes da pincelada. */
export function suavizarTerreno(campo: CampoDeAlturas, p: PincelDeTerreno) {
  conferirPincel(p)
  const largura = campo.colunas + 1,
    area = regiaoDoRetangulo(campo, p.x - p.raio, p.z - p.raio, p.x + p.raio, p.z + p.raio)
  if (!area) return null
  // Cópia só das linhas que o pincel alcança, com uma de folga de cada lado.
  const primeira = Math.max(0, area.z0 - 1) * largura,
    antes = campo.alturas.slice(primeira, (Math.min(campo.linhas, area.z1 + 1) + 1) * largura)
  return pincelar(campo, p, (h, peso, _x, _z, i) => {
    const ix = i % largura,
      iz = (i - ix) / largura
    let soma = 0,
      n = 0
    for (let dz = -1; dz <= 1; dz++)
      for (let dx = -1; dx <= 1; dx++) {
        const x = ix + dx,
          z = iz + dz
        if (x < 0 || z < 0 || x > campo.colunas || z > campo.linhas) continue
        soma += antes[z * largura + x - primeira]!
        n++
      }
    return h + (soma / n - h) * peso
  })
}

/** Morro arredondado: sobe `altura` no centro e cai suave até a borda. */
export function carimbarMorro(
  campo: CampoDeAlturas,
  p: Omit<PincelDeTerreno, 'forca' | 'dureza'>,
  altura: number,
) {
  return elevarTerreno(campo, { ...p, forca: 1, dureza: 0 }, altura)
}

/** Cratera: bacia com a profundidade pedida e um anel de borda levantado. */
export function carimbarCratera(
  campo: CampoDeAlturas,
  p: Omit<PincelDeTerreno, 'forca' | 'dureza'>,
  opcoes: { profundidade: number; borda?: number },
) {
  const borda = opcoes.borda ?? opcoes.profundidade * 0.25
  conferirMedida(opcoes.profundidade)
  conferirMedida(borda)
  if (opcoes.profundidade < 0 || borda < 0) invalidar('A cratera tem medidas negativas')
  const MIOLO = 0.7
  return pincelar(campo, { ...p, forca: 1, dureza: 0 }, (h, _peso, x, z) => {
    const dx = x - p.x,
      dz = z - p.z,
      t = Math.sqrt(dx * dx + dz * dz) / p.raio
    if (t < MIOLO) {
      const u = t / MIOLO
      return h - opcoes.profundidade * (1 - u * u) + borda * u * u
    }
    return h + borda * suave((1 - t) / (1 - MIOLO))
  })
}

export interface RampaDeTerreno {
  /** Pontas do eixo da rampa. Sem `y`, a ponta fica na altura que o chão já tem ali. */
  de: { x: number; z: number; y?: number }
  ate: { x: number; z: number; y?: number }
  largura: number
  /** Faixa de transição de cada lado, em metros. Padrão: um quarto da largura. */
  borda?: number
}

/** Rampa reta entre dois pontos, com piso de largura fixa e taludes suaves dos lados. */
export function fazerRampa(
  campo: CampoDeAlturas,
  r: RampaDeTerreno,
  alturaEm: (x: number, z: number) => number,
): RegiaoDoCampo | null {
  const borda = r.borda ?? r.largura / 4
  for (const v of [r.de.x, r.de.z, r.ate.x, r.ate.z, r.de.y ?? 0, r.ate.y ?? 0])
    conferirMedida(v, 1e5)
  if (!(r.largura > 0) || r.largura > 512 || !(borda >= 0) || borda > 512)
    invalidar('A largura da rampa é inválida')
  const ya = r.de.y ?? alturaEm(r.de.x, r.de.z),
    yb = r.ate.y ?? alturaEm(r.ate.x, r.ate.z),
    ex = r.ate.x - r.de.x,
    ez = r.ate.z - r.de.z,
    comprimento2 = ex * ex + ez * ez
  if (comprimento2 < 1e-6) invalidar('A rampa precisa de duas pontas diferentes')
  const meia = r.largura / 2,
    alcance = meia + borda
  const regiao = regiaoDoRetangulo(
    campo,
    Math.min(r.de.x, r.ate.x) - alcance,
    Math.min(r.de.z, r.ate.z) - alcance,
    Math.max(r.de.x, r.ate.x) + alcance,
    Math.max(r.de.z, r.ate.z) + alcance,
  )
  if (!regiao) return null
  const largura = campo.colunas + 1
  for (let iz = regiao.z0; iz <= regiao.z1; iz++) {
    const z = campo.origem.z + iz * campo.passo
    for (let ix = regiao.x0; ix <= regiao.x1; ix++) {
      const x = campo.origem.x + ix * campo.passo,
        t = limitar(((x - r.de.x) * ex + (z - r.de.z) * ez) / comprimento2, 0, 1),
        dx = x - (r.de.x + ex * t),
        dz = z - (r.de.z + ez * t),
        d = Math.sqrt(dx * dx + dz * dz)
      if (d >= alcance) continue
      const peso = d <= meia ? 1 : suave(1 - (d - meia) / borda),
        i = iz * largura + ix,
        h = campo.alturas[i]!
      campo.alturas[i] = limitar(h + (ya + (yb - ya) * t - h) * peso, campo.min, campo.max)
    }
  }
  return regiao
}

const inteiro = (ix: number, iz: number, semente: number) => {
  let h = Math.imul(ix, 0x27d4eb2d) ^ Math.imul(iz, 0x165667b1) ^ Math.imul(semente, 0x9e3779b1)
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b)
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** Ruído de valor em [-1, 1], contínuo, repetível pela semente. `x` e `z` em unidades da malha. */
export function ruidoDeValor(x: number, z: number, semente: number): number {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    u = suave(x - ix),
    v = suave(z - iz),
    a = inteiro(ix, iz, semente),
    b = inteiro(ix + 1, iz, semente),
    c = inteiro(ix, iz + 1, semente),
    d = inteiro(ix + 1, iz + 1, semente)
  return (a + (b - a) * u + (c + (d - c) * u - (a + (b - a) * u)) * v) * 2 - 1
}

export interface RuidoDeTerreno {
  /** Tamanho em metros da maior ondulação. */
  escala: number
  /** 1 a 8 camadas, cada uma com metade do tamanho e metade da altura da anterior. */
  oitavas?: number
  semente: number
}

/** Soma de oitavas em [-1, 1], em coordenadas de mundo: pinceladas vizinhas se emendam. */
export function ruidoFractal(x: number, z: number, r: RuidoDeTerreno): number {
  const oitavas = r.oitavas ?? 4
  if (
    !(r.escala > 0) ||
    r.escala > 100_000 ||
    !Number.isInteger(oitavas) ||
    oitavas < 1 ||
    oitavas > 8 ||
    !Number.isInteger(r.semente)
  )
    invalidar('O ruído do terreno é inválido')
  let soma = 0,
    amplitude = 1,
    total = 0,
    frequencia = 1 / r.escala
  for (let o = 0; o < oitavas; o++) {
    soma += ruidoDeValor(x * frequencia, z * frequencia, r.semente + o * 1013) * amplitude
    total += amplitude
    amplitude /= 2
    frequencia *= 2
  }
  return soma / total
}

/** Acrescenta irregularidade de até `amplitude` metros, para cima e para baixo. */
export function ruidoNoTerreno(
  campo: CampoDeAlturas,
  p: PincelDeTerreno,
  opcoes: RuidoDeTerreno & { amplitude: number },
) {
  conferirMedida(opcoes.amplitude)
  return pincelar(
    campo,
    p,
    (h, peso, x, z) => h + ruidoFractal(x, z, opcoes) * opcoes.amplitude * peso,
  )
}

/**
 * Erosão térmica: onde o declive passa do talude, a terra escorre para a amostra mais baixa.
 * Conserva o volume (o que sai de uma amostra entra na vizinha) e não cria degraus novos.
 */
export function erodirTerreno(
  campo: CampoDeAlturas,
  p: PincelDeTerreno,
  opcoes: { passadas?: number; talude?: number } = {},
): RegiaoDoCampo | null {
  conferirPincel(p)
  const passadas = opcoes.passadas ?? 4,
    talude = opcoes.talude ?? 0.6
  if (!Number.isInteger(passadas) || passadas < 1 || passadas > 64 || !(talude >= 0) || talude > 10)
    invalidar('A erosão é inválida')
  const regiao = regiaoDoRetangulo(campo, p.x - p.raio, p.z - p.raio, p.x + p.raio, p.z + p.raio)
  if (!regiao || p.forca === 0) return null
  const largura = campo.colunas + 1,
    lx = regiao.x1 - regiao.x0 + 1,
    lz = regiao.z1 - regiao.z0 + 1,
    pesos = new Float32Array(lx * lz),
    delta = new Float32Array(lx * lz),
    limite = talude * campo.passo
  for (let z = 0; z < lz; z++)
    for (let x = 0; x < lx; x++) {
      const dx = campo.origem.x + (regiao.x0 + x) * campo.passo - p.x,
        dz = campo.origem.z + (regiao.z0 + z) * campo.passo - p.z
      pesos[z * lx + x] = pesoDoPincel(Math.sqrt(dx * dx + dz * dz), p.raio, p.dureza) * p.forca
    }
  const mover = (a: number, b: number, ia: number, ib: number) => {
    const d = campo.alturas[ia]! - campo.alturas[ib]!,
      excesso = Math.abs(d) - limite
    if (excesso <= 0) return
    // 1/8 por par: mesmo com os quatro vizinhos mais baixos, o topo não vira buraco.
    const m = (d > 0 ? 1 : -1) * excesso * 0.125 * Math.min(pesos[a]!, pesos[b]!)
    delta[a] = delta[a]! - m
    delta[b] = delta[b]! + m
  }
  for (let n = 0; n < passadas; n++) {
    delta.fill(0)
    for (let z = 0; z < lz; z++)
      for (let x = 0; x < lx; x++) {
        const a = z * lx + x,
          ia = (regiao.z0 + z) * largura + regiao.x0 + x
        if (x + 1 < lx) mover(a, a + 1, ia, ia + 1)
        if (z + 1 < lz) mover(a, a + lx, ia, ia + largura)
      }
    for (let z = 0; z < lz; z++)
      for (let x = 0; x < lx; x++) {
        const i = (regiao.z0 + z) * largura + regiao.x0 + x
        campo.alturas[i] = limitar(campo.alturas[i]! + delta[z * lx + x]!, campo.min, campo.max)
      }
  }
  return regiao
}
