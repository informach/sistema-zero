/**
 * O balão da Ilha das Nuvens (fase4-09, regras puras, sem three nem física): subir no cesto parado,
 * voar segurando o fogo, pousar e descer. O modo `balao` (`modos/balao.ts`) liga isto ao corpo;
 * o desenho e o interativo moram em `mundo/balao-das-nuvens.tsx`. Nada é gravado: o balão sempre
 * recomeça parado no lugar dele. Nada aqui aloca por passo.
 */
import type { Ponto } from './cipo'

/** Os números do balão, em metros e segundos (o plano da fase4-09 explica cada um). */
export const BALAO = {
  /** Sobe no cesto a até isto do meio dele, a pé. */
  alcance: 1.6,
  /** O passo de entrar no cesto e o pulinho por cima da borda (0,82 m). */
  embarque: 0.7,
  passoAlto: 0.95,
  /** Com o fogo aceso: a aceleração para cima e a velocidade máxima de subida. */
  subida: { aceleracao: 1.4, maxima: 1.8 },
  /**
   * Sem o fogo: o embalo para cima acaba com `freio` (uns 1,1 m depois de soltar a 1,8 m/s) e
   * depois desce devagar, até `maxima`.
   */
  descida: { aceleracao: 0.7, maxima: 0.7, freio: 1.5 },
  /** O direcional: a aceleração de lado, a velocidade máxima e o ar que segura (por segundo). */
  lado: { aceleracao: 1.6, maxima: 3, arrasto: 0.85 },
  /** Pousado, o cesto para de deslizar depressa (por segundo). */
  atritoPousado: 8,
  /** Teto: metros acima do tampo da ilha. */
  teto: 18,
  /**
   * A brisa mansa: passando do raio, traz de volta, crescendo até `brisa` m/s² em `faixa` m (mais
   * que o direcional: empurrando para fora, o cesto para dentro da faixa e volta).
   */
  raio: 24,
  faixaDaBrisa: 6,
  brisa: 4,
  /** Fora do chão da ilha o ar segura o cesto a esta altura acima do tampo. */
  raioDoChao: 19.2,
  alturaNoAr: 1.5,
  /** Descendo a até isto do lugar do balão, a criança sai para o lado (o cesto parado ocupa ali). */
  pertoDaCasa: 1.5,
  /** Quanto ela anda para o meio da ilha ao sair perto do lugar do balão. */
  saida: 1.4,
  /** O corpo parou mais alto que o pedido por mais que isto: encostou embaixo (pousou). */
  folgaDoPouso: 0.005,
  /** Pousado, o cesto pressiona o apoio com esta velocidade (m/s) para saber que ele continua lá. */
  pressao: 1.2,
} as const

export type FaseDoBalao = 'parado' | 'embarque' | 'voo'

/** O botão de descer, no lugar do alvo do mundo (no voo o mundo lá embaixo não oferece nada). */
export const DESCER_DO_BALAO = { id: 'balao:descer', rotulo: 'Descer do balão' } as const

/** Um balão. Mutável e lido a cada quadro (o modo escreve, o desenho e a câmera leem). */
export interface Voo {
  fase: FaseDoBalao
  /** Onde o cesto fica parado (a base dele, no mundo). */
  casa: Ponto
  /** O meio da ilha (a brisa puxa para cá) e a altura do tampo. */
  centro: { x: number; z: number }
  tampo: number
  /** A base do cesto agora, no mundo (onde os pés ficam). */
  pe: Ponto
  vel: Ponto
  fogo: boolean
  pousado: boolean
  /** A altura dos pés que o último passo pediu (o pouso compara com a de verdade). */
  pedidoY: number
  /** Segundos na fase (o passo de entrar). */
  tempo: number
  /** De onde os pés saíram ao subir no cesto. */
  inicio: Ponto
  /** Desceu perto do lugar do balão: para onde os pés vão (o mundo leva e limpa). */
  saida: Ponto | null
  /** A base do cesto como está desenhada (com o clipe), escrita pelo desenho. */
  visual: Ponto
}

export function criarVoo(casa: Ponto, centro: { x: number; z: number }, tampo: number): Voo {
  return {
    fase: 'parado',
    casa: { ...casa },
    centro: { ...centro },
    tampo,
    pe: { ...casa },
    vel: { x: 0, y: 0, z: 0 },
    fogo: false,
    pousado: true,
    pedidoY: casa.y,
    tempo: 0,
    inicio: { ...casa },
    saida: null,
    visual: { ...casa },
  }
}

