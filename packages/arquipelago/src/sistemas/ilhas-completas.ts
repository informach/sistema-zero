/**
 * O ciclo de uma ilha completa (o arquivo do Blender que toma o lugar da versão leve):
 *
 *   longe → carregando → pronta → ativa → descarregando → longe
 *
 * - **longe:** só a versão leve existe; nada da completa na memória.
 * - **carregando:** a pessoa chegou perto (na cabeça da ponte ou nela): o arquivo baixa e é lido
 *   enquanto ela atravessa, sem tela de espera.
 * - **pronta:** lido, com os colisores montados e os shaders compilados, ainda fora da cena.
 * - **ativa:** a completa entra esmaecendo por cima da leve (sem estalo) e passa a colidir.
 * - **descarregando:** a pessoa voltou para a ilha central: a completa sai esmaecendo e, quando
 *   some, geometrias, materiais e texturas são soltos.
 *
 * Regra pura, sem React nem three: quem chama mede a distância, o arquivo e o esmaecer.
 */
export type EstadoDaIlha = 'longe' | 'carregando' | 'pronta' | 'ativa' | 'descarregando'

/** A proteção do chão é publicada antes de o Rapier avançar o primeiro quadro. */
export const PRIORIDADE_DA_CARGA_DA_ILHA = -2

export function esperandoPeloChao(proximo: EstadoDaIlha, colisoresNaCena: boolean): boolean {
  return (
    proximo === 'carregando' || proximo === 'pronta' || (proximo === 'ativa' && !colisoresNaCena)
  )
}

export interface SinaisDaIlha {
  /** Perto o bastante para buscar o arquivo (na ponte ou chegando nela). */
  perto: boolean
  /** Perto o bastante para a completa tomar o lugar da leve. */
  naTroca: boolean
  /** O arquivo foi lido e preparado. */
  carregada: boolean
  /** A última tentativa falhou (e a pessoa ainda não se afastou): fica a versão leve. */
  falhou: boolean
  /** O esmaecer de saída acabou (a completa já não aparece). */
  saiuDeVista: boolean
}

export function proximoEstadoDaIlha(atual: EstadoDaIlha, s: SinaisDaIlha): EstadoDaIlha {
  switch (atual) {
    case 'longe':
      // Depois de uma falha, só tenta de novo quando a pessoa se afastar e voltar (sem laço de
      // pedidos a cada quadro com a rede fora).
      return s.perto && !s.falhou ? 'carregando' : 'longe'
    case 'carregando':
      if (s.falhou) return 'longe'
      if (!s.perto) return 'descarregando'
      return s.carregada ? 'pronta' : 'carregando'
    case 'pronta':
      if (!s.perto) return 'descarregando'
      return s.naTroca ? 'ativa' : 'pronta'
    case 'ativa':
      return s.perto ? 'ativa' : 'descarregando'
    case 'descarregando':
      // Deu meia-volta antes de sumir: a ilha ainda está na memória, volta a valer.
      if (s.naTroca && s.carregada) return 'ativa'
      return s.saiuDeVista ? 'longe' : 'descarregando'
  }
}

/** A completa está na cena (entrando, inteira ou saindo)? */
export function completaNaCena(estado: EstadoDaIlha): boolean {
  return estado === 'ativa' || estado === 'descarregando'
}

/** Só a ilha ativa colide; a leve colide em todos os outros estados. */
export function completaColide(estado: EstadoDaIlha): boolean {
  return estado === 'ativa'
}

/** Para onde o esmaecer da completa vai (0 = some, 1 = inteira). */
export function opacidadeAlvo(estado: EstadoDaIlha): 0 | 1 {
  return estado === 'ativa' ? 1 : 0
}

/** Um passo do esmaecer, sem passar do alvo (`duracao` em segundos para ir de 0 a 1). */
export function esmaecer(atual: number, alvo: number, dt: number, duracao: number): number {
  const passo = duracao > 0 ? dt / duracao : 1
  return alvo > atual ? Math.min(alvo, atual + passo) : Math.max(alvo, atual - passo)
}

/** Um único dono do cache. Durante o mergulho, a ilha do volume mantém seus colisores. */
export function ilhaPreferida(
  p: { x: number; z: number },
  candidatas: readonly { id: string; x: number; z: number }[],
  mergulhando: string | null,
): string | null {
  let escolhida: string | null = null
  let menor = Number.POSITIVE_INFINITY
  for (const ilha of candidatas) {
    if (ilha.id === mergulhando) return ilha.id
    const d = (ilha.x - p.x) ** 2 + (ilha.z - p.z) ** 2
    if (d < menor) {
      menor = d
      escolhida = ilha.id
    }
  }
  return escolhida
}
