/**
 * Qual animação do avatar aparece, e quanto de cada uma (regra pura, sem three nem React). É o que
 * os jogos chamam de máquina de estados com "blend": parado, andar e correr se misturam pela
 * velocidade; pular, cair, aterrissar e nadar entram e saem com transição suave.
 *
 * Os clipes saem de `arte/avatar/locomocao.py` (`src/assets/avatar/locomocao.glb`), menos o
 * "Idle", que é a pose parada da plataforma. Andar e correr começam com o pé esquerdo pisando e são
 * tocados pela MESMA fase: na mistura os pés dos dois caem juntos. A fase anda pela distância
 * percorrida dividida pela passada, então o pé não patina no chão.
 */

export const CLIPES = ['Idle', 'Andar', 'Correr', 'Pulo', 'Queda', 'Aterrissagem', 'Nado'] as const
export type Clipe = (typeof CLIPES)[number]

/** Medidas dos ciclos, iguais às do script do Blender (`ANDAR` e `CORRER` lá). */
export const CICLO_DE_ANDAR = { passada: 0.62, duracao: 13 / 30 } as const
export const CICLO_DE_CORRER = { passada: 1.3, duracao: 11 / 30 } as const
export const VELOCIDADE_DO_ANDAR = CICLO_DE_ANDAR.passada / CICLO_DE_ANDAR.duracao
export const VELOCIDADE_DO_CORRER = CICLO_DE_CORRER.passada / CICLO_DE_CORRER.duracao

/** Abaixo disto o avatar está parado (só o "Idle"). */
export const PARADO_ABAIXO_DE = 0.15
/** Até esta velocidade o "Idle" ainda se mistura com o andar (sai devagar do lugar). */
export const SAIDA_DO_PARADO = 0.9
/**
 * Mais ciclos por segundo que isto parece desenho acelerado: acima, a passada estica (o pé escorrega
 * um pouco) em vez de as pernas girarem mais rápido.
 */
export const CICLOS_POR_SEGUNDO_MAXIMO = 3.4
/** Tempo das transições, em segundos (de um estado inteiro para outro). */
export const TRANSICAO = { chao: 0.18, ar: 0.12, agua: 0.3 } as const
/** No ar por menos que isto (descer um degrau, quina do caminho) não troca a animação. */
export const AR_SEM_QUEDA = 0.16
/** A aterrissagem só aparece depois de um tempo no ar (um pulo), e dura isto. */
export const AR_PARA_ATERRISSAR = 0.3
export const DURACAO_DA_ATERRISSAGEM = 10 / 30
/** No pulo, o clipe começa no empurrão do chão (a parte agachada fica para trás). */
export const PULO_COMECA_EM = 0.45

export interface EntradaDaLocomocao {
  /** Velocidade no chão (metros por segundo, sem a vertical). */
  velocidade: number
  noChao: boolean
  /** Velocidade vertical (positiva subindo). */
  velY: number
  nadando: boolean
  /** Pendurada num cipó ou agarrada num tronco (o corpo é levado por outra regra). */
  pendurado: boolean
}

export interface Locomocao {
  pesos: Record<Clipe, number>
  /** Tempo de cada clipe, de 0 a 1 (o andar e o correr usam a mesma fase). */
  tempos: Record<Clipe, number>
  fase: number
  noAr: number
  pulou: boolean
  aterrissando: number
  /** O quanto a aterrissagem pesa (pulo alto pesa mais; correndo, menos). */
  forcaDaAterrissagem: number
}

const zeros = (): Record<Clipe, number> =>
  Object.fromEntries(CLIPES.map((c) => [c, 0])) as Record<Clipe, number>

export function criarLocomocao(): Locomocao {
  const pesos = zeros()
  pesos.Idle = 1
  return {
    pesos,
    tempos: zeros(),
    fase: 0,
    noAr: 0,
    pulou: false,
    aterrissando: 0,
    forcaDaAterrissagem: 0,
  }
}

const limitar = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x))

/** Os pesos de chão (parado, andar e correr) para uma velocidade, somando 1. */
export function pesosNoChao(v: number): { Idle: number; Andar: number; Correr: number } {
  if (v < PARADO_ABAIXO_DE) return { Idle: 1, Andar: 0, Correr: 0 }
  const movendo = limitar((v - PARADO_ABAIXO_DE) / (SAIDA_DO_PARADO - PARADO_ABAIXO_DE))
  const correndo = limitar((v - VELOCIDADE_DO_ANDAR) / (VELOCIDADE_DO_CORRER - VELOCIDADE_DO_ANDAR))
  return { Idle: 1 - movendo, Andar: movendo * (1 - correndo), Correr: movendo * correndo }
}

