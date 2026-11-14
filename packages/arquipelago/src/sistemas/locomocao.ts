/**
 * Qual animação do avatar aparece, e quanto de cada uma (regra pura, sem three nem React). É o que
 * os jogos chamam de máquina de estados com "blend": parado, andar e correr se misturam pela
 * velocidade; pular, ficar no ar, cair, aterrissar e nadar entram e saem com transição suave.
 *
 * A regra fala em ESTADOS (o que o corpo está fazendo). Cada estado toca um pedaço de um clipe do
 * pack (`POSE_DO_ESTADO`): os clipes de movimento do jogo moram no GLB `game.file` do catálogo, e
 * as medidas deles (duração, passada) também vêm de lá, vezes a escala do herói no mundo. Nadar,
 * boiar, sentar, deitar, o cipó e a borda usam as animações que a arte fez para este corpo; os modos
 * que ela ainda não animou (planar, escalar, equilibrar, escorregar, montar) usam uma pose de reserva.
 *
 * Andar e correr são tocados pela MESMA fase: na mistura os pés dos dois caem juntos. A fase anda
 * pela distância percorrida dividida pela passada, então o pé não patina no chão.
 */
import { AVATAR_CATALOG, type AvatarGameClip } from '@sistemazero/avatar-quarto/avatar/pack-catalog'
import { CORPO } from './corpo'

/** Os clipes que o jogo usa (os do GLB `game.file`): os de movimento do pack e os que a arte fez. */
export const CLIPES_DO_JOGO = [
  'parado_relaxado',
  'andar_frente',
  'correr_frente',
  'agachado_frente',
  'pulo_inicio',
  'pulo_no_ar',
  'pulo_fim',
  'cair',
  'subir_escada',
  'nadar',
  'boiar',
  'sentar',
  'sentado',
  'deitar',
  'deitado',
  'pendurar_cipo',
  'pendurar_borda',
  'subir_borda',
] as const
export type ClipeDoJogo = (typeof CLIPES_DO_JOGO)[number]

export const ESTADOS = [
  'Parado',
  'Andar',
  'Correr',
  'Pulo',
  'NoAr',
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
  'Sentando',
  'Deitando',
] as const
export type Estado = (typeof ESTADOS)[number]

/**
 * O pedaço do clipe que um estado toca: o tempo do estado (0 a 1) vai de `de` a `ate` (frações do
 * clipe). `de === ate` é uma pose parada.
 */
export interface PoseDoEstado {
  clipe: ClipeDoJogo
  de: number
  ate: number
}

const inteiro = (clipe: ClipeDoJogo): PoseDoEstado => ({ clipe, de: 0, ate: 1 })
const parada = (clipe: ClipeDoJogo, em: number): PoseDoEstado => ({ clipe, de: em, ate: em })

/**
 * O pulo do pack começa agachando para pegar impulso (até 0,3 s de 0,6). No jogo o corpo já saiu
 * do chão quando o pulo aparece, então ele começa no empurrão.
 */
const EMPURRAO_DO_PULO = 0.5
/** O pouso do pack começa ainda no ar, com as pernas descendo; no jogo, começa no pé tocando. */
const PE_TOCANDO = 0.3
/** O agachado parado das reservas (escorregar, montar): o meio do primeiro passo. */
const AGACHADO_PARADO = 0.25

export const POSE_DO_ESTADO: Record<Estado, PoseDoEstado> = {
  Parado: inteiro('parado_relaxado'),
  Andar: inteiro('andar_frente'),
  Correr: inteiro('correr_frente'),
  Pulo: { clipe: 'pulo_inicio', de: EMPURRAO_DO_PULO, ate: 1 },
  NoAr: inteiro('pulo_no_ar'),
  Queda: inteiro('cair'),
  Aterrissagem: { clipe: 'pulo_fim', de: PE_TOCANDO, ate: 1 },
  SubirEscada: inteiro('subir_escada'),
  // As animações que a arte fez para este corpo:
  Nado: inteiro('nadar'),
  NadoParado: inteiro('boiar'),
  Corda: inteiro('pendurar_cipo'),
  PendurarBorda: inteiro('pendurar_borda'),
  SubirBorda: inteiro('subir_borda'),
  // Sentar e deitar: o movimento de se acomodar uma vez, depois o laço de quem ficou.
  Sentando: inteiro('sentar'),
  Sentar: inteiro('sentado'),
  Deitando: inteiro('deitar'),
  Deitar: inteiro('deitado'),
  // As reservas, até a arte entregar a animação de cada modo:
  Planar: inteiro('pulo_no_ar'),
  Escalar: inteiro('subir_escada'),
  Equilibrar: inteiro('parado_relaxado'),
  Escorregar: parada('agachado_frente', AGACHADO_PARADO),
  Montar: parada('agachado_frente', AGACHADO_PARADO),
}

