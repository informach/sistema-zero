/** Contrato visual dos modelos prontos. Medidas em metros, sem mudar o corpo do jogador. */
export const ELEVACAO_DOS_PATINS = 0.085
export const CLIPES_DE_UMA_VEZ = ['virar', 'abrir', 'abrir-interna', 'estourar'] as const
const LUZES_NOTURNAS = new Set([
  'perolaLuz',
  'cristalLuz',
  'luz',
  'lanternaVermelha',
  'lanternaAmarela',
  'lanternaAzul',
  'lanternaRosa',
])

export function luzNoturna(nome: string): boolean {
  return LUZES_NOTURNAS.has(nome)
}

/** FNV-1a: mesmo id e mesmo clipe mantêm a fase, independentemente da ordem de montagem. */
export function faseDaAnimacao(id: string, clipe: string): number {
  let hash = 2166136261
  for (const letra of `${id}:${clipe}`) hash = Math.imul(hash ^ letra.charCodeAt(0), 16777619)
  return (hash >>> 0) / 4294967296
}

export type Voador = 'bem-te-vi' | 'borboleta' | 'passaro-das-nuvens'
export const ALTURAS_DE_VOO: Readonly<Record<Voador, number>> = {
  'bem-te-vi': 2.8,
  borboleta: 1.6,
  'passaro-das-nuvens': 3.2,
}

/** O chamador fornece o topo dos obstáculos no ponto de voo, no mesmo espaço do chão. */
export function alturaDoVoo(tipo: Voador, chao: number, topoDosObstaculos: number): number {
  return Math.max(chao + ALTURAS_DE_VOO[tipo], topoDosObstaculos + 0.6)
}

export function capsulaDoPinguim(deslizando: boolean, filhote = false) {
  const escala = filhote ? 0.6 : 1
  return {
    raio: 0.13 * escala,
    meiaAltura: (deslizando ? 0.12 : 0.11) * escala,
    y: (deslizando ? 0.14 : 0.24) * escala,
    z: (deslizando ? 0.24 : 0) * escala,
    giroX: deslizando ? Math.PI / 2 : 0,
  }
}

export const LETRAS_POR_SEGUNDO = 12
export type BocaDaIris = 'B' | 'C' | 'D'
/** Ritmo visual pelo texto, sem áudio. Pontuação, espaços e fim da fala fecham a boca. */
export function bocaDaIris(
  texto: string,
  segundos: number,
): { forma: BocaDaIris | null; peso: number } {
  const posicao = Math.max(0, segundos) * LETRAS_POR_SEGUNDO
  const letra = texto[Math.floor(posicao)]
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
  if (!letra || !/[a-z0-9]/.test(letra)) return { forma: null, peso: 0 }
  const forma = /[ou]/.test(letra) ? 'D' : /[a]/.test(letra) ? 'C' : 'B'
  return { forma, peso: Math.sin((posicao % 1) * Math.PI) * 0.8 }
}