/** Quanto a fase do passo anda por segundo nesta velocidade (com a passada misturada). */
export function ciclosPorSegundo(v: number): number {
  const p = pesosNoChao(v)
  const andando = p.Andar + p.Correr
  if (andando <= 0) return 0
  const passada = (p.Andar * CICLO_DE_ANDAR.passada + p.Correr * CICLO_DE_CORRER.passada) / andando
  return Math.min(v / passada, CICLOS_POR_SEGUNDO_MAXIMO)
}

/**
 * Um quadro: atualiza a fase, os tempos e os pesos (aproximando-se dos alvos no tempo da
 * transição). Muda o objeto (é chamado a cada quadro, sem criar lixo).
 */
export function passoDaLocomocao(l: Locomocao, e: EntradaDaLocomocao, dt: number): Locomocao {
  const alvo = zeros()
  let transicao: number = TRANSICAO.chao

  if (e.pendurado) {
    // No cipó e no tronco: a pose parada, com os braços levantados por cima (`personagem/bracos.ts`).
    l.noAr = 0
    l.pulou = false
    l.aterrissando = 0
    alvo.Idle = 1
    transicao = TRANSICAO.ar
  } else if (e.nadando) {
    l.noAr = 0
    l.pulou = false
    l.aterrissando = 0
    alvo.Nado = 1
    transicao = TRANSICAO.agua
    l.tempos.Nado = (l.tempos.Nado + dt / 1.1) % 1
  } else if (!e.noChao) {
    // Saiu do chão subindo: é um pulo (o clipe começa no empurrão).
    if (l.noAr === 0 && e.velY > 1) {
      l.pulou = true
      l.tempos.Pulo = PULO_COMECA_EM
    }
    l.noAr += dt
    if (l.pulou || l.noAr > AR_SEM_QUEDA) {
      transicao = TRANSICAO.ar
      l.tempos.Pulo = Math.min(1, l.tempos.Pulo + dt / (11 / 30))
      l.tempos.Queda = (l.tempos.Queda + dt / 1.2) % 1
      // O pulo segue (parado na pose encolhida do fim) até o corpo começar a descer; aí, a queda.
      const caindo = e.velY < -1 ? 1 : 0
      alvo.Pulo = l.pulou ? 1 - caindo : 0
      alvo.Queda = l.pulou ? caindo : 1
    } else {
      // Um degrau para baixo: continua o passo como se estivesse no chão.
      Object.assign(alvo, pesosNoChao(e.velocidade))
    }
  } else {
    if (l.noAr > AR_PARA_ATERRISSAR) {
      l.aterrissando = DURACAO_DA_ATERRISSAGEM
      l.tempos.Aterrissagem = 0
      // Correndo, a aterrissagem é só um amortecer leve (as pernas já seguem o passo).
      l.forcaDaAterrissagem = 1 - 0.6 * limitar(e.velocidade / VELOCIDADE_DO_CORRER)
    }
    l.noAr = 0
    l.pulou = false
    const chao = pesosNoChao(e.velocidade)
    if (l.aterrissando > 0) {
      l.aterrissando = Math.max(0, l.aterrissando - dt)
      l.tempos.Aterrissagem = 1 - l.aterrissando / DURACAO_DA_ATERRISSAGEM
      // Entra inteira e vai saindo enquanto o corpo se levanta.
      const peso = l.forcaDaAterrissagem * (1 - suave(l.tempos.Aterrissagem))
      alvo.Aterrissagem = peso
      alvo.Idle = chao.Idle * (1 - peso)
      alvo.Andar = chao.Andar * (1 - peso)
      alvo.Correr = chao.Correr * (1 - peso)
      transicao = TRANSICAO.ar
    } else {
      Object.assign(alvo, chao)
    }
  }

  if (!e.nadando && !e.pendurado) {
    l.fase = (l.fase + ciclosPorSegundo(e.velocidade) * dt) % 1
    l.tempos.Andar = l.fase
    l.tempos.Correr = l.fase
  }

  // Cada peso anda até o alvo no tempo da transição (linear: chega na hora certa).
  const passo = transicao > 0 ? dt / transicao : 1
  for (const c of CLIPES) {
    const d = alvo[c] - l.pesos[c]
    l.pesos[c] += Math.abs(d) <= passo ? d : Math.sign(d) * passo
  }
  // A aterrissagem acompanha o alvo na hora (é ela que amortece o toque no chão).
  if (alvo.Aterrissagem > 0) l.pesos.Aterrissagem = alvo.Aterrissagem
  return l
}

function suave(t: number): number {
  const x = limitar(t)
  return x * x * (3 - 2 * x)
}
