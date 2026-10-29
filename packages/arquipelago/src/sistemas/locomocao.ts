/**
 * Qual animação do avatar aparece, e quanto de cada uma (regra pura, sem three nem React). É o que
 * os jogos chamam de máquina de estados com "blend": parado, andar e correr se misturam pela
 * velocidade; pular, cair, aterrissar e nadar entram e saem com transição suave.
 *
 * Os clipes vêm do Mixamo, passados para o esqueleto do avatar por `arte/avatar/mixamo.py`
 * (`src/assets/avatar/locomocao.glb`), sem o deslocamento: quem anda, sobe e cai é o corpo do
 * jogo. Andar e correr começam com o pé esquerdo pisando e são tocados pela MESMA fase: na mistura
 * os pés dos dois caem juntos. A fase anda pela distância percorrida dividida pela passada, então o
 * pé não patina no chão. As medidas abaixo são as do resumo que o script imprime.
 */

export const CLIPES = [
  'Parado',
  'Andar',
  'Correr',
  'Pulo',
  'Queda',
  'Aterrissagem',
  'Nado',
  'NadoParado',
  'Corda',
  'Planar',
  'Escalar',
  'Equilibrar',
  'SubirEscada',
  'PendurarBorda',
  'SubirBorda',
  'Escorregar',
  'Sentar',
  'Montar',
  'Deitar',
] as const
export type Clipe = (typeof CLIPES)[number]

/** Os ciclos de chão: o corpo anda `passada` metros por ciclo (dois passos) do clipe. */
export const CICLO_DE_ANDAR = { passada: 1.4, duracao: 31 / 30 } as const
export const CICLO_DE_CORRER = { passada: 2.84, duracao: 19 / 30 } as const
/** Subir no tronco e na escada: o corpo sobe `passada` por ciclo. */
export const CICLO_DE_ESCALAR = { passada: 0.94, duracao: 89 / 30 } as const
export const CICLO_DA_ESCADA = { passada: 0.38, duracao: 23 / 30 } as const
/** O nado: o clipe anda isto por ciclo no Mixamo (devagar); no jogo o laço segue a velocidade. */
export const CICLO_DO_NADO = { passada: 1.66, duracao: 136 / 30 } as const
/** Os laços: parado, boiando, no cipó, no planador, no tronco caído, na borda e no descanso. */
export const DURACAO_DO_PARADO = 250 / 30
export const DURACAO_DO_NADO_PARADO = 90 / 30
export const DURACAO_DA_CORDA = 22 / 30
export const DURACAO_DO_PLANAR = 70 / 30
export const DURACAO_DO_EQUILIBRIO = 55 / 30
export const DURACAO_DA_BORDA = 28 / 30
export const DURACAO_DO_ESCORREGAR = 35 / 30
export const DURACAO_DO_SENTAR = 35 / 30
export const DURACAO_DA_MONTARIA = 150 / 30
export const DURACAO_DO_DEITAR = 46 / 30
/** Os clipes do pulo, tocados pelo tempo (o empurrão, a descida em laço e o toque no chão). */
export const DURACAO_DO_PULO = 6 / 30
export const DURACAO_DA_QUEDA = 10 / 30
export const VELOCIDADE_DO_ANDAR = CICLO_DE_ANDAR.passada / CICLO_DE_ANDAR.duracao
export const VELOCIDADE_DO_CORRER = CICLO_DE_CORRER.passada / CICLO_DE_CORRER.duracao

/** Abaixo disto o avatar está parado (só o "Parado"). */
export const PARADO_ABAIXO_DE = 0.15
/** Até esta velocidade o "Parado" ainda se mistura com o andar (sai devagar do lugar). */
export const SAIDA_DO_PARADO = 0.9
/**
 * Mais ciclos por segundo que isto parece desenho acelerado: acima, a passada estica (o pé escorrega
 * um pouco) em vez de as pernas girarem mais rápido.
 */
