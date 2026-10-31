/**
 * As ondas de cinza do vulcão (§6.28 A8; a ficha do Vale: "proteger os ninhos das ondas de cinza
 * do vulcão"). A criança pede para proteger um ninho; três ondas de cinza descem do vulcão, uma
 * depois da outra. Perto do ninho e com a lanterna acesa, a luz espanta cada onda antes de ela
 * chegar. As três espantadas, o ninho fica cuidado (o mesmo `vale.ninhos` de antes). Se uma onda
 * passa, ela só cobre o ninho por um instante e vai embora: os ovos ficam bem e dá para tentar de
 * novo. Sem dano, sem relógio salvo, nada se perde (regras puras, sem three).
 */
export const ONDAS_DE_CINZA = {
  quantas: 3,
  /** Segundos entre a saída de uma onda e a da seguinte. */
  intervalo: 2.5,
  /** Segundos da onda do vulcão até o ninho. */
  viagem: 5,
  /** A luz espanta a onda quando ela está nesta fração do caminho ou além (perto do ninho). */
  espantaDe: 0.7,
  /** A criança protege estando a até isto do ninho (m), com a lanterna acesa. */
  protegeA: 3,
} as const

export type DestinoDaOnda = 'espantada' | 'passou' | null

export interface OndasDoNinho {
  /** Segundos desde que a primeira onda saiu. */
  tempo: number
  destinos: DestinoDaOnda[]
}

export function comecarOndas(): OndasDoNinho {
  return { tempo: 0, destinos: Array.from({ length: ONDAS_DE_CINZA.quantas }, () => null) }
}

/** Quanto do caminho a onda `i` já andou (0 no vulcão, 1 no ninho; antes de sair, negativo). */
export function caminhoDaOnda(o: OndasDoNinho, i: number): number {
  return (o.tempo - i * ONDAS_DE_CINZA.intervalo) / ONDAS_DE_CINZA.viagem
}

/**
 * Um passo: cada onda no caminho é espantada se a luz protege o ninho quando ela chega perto, ou
 * passa quando chega ao ninho sem luz. Devolve as ondas que se resolveram neste passo.
 */
export function passoDasOndas(
  o: OndasDoNinho,
  dt: number,
  luzProtege: boolean,
): { onda: number; destino: Exclude<DestinoDaOnda, null> }[] {
  o.tempo += Math.max(0, dt)
  const eventos: { onda: number; destino: Exclude<DestinoDaOnda, null> }[] = []
  o.destinos.forEach((destino, i) => {
    if (destino !== null) return
    const p = caminhoDaOnda(o, i)
    if (luzProtege && p >= ONDAS_DE_CINZA.espantaDe) {
      o.destinos[i] = 'espantada'
      eventos.push({ onda: i, destino: 'espantada' })
    } else if (p >= 1) {
      o.destinos[i] = 'passou'
      eventos.push({ onda: i, destino: 'passou' })
    }
  })
  return eventos
}

/** O fim: `protegido` com as três espantadas; `de-novo` se alguma passou; `null` enquanto vem. */
export function fimDasOndas(o: OndasDoNinho): 'protegido' | 'de-novo' | null {
  if (o.destinos.some((d) => d === null)) return null
  return o.destinos.every((d) => d === 'espantada') ? 'protegido' : 'de-novo'
}

/** A luz protege: lanterna acesa e a criança perto do ninho. */
export function luzProtegeONinho(
  lanterna: boolean,
  crianca: { x: number; z: number },
  ninho: { x: number; z: number },
): boolean {
  return lanterna && Math.hypot(crianca.x - ninho.x, crianca.z - ninho.z) <= ONDAS_DE_CINZA.protegeA
}

export const FALAS_DAS_ONDAS = {
  comeco:
    'Lá vem a cinza do vulcão. Fique perto do ninho com a lanterna acesa para a luz espantar a cinza.',
  semLanterna:
    'A cinza do vulcão vem para os ninhos. Para espantar, você precisa da lanterna acesa. O Zappy entrega uma na primeira noite na sua ilha.',
  deNovo:
    'A cinza passou por cima do ninho e foi embora. Os ovos estão bem. Com a lanterna acesa perto deles, a luz espanta a cinza. Tente de novo quando quiser.',
  protegido: (cuidados: number) =>
    `A luz espantou as três ondas de cinza. Os ovos estão protegidos. ${cuidados} de 3 ninhos cuidados.`,
} as const