/** As medidas de um clipe do jogo no catálogo (lança se a arte não o mandou). */
function doCatalogo(id: ClipeDoJogo): AvatarGameClip {
  const clipe = AVATAR_CATALOG.base.skeleton.game.clips.find((c) => c.id === id)
  if (!clipe) throw new Error(`O catálogo do avatar não tem o clipe do jogo ${id}.`)
  return clipe
}

/** A duração de cada clipe do jogo (s). */
export const DURACAO_DO_CLIPE = Object.fromEntries(
  CLIPES_DO_JOGO.map((id) => [id, doCatalogo(id).duration]),
) as Record<ClipeDoJogo, number>

/** Quanto tempo o estado leva para passar do `de` ao `ate` no ritmo do clipe (s). */
export function duracaoDoEstado(estado: Estado): number {
  const p = POSE_DO_ESTADO[estado]
  return (p.ate - p.de) * DURACAO_DO_CLIPE[p.clipe]
}

const escala = CORPO.medidas.scale
/** Os ciclos de chão: o corpo anda `passada` metros por ciclo (dois passos) do clipe. */
export const CICLO_DE_ANDAR = {
  passada: doCatalogo('andar_frente').stride * escala,
  duracao: DURACAO_DO_CLIPE.andar_frente,
} as const
export const CICLO_DE_CORRER = {
  passada: doCatalogo('correr_frente').stride * escala,
  duracao: DURACAO_DO_CLIPE.correr_frente,
} as const
/** Subir a escada (e, de reserva, o tronco): o corpo sobe `passada` por ciclo. */
export const CICLO_DA_ESCADA = {
  passada: doCatalogo('subir_escada').rise * escala,
  duracao: DURACAO_DO_CLIPE.subir_escada,
} as const
export const CICLO_DE_ESCALAR = CICLO_DA_ESCADA
/** Nadar: as braçadas de um ciclo levam o corpo `passada` metros. */
export const CICLO_DE_NADO = {
  passada: doCatalogo('nadar').stride * escala,
  duracao: DURACAO_DO_CLIPE.nadar,
} as const

/**
 * As velocidades em que o corpo anda e corre são do MUNDO (`CORPO.andar`, `CORPO.correr`): é nelas
 * que o andar e o correr ficam inteiros. Andando a pé num mundo de escala nativa, coincidem com a
 * passada do clipe vezes a cadência dele.
 */
export const VELOCIDADE_DO_ANDAR = CORPO.andar
export const VELOCIDADE_DO_CORRER = CORPO.correr

/** Abaixo disto o avatar está parado (só o "Parado"). */
export const PARADO_ABAIXO_DE = 0.15
/** Até esta velocidade o "Parado" ainda se mistura com o andar (sai devagar do lugar). */
export const SAIDA_DO_PARADO = 0.9
/**
 * Até quantas vezes a cadência do clipe as pernas giram: mais que isto parece desenho acelerado, e
 * a passada estica (o pé escorrega um pouco). As pernas do pack são curtas e o mundo de hoje é
 * rápido (2,2 e 4,6 m/s): com o dobro, o andar fica sem escorregar e a corrida quase.
 */
export const RITMO_MAXIMO = 2
/** Tempo das transições, em segundos (de um estado inteiro para outro). */
export const TRANSICAO = { chao: 0.18, ar: 0.12, agua: 0.3 } as const
/** No ar por menos que isto (descer um degrau, quina do caminho) não troca a animação. */
export const AR_SEM_QUEDA = 0.16
/** Descendo por mais que isto (s) sem chão, é uma queda longa: os braços se agitam. */
export const QUEDA_LONGA = 0.6
/** A aterrissagem só aparece depois de um tempo no ar (um pulo). */
export const AR_PARA_ATERRISSAR = 0.3
/** A aterrissagem é tocada um pouco mais depressa que o clipe, para não segurar quem quer andar. */
export const DURACAO_DA_ATERRISSAGEM = duracaoDoEstado('Aterrissagem') * 0.7
/** Nadando, acima disto (m/s) nada; abaixo, boia. */
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
  pesos: Record<Estado, number>
  /** Tempo de cada estado, de 0 a 1 (o andar e o correr usam a mesma fase). */
  tempos: Record<Estado, number>
  fase: number
  noAr: number
  /** Há quanto tempo o corpo está descendo sem chão (s). */
  descendo: number
  pulou: boolean
  aterrissando: number
  /** O quanto a aterrissagem pesa (pulo alto pesa mais; correndo, menos). */
  forcaDaAterrissagem: number
  /** O descanso em que ela está se acomodando ou já ficou (`null` fora do banco e da cama). */
  acomodada: 'sentar' | 'deitar' | null
}