export const CICLOS_POR_SEGUNDO_MAXIMO = 1.8
/** Tempo das transições, em segundos (de um estado inteiro para outro). */
export const TRANSICAO = { chao: 0.18, ar: 0.12, agua: 0.3 } as const
/** No ar por menos que isto (descer um degrau, quina do caminho) não troca a animação. */
export const AR_SEM_QUEDA = 0.16
/**
 * A aterrissagem só aparece depois de um tempo no ar (um pulo), e dura isto (o clipe tem 17/30 s;
 * aqui ele é tocado um pouco mais depressa, para não segurar quem já quer andar).
 */
export const AR_PARA_ATERRISSAR = 0.3
export const DURACAO_DA_ATERRISSAGEM = 12 / 30
/**
 * Nadando, o laço das braçadas toca no tempo do Mixamo a esta velocidade (m/s); mais depressa,
 * acelera junto, de 0,6 até 2 vezes (as braçadas não viram um borrão).
 */
export const NADO_NO_TEMPO_DO_CLIPE = 1.3
/** Acima disto (m/s) na água, nada; abaixo, boia batendo as pernas. */
export const NADANDO_ACIMA_DE = 0.5
/** No tronco caído, acima disto (m/s) anda um pé na frente do outro; parada, se equilibra. */
export const EQUILIBRIO_ANDANDO = 0.25

export interface EntradaDaLocomocao {
  /** Velocidade no chão (metros por segundo, sem a vertical). */
  velocidade: number
  noChao: boolean
  /** Velocidade vertical (positiva subindo). */
  velY: number
  nadando: boolean
  /**
   * Num modo especial (`sistemas/modos`), em que o corpo é levado por outra regra: pendurada no
   * cipó ou na borda, agarrada no tronco ou na escada, no tronco caído ou no escorregador. Na
   * escalada, na escada e no tronco caído, a `velocidade` é a do corpo (pela casca, pelos degraus
   * ou pelo eixo do tronco). `null` no chão e na água.
   */
  especial: ModoEspecial | null
  /** Subindo a borda: de 0 (pendurada) a 1 (de pé em cima). Fora disso, 0. */
  subindo?: number
}