/** Dá para subir no cesto: ele está parado e os pés estão a pé, perto dele. */
export function podeSubirNoBalao(v: Voo, pes: Ponto, noChao: boolean): boolean {
  return (
    v.fase === 'parado' &&
    noChao &&
    Math.hypot(pes.x - v.casa.x, pes.z - v.casa.z) <= BALAO.alcance &&
    Math.abs(pes.y - v.casa.y) < 0.6
  )
}

/** Começa o passo de entrar no cesto, dos pés de agora. */
export function subirNoBalao(v: Voo, pes: Ponto): void {
  v.fase = 'embarque'
  v.tempo = 0
  v.inicio.x = pes.x
  v.inicio.y = pes.y
  v.inicio.z = pes.z
  v.saida = null
}

/** O balão volta ao lugar dele, parado (desceu, a ilha saiu, um corte levou a criança). */
export function guardarBalao(v: Voo): void {
  v.fase = 'parado'
  v.tempo = 0
  v.fogo = false
  v.pousado = true
  v.vel.x = v.vel.y = v.vel.z = 0
  v.pe.x = v.casa.x
  v.pe.y = v.casa.y
  v.pe.z = v.casa.z
  v.pedidoY = v.casa.y
}

/** O que o passo do voo lê do corpo e do controle. */
export interface EntradaDoVoo {
  dt: number
  /** Menu, painel ou pausa: nada anda. */
  parado: boolean
  /** Segurando Pular (no toque, "Subir"). */
  subir: boolean
  /** O direcional no mundo (até 1 de comprimento). */
  pedidoX: number
  pedidoZ: number
  /** Os pés do corpo agora (onde a física deixou depois do último passo). */
  pes: Ponto
}

const suave = (t: number) => t * t * (3 - 2 * t)

/** Aproxima `de` de `para` em no máximo `passo`. */
function aproximar(de: number, para: number, passo: number): number {
  return de < para ? Math.min(para, de + passo) : Math.max(para, de - passo)
}

/**
 * Um passo do balão: escreve em `v.pe` onde a base do cesto (e os pés) deve ir. No voo, começa de
 * onde a física deixou o corpo: se ele parou mais alto que o pedido, encostou em algo por baixo e
 * pousou.
 */