const zeros = (): Record<Estado, number> =>
  Object.fromEntries(ESTADOS.map((c) => [c, 0])) as Record<Estado, number>

export function criarLocomocao(): Locomocao {
  const pesos = zeros()
  pesos.Parado = 1
  return {
    pesos,
    tempos: zeros(),
    fase: 0,
    noAr: 0,
    descendo: 0,
    pulou: false,
    aterrissando: 0,
    forcaDaAterrissagem: 0,
    acomodada: null,
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
  const cadencia = (p.Andar / CICLO_DE_ANDAR.duracao + p.Correr / CICLO_DE_CORRER.duracao) / andando
  return Math.min(v / passada, RITMO_MAXIMO * cadencia)
}

/**
 * Um quadro: atualiza a fase, os tempos e os pesos (aproximando-se dos alvos no tempo da
 * transição). Muda o objeto (é chamado a cada quadro, sem criar lixo).
 */
export function passoDaLocomocao(l: Locomocao, e: EntradaDaLocomocao, dt: number): Locomocao {
  const alvo = zeros()
  let transicao: number = TRANSICAO.chao
  if (e.especial !== 'sentar' && e.especial !== 'deitar') l.acomodada = null

  if (e.especial) {
    // O corpo é levado por outra regra: um estado por modo. Subir (tronco, escada) anda pela
    // distância percorrida (parada, fica no apoio em que está).
    l.noAr = 0
    l.descendo = 0
    l.pulou = false
    l.aterrissando = 0
    transicao = TRANSICAO.ar
    const pelaDistancia = (c: Estado, passada: number) => {
      alvo[c] = 1
      const ciclos = Math.min(e.velocidade / passada, RITMO_MAXIMO / duracaoDoEstado(c))
      l.tempos[c] = (l.tempos[c] + ciclos * dt) % 1
    }
    const laco = (c: Estado) => {
      alvo[c] = 1
      const d = duracaoDoEstado(c)
      if (d > 0) l.tempos[c] = (l.tempos[c] + dt / d) % 1
    }
    if (e.especial === 'cipo') laco('Corda')
    else if (e.especial === 'planar') laco('Planar')
    else if (e.especial === 'escalada') pelaDistancia('Escalar', CICLO_DE_ESCALAR.passada)
    else if (e.especial === 'escada') pelaDistancia('SubirEscada', CICLO_DA_ESCADA.passada)
    else if (e.especial === 'escorregar') laco('Escorregar')
    else if (e.especial === 'montar') {
      // Montar entra devagar, como quem se acomoda.
      transicao = TRANSICAO.agua
      laco('Montar')
    } else if (e.especial === 'sentar' || e.especial === 'deitar') {
      // Sentar e deitar: o movimento de se acomodar uma vez (a arte o fez começando em pé, junto do
      // assento ou em cima do colchão) e depois o laço de quem ficou. Levantar é a troca de volta
      // para o chão, na hora: quem quer andar não espera uma animação.
      transicao = TRANSICAO.agua
      const entra: Estado = e.especial === 'sentar' ? 'Sentando' : 'Deitando'
      const fica: Estado = e.especial === 'sentar' ? 'Sentar' : 'Deitar'
      if (l.acomodada !== e.especial) {
        l.acomodada = e.especial
        l.tempos[entra] = 0
        l.tempos[fica] = 0
      }
      if (l.tempos[entra] < 1) {
        alvo[entra] = 1
        l.tempos[entra] = Math.min(1, l.tempos[entra] + dt / duracaoDoEstado(entra))
      } else laco(fica)
    } else if (e.especial === 'equilibrio') {
      // Andando no tronco, um passo curto pela distância; parada, fica em pé se equilibrando.
      const andando = limitar(e.velocidade / EQUILIBRIO_ANDANDO)
      const ciclos = Math.min(
        e.velocidade / CICLO_DE_ANDAR.passada,
        RITMO_MAXIMO / CICLO_DE_ANDAR.duracao,
      )
      l.fase = (l.fase + ciclos * dt) % 1
      l.tempos.Andar = l.fase
      l.tempos.Equilibrar = (l.tempos.Equilibrar + dt / duracaoDoEstado('Equilibrar')) % 1
      alvo.Andar = andando
      alvo.Equilibrar = 1 - andando
    } else {
      // Na borda: pendurada, ou subindo (o tempo do estado é o progresso que o modo dá).
      const subindo = e.subindo ?? 0
      if (subindo > 0) {
        alvo.SubirBorda = 1
        l.tempos.SubirBorda = subindo
      } else laco('PendurarBorda')
    }
  } else if (e.nadando) {
    l.noAr = 0
    l.descendo = 0
    l.pulou = false
    l.aterrissando = 0
    // Nadando para a frente ou boiando. As braçadas andam pela distância (como os passos no chão),
    // até `RITMO_MAXIMO` vezes a cadência do clipe: o nado da arte é calmo e o do jogo é rápido.
    const nadando = limitar(e.velocidade / NADANDO_ACIMA_DE)
    alvo.Nado = nadando
    alvo.NadoParado = 1 - nadando
    transicao = TRANSICAO.agua
    const bracadas = Math.min(
      e.velocidade / CICLO_DE_NADO.passada,
      RITMO_MAXIMO / CICLO_DE_NADO.duracao,
    )
    l.tempos.Nado = (l.tempos.Nado + bracadas * dt) % 1
    l.tempos.NadoParado = (l.tempos.NadoParado + dt / duracaoDoEstado('NadoParado')) % 1
  } else if (!e.noChao) {
    // Saiu do chão subindo: é um pulo (começa no empurrão).
    if (l.noAr === 0 && e.velY > 1) {
      l.pulou = true
      l.tempos.Pulo = 0
    }
    l.noAr += dt
    l.descendo = e.velY < -1 ? l.descendo + dt : 0
    if (l.pulou || l.noAr > AR_SEM_QUEDA) {
      transicao = TRANSICAO.ar
      const empurrao = duracaoDoEstado('Pulo')
      l.tempos.Pulo = Math.min(1, l.tempos.Pulo + (empurrao > 0 ? dt / empurrao : 1))
      l.tempos.NoAr = (l.tempos.NoAr + dt / duracaoDoEstado('NoAr')) % 1
      l.tempos.Queda = (l.tempos.Queda + dt / duracaoDoEstado('Queda')) % 1
      // O empurrão do pulo até o fim; depois, a pose no ar. Descendo por muito tempo, a queda.
      const longa = l.descendo > QUEDA_LONGA ? 1 : 0
      const empurrando = l.pulou && l.tempos.Pulo < 1 ? 1 : 0
      alvo.Pulo = empurrando * (1 - longa)
      alvo.Queda = longa
      alvo.NoAr = (1 - empurrando) * (1 - longa)
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
    l.descendo = 0
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
  l.tempos.Parado = (l.tempos.Parado + dt / duracaoDoEstado('Parado')) % 1
  if (!e.nadando && !e.especial) {
    l.fase = (l.fase + ciclosPorSegundo(e.velocidade) * dt) % 1
    l.tempos.Andar = l.fase
    l.tempos.Correr = l.fase
  }

  // Cada peso anda até o alvo no tempo da transição (linear: chega na hora certa).
  const passo = transicao > 0 ? dt / transicao : 1
  for (const c of ESTADOS) {
    const d = alvo[c] - l.pesos[c]
    l.pesos[c] += Math.abs(d) <= passo ? d : Math.sign(d) * passo
  }
  // A aterrissagem acompanha o alvo na hora (é ela que amortece o toque no chão).
  if (alvo.Aterrissagem > 0) l.pesos.Aterrissagem = alvo.Aterrissagem
  return l
}

/** O peso e o instante (s) de cada clipe do jogo, para o mixer. */
export type PoseDosClipes = Record<ClipeDoJogo, { peso: number; tempo: number }>

export function criarPoseDosClipes(): PoseDosClipes {
  return Object.fromEntries(CLIPES_DO_JOGO.map((c) => [c, { peso: 0, tempo: 0 }])) as PoseDosClipes
}

/**
 * Junta os estados nos clipes: o peso de um clipe é a soma dos estados que o tocam, e o instante é
 * o do estado mais pesado (dois estados no mesmo clipe só se cruzam numa transição). Escreve em
 * `saida`, sem criar lixo.
 */
export function poseDosClipes(l: Locomocao, saida: PoseDosClipes): PoseDosClipes {
  for (const c of CLIPES_DO_JOGO) {
    saida[c].peso = 0
    saida[c].tempo = 0
  }
  const maior = maiorPorClipe
  for (const c of CLIPES_DO_JOGO) maior[c] = -1
  for (const estado of ESTADOS) {
    const peso = l.pesos[estado]
    if (peso <= 0) continue
    const p = POSE_DO_ESTADO[estado]
    const s = saida[p.clipe]
    s.peso += peso
    if (peso > maior[p.clipe]) {
      maior[p.clipe] = peso
      s.tempo = (p.de + (p.ate - p.de) * l.tempos[estado]) * DURACAO_DO_CLIPE[p.clipe]
    }
  }
  return saida
}
const maiorPorClipe = Object.fromEntries(CLIPES_DO_JOGO.map((c) => [c, -1])) as Record<
  ClipeDoJogo,
  number
>

function suave(t: number): number {
  const x = limitar(t)
  return x * x * (3 - 2 * x)
}
