/**
 * Os sons do jogo nas experiências livres (08/11/2026): o que a criança ouve quando algo ACONTECE na
 * cena, como num jogo de verdade. Curtos e baixos, feitos na hora (WebAudio), sem arquivo para baixar.
 *
 * Uma preferência por APARELHO (`sz:experiencia:som`) liga e desliga os sons e a voz automática do
 * Zappy. Toda leitura e escrita passa por try/catch: sem armazenamento (aba privada), vale ligado.
 */
const CHAVE = 'sz:experiencia:som'
/** O evento da janela quando o som da experiência liga ou desliga. */
export const EVENTO_DO_SOM = 'sz:experiencia:som'

export function sonsLigados(): boolean {
  try {
    return localStorage.getItem(CHAVE) !== 'nao'
  } catch {
    return true
  }
}

export function ligarSons(ligar: boolean) {
  try {
    localStorage.setItem(CHAVE, ligar ? 'sim' : 'nao')
  } catch {
    // Sem armazenamento a escolha vale só nesta página.
  }
  if (typeof window === 'undefined') return
  if (!ligar) window.speechSynthesis?.cancel()
  // Avisa quem fala (a `DialogueBlockView`): desligado, o MP3 que já está tocando também para.
  window.dispatchEvent(new Event(EVENTO_DO_SOM))
}

let contexto: AudioContext | null = null
type Nota = { f: number; em: number; dura: number; vol?: number; tipo?: OscillatorType }

function tocar(notas: readonly Nota[]) {
  if (typeof window === 'undefined' || !sonsLigados()) return
  try {
    const C =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!C) return
    contexto ??= new C()
    const ctx = contexto
    // ⚠️ Criado fora de um gesto (o som da descoberta nasce num efeito), o Safari do iOS deixa o
    // contexto SUSPENSO para sempre. Pedir a retomada a cada som destrava no primeiro gesto seguinte.
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {})
    const t = ctx.currentTime
    for (const n of notas) {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = n.tipo ?? 'triangle'
      o.frequency.value = n.f
      const t0 = t + n.em
      g.gain.setValueAtTime(0.0001, t0)
      g.gain.exponentialRampToValueAtTime(n.vol ?? 0.2, t0 + 0.015)
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dura)
      o.connect(g).connect(ctx.destination)
      o.start(t0)
      o.stop(t0 + n.dura + 0.05)
    }
  } catch {
    // Sem áudio, a tela continua contando tudo.
  }
}

/** Um som por acontecimento; o "quadro" é um tique, que só toca no Devagar. */
export const SONS = {
  descoberta: () =>
    tocar([
      { f: 659.25, em: 0, dura: 0.38 },
      { f: 987.77, em: 0.13, dura: 0.38 },
    ]),
  quadro: () => tocar([{ f: 1320, em: 0, dura: 0.05, vol: 0.05, tipo: 'square' }]),
  encaixe: () =>
    tocar([
      { f: 520, em: 0, dura: 0.08, vol: 0.18, tipo: 'square' },
      { f: 780, em: 0.06, dura: 0.1, vol: 0.14 },
    ]),
  aparece: () =>
    tocar([
      { f: 523, em: 0, dura: 0.12 },
      { f: 784, em: 0.08, dura: 0.18 },
    ]),
  nada: () => tocar([{ f: 220, em: 0, dura: 0.16, vol: 0.12, tipo: 'sine' }]),
  ponto: () =>
    tocar([
      { f: 880, em: 0, dura: 0.1 },
      { f: 1175, em: 0.07, dura: 0.16 },
    ]),
  pegar: () =>
    tocar([
      { f: 988, em: 0, dura: 0.1 },
      { f: 1319, em: 0.08, dura: 0.12 },
      { f: 1760, em: 0.16, dura: 0.2 },
    ]),
  tranca: () =>
    tocar([
      { f: 140, em: 0, dura: 0.18, vol: 0.25, tipo: 'square' },
      { f: 110, em: 0.16, dura: 0.22, vol: 0.2, tipo: 'square' },
    ]),
  abre: () =>
    tocar([
      { f: 523, em: 0, dura: 0.14 },
      { f: 659, em: 0.12, dura: 0.14 },
      { f: 784, em: 0.24, dura: 0.14 },
      { f: 1047, em: 0.36, dura: 0.35 },
    ]),
  escreve: () =>
    tocar([
      { f: 2400, em: 0, dura: 0.04, vol: 0.04, tipo: 'sawtooth' },
      { f: 2600, em: 0.07, dura: 0.04, vol: 0.04, tipo: 'sawtooth' },
      { f: 2300, em: 0.14, dura: 0.04, vol: 0.04, tipo: 'sawtooth' },
    ]),
  borda: () => tocar([{ f: 330, em: 0, dura: 0.12, vol: 0.12, tipo: 'sine' }]),
} as const