export type ModoEspecial =
  | 'cipo'
  | 'escalada'
  | 'equilibrio'
  | 'escada'
  | 'borda'
  | 'escorregar'
  | 'sentar'
  | 'deitar'
  | 'montar'
  | 'planar'

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
  pesos.Parado = 1
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
export function pesosNoChao(v: number): { Parado: number; Andar: number; Correr: number } {
  if (v < PARADO_ABAIXO_DE) return { Parado: 1, Andar: 0, Correr: 0 }
  const movendo = limitar((v - PARADO_ABAIXO_DE) / (SAIDA_DO_PARADO - PARADO_ABAIXO_DE))
  const correndo = limitar((v - VELOCIDADE_DO_ANDAR) / (VELOCIDADE_DO_CORRER - VELOCIDADE_DO_ANDAR))
  return { Parado: 1 - movendo, Andar: movendo * (1 - correndo), Correr: movendo * correndo }
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

  if (e.especial) {
    // O corpo é levado por outra regra: um clipe por modo. Os ciclos de subir (tronco, escada) e
    // o de equilibrar andam pela distância percorrida (parada, fica no apoio em que está).
    l.noAr = 0
    l.pulou = false
    l.aterrissando = 0
    transicao = TRANSICAO.ar
    const pelaDistancia = (c: Clipe, passada: number) => {
      alvo[c] = 1
      const ciclos = Math.min(e.velocidade / passada, CICLOS_POR_SEGUNDO_MAXIMO)
      l.tempos[c] = (l.tempos[c] + ciclos * dt) % 1
    }
    const laco = (c: Clipe, duracao: number) => {
      alvo[c] = 1
      l.tempos[c] = (l.tempos[c] + dt / duracao) % 1
    }
    if (e.especial === 'cipo') laco('Corda', DURACAO_DA_CORDA)
    // No planador, pendurada na barra, as mãos na frente do peito (fase3-09).
    else if (e.especial === 'planar') laco('Planar', DURACAO_DO_PLANAR)
    else if (e.especial === 'escalada') pelaDistancia('Escalar', CICLO_DE_ESCALAR.passada)
    else if (e.especial === 'escada') pelaDistancia('SubirEscada', CICLO_DA_ESCADA.passada)
    else if (e.especial === 'escorregar') laco('Escorregar', DURACAO_DO_ESCORREGAR)
    else if (e.especial === 'sentar' || e.especial === 'deitar' || e.especial === 'montar') {
      // Sentar, deitar e montar entram devagar, como quem se acomoda.
      transicao = TRANSICAO.agua
      if (e.especial === 'sentar') laco('Sentar', DURACAO_DO_SENTAR)
      else if (e.especial === 'deitar') laco('Deitar', DURACAO_DO_DEITAR)
      else laco('Montar', DURACAO_DA_MONTARIA)
    } else if (e.especial === 'equilibrio') {
      // Andando no tronco, um passo curto pela distância; parada, os braços abertos se equilibram.
      const andando = limitar(e.velocidade / EQUILIBRIO_ANDANDO)
      l.fase =
        (l.fase + Math.min(e.velocidade / CICLO_DE_ANDAR.passada, CICLOS_POR_SEGUNDO_MAXIMO) * dt) %
        1
      l.tempos.Andar = l.fase
      l.tempos.Equilibrar = (l.tempos.Equilibrar + dt / DURACAO_DO_EQUILIBRIO) % 1
      alvo.Andar = andando
      alvo.Equilibrar = 1 - andando
    } else {
      // Na borda: pendurada, ou subindo (o tempo do clipe é o progresso que o modo dá).
      const subindo = e.subindo ?? 0
      if (subindo > 0) {
        alvo.SubirBorda = 1
        l.tempos.SubirBorda = subindo
      } else laco('PendurarBorda', DURACAO_DA_BORDA)
    }
  } else if (e.nadando) {
    l.noAr = 0
    l.pulou = false
    l.aterrissando = 0
    // Nadando para a frente, as braçadas (no ritmo da velocidade); parada, boia batendo as pernas.
    const nadando = limitar(e.velocidade / NADANDO_ACIMA_DE)
    alvo.Nado = nadando
    alvo.NadoParado = 1 - nadando
    transicao = TRANSICAO.agua
    const ritmo = limitar(e.velocidade / NADO_NO_TEMPO_DO_CLIPE, 0.6, 2)
    l.tempos.Nado = (l.tempos.Nado + (ritmo * dt) / CICLO_DO_NADO.duracao) % 1
    l.tempos.NadoParado = (l.tempos.NadoParado + dt / DURACAO_DO_NADO_PARADO) % 1
  } else if (!e.noChao) {
    // Saiu do chão subindo: é um pulo (o clipe começa no empurrão).
    if (l.noAr === 0 && e.velY > 1) {
      l.pulou = true
      l.tempos.Pulo = 0
    }
    l.noAr += dt
    if (l.pulou || l.noAr > AR_SEM_QUEDA) {
      transicao = TRANSICAO.ar
      l.tempos.Pulo = Math.min(1, l.tempos.Pulo + dt / DURACAO_DO_PULO)
      l.tempos.Queda = (l.tempos.Queda + dt / DURACAO_DA_QUEDA) % 1
      // O pulo segue (parado na pose do fim, os braços abertos) até o corpo começar a descer; aí,
      // a queda.
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
      alvo.Parado = chao.Parado * (1 - peso)
      alvo.Andar = chao.Andar * (1 - peso)
      alvo.Correr = chao.Correr * (1 - peso)
      transicao = TRANSICAO.ar
    } else {
      Object.assign(alvo, chao)
    }
  }

  // O "Parado" respira no tempo dele, sempre (assim volta ao meio do laço, sem pular de pose).
  l.tempos.Parado = (l.tempos.Parado + dt / DURACAO_DO_PARADO) % 1
  if (!e.nadando && !e.especial) {
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