export function passoDoBalao(v: Voo, e: EntradaDoVoo): void {
  if (v.fase === 'parado') return
  if (v.fase === 'embarque') {
    if (!e.parado) v.tempo += e.dt
    const t = Math.min(1, v.tempo / BALAO.embarque)
    const k = suave(t)
    v.pe.x = v.inicio.x + (v.casa.x - v.inicio.x) * k
    v.pe.z = v.inicio.z + (v.casa.z - v.inicio.z) * k
    v.pe.y = v.inicio.y + (v.casa.y - v.inicio.y) * k + Math.sin(Math.PI * t) * BALAO.passoAlto
    if (t >= 1) {
      v.fase = 'voo'
      v.tempo = 0
      v.pousado = true
      v.pe.y = v.casa.y
      // Um pouco abaixo dos pés: o primeiro passo do voo já encontra o chão (pousado).
      v.pedidoY = v.casa.y - 2 * BALAO.folgaDoPouso
      v.vel.x = v.vel.y = v.vel.z = 0
    }
    return
  }
  // No voo, a física manda: o cesto está onde o corpo ficou.
  const encostou = e.pes.y > v.pedidoY + BALAO.folgaDoPouso
  v.pe.x = e.pes.x
  v.pe.y = e.pes.y
  v.pe.z = e.pes.z
  if (encostou && v.vel.y <= 0) {
    v.vel.y = 0
    v.pousado = true
  } else if (v.pousado && !v.fogo) v.pousado = false
  if (e.parado) {
    v.fogo = false
    v.pedidoY = v.pe.y
    return
  }
  const dt = e.dt
  v.fogo = e.subir
  if (v.fogo) {
    v.vel.y = Math.min(BALAO.subida.maxima, Math.max(0, v.vel.y) + BALAO.subida.aceleracao * dt)
    v.pousado = false
  } else if (v.pousado) v.vel.y = 0
  else if (v.vel.y > 0) v.vel.y = Math.max(0, v.vel.y - BALAO.descida.freio * dt)
  else v.vel.y = aproximar(v.vel.y, -BALAO.descida.maxima, BALAO.descida.aceleracao * dt)

  if (v.pousado) {
    // No chão o vento não arrasta o cesto, e o direcional não o empurra.
    const k = Math.exp(-BALAO.atritoPousado * dt)
    v.vel.x *= k
    v.vel.z *= k
  } else {
    v.vel.x += e.pedidoX * BALAO.lado.aceleracao * dt
    v.vel.z += e.pedidoZ * BALAO.lado.aceleracao * dt
    if (Math.hypot(e.pedidoX, e.pedidoZ) < 0.05) {
      const k = Math.exp(-BALAO.lado.arrasto * dt)
      v.vel.x *= k
      v.vel.z *= k
    }
    // A brisa mansa de volta, passando do raio.
    const dx = v.pe.x - v.centro.x
    const dz = v.pe.z - v.centro.z
    const d = Math.hypot(dx, dz)
    if (d > BALAO.raio) {
      const forca = BALAO.brisa * Math.min(1, (d - BALAO.raio) / BALAO.faixaDaBrisa)
      v.vel.x -= (dx / d) * forca * dt
      v.vel.z -= (dz / d) * forca * dt
      // E o ar segura o que ainda vai para fora (sem tranco: só tira o embalo de sair).
      const saindo = (v.vel.x * dx + v.vel.z * dz) / d
      if (saindo > 0) {
        const k = 1 - Math.exp(-BALAO.lado.arrasto * dt)
        v.vel.x -= (dx / d) * saindo * k
        v.vel.z -= (dz / d) * saindo * k
      }
    }
    const lado = Math.hypot(v.vel.x, v.vel.z)
    if (lado > BALAO.lado.maxima) {
      v.vel.x *= BALAO.lado.maxima / lado
      v.vel.z *= BALAO.lado.maxima / lado
    }
  }

  v.pe.x += v.vel.x * dt
  // Pousado, o cesto continua apoiado (pressiona um pouco): se o apoio sai, ele volta a descer.
  v.pe.y += (v.pousado ? -BALAO.pressao : v.vel.y) * dt
  v.pe.z += v.vel.z * dt
  const teto = v.tampo + BALAO.teto
  if (v.pe.y > teto) {
    v.pe.y = teto
    if (v.vel.y > 0) v.vel.y = 0
  }
  // Fora do chão da ilha o ar segura o cesto; em cima dela, quem segura é o chão de verdade.
  if (Math.hypot(v.pe.x - v.centro.x, v.pe.z - v.centro.z) > BALAO.raioDoChao) {
    const piso = v.tampo + BALAO.alturaNoAr
    if (v.pe.y < piso) {
      v.pe.y = piso
      if (v.vel.y < 0) v.vel.y = 0
    }
  }
  v.pedidoY = v.pe.y
}

/** Bateu em algo de lado ou por cima: para naquele rumo (a física já segurou o corpo). */
export function balaoObstruido(v: Voo): void {
  v.vel.x = 0
  v.vel.z = 0
  if (v.vel.y > 0) v.vel.y = 0
}

/** Pode descer do cesto: está no voo e pousado. */
export function podeDescerDoBalao(v: Voo): boolean {
  return v.fase === 'voo' && v.pousado
}

/**
 * Desce do cesto: perto do lugar do balão, para onde os pés vão (para o meio da ilha); longe dele,
 * `null` (fica de pé onde pousou). O balão volta ao lugar dele.
 */
export function descerDoBalao(v: Voo): Ponto | null {
  const dx = v.pe.x - v.casa.x
  const dz = v.pe.z - v.casa.z
  let saida: Ponto | null = null
  if (Math.hypot(dx, dz) < BALAO.pertoDaCasa) {
    const mx = v.centro.x - v.casa.x
    const mz = v.centro.z - v.casa.z
    const m = Math.hypot(mx, mz) || 1
    saida = {
      x: v.casa.x + (mx / m) * BALAO.saida,
      y: v.casa.y,
      z: v.casa.z + (mz / m) * BALAO.saida,
    }
  }
  guardarBalao(v)
  v.saida = saida
  return saida
}
