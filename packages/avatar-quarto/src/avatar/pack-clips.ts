/**
 * Os clipes do pack preparados para quem anda pelo mundo (o jogo): o pack guarda o deslocamento no
 * `Hips` (o `Root` fica parado), e no jogo quem anda, sobe e cai é o corpo da física. A troca é
 * feita na carga, sobre uma cópia: os arquivos do pack não mudam e a plataforma (que mostra o boneco
 * parado num lugar) nunca passa por aqui.
 */
import type { AnimationClip } from 'three'

/** O que fazer com a subida e a descida do `Hips`. */
export type VerticalDoClipe =
  /** Fica como está (o balanço do passo, o agachar). */
  | 'manter'
  /** Tira a subida contínua (subir escada): sobra o balanço de cada degrau. */
  | 'tendencia'
  /**
   * O `Hips` nunca passa desta altura (a de quem está em pé): o pulo do pack sobe o corpo até
   * 1,26 m, e no jogo quem sobe é a física. O agachar da impulsão e do pouso (abaixo do teto) fica.
   */
  | { teto: number }

export interface OpcoesSemDeslocamento {
  /** O osso que carrega o deslocamento (o `Hips` no pack). */
  osso?: string
  vertical?: VerticalDoClipe
}

/** A trilha de posição de um osso (o nome que o `GLTFLoader` dá: `<osso>.position`). */
function trilhaDePosicao(clipe: AnimationClip, osso: string) {
  return clipe.tracks.find((t) => t.name === `${osso}.position` && t.getValueSize() === 3)
}

/** A altura do osso no primeiro quadro do clipe (a do `Hips` em pé, no `parado_relaxado`). */
export function alturaNoComeco(clipe: AnimationClip, osso = 'Hips'): number | null {
  const trilha = trilhaDePosicao(clipe, osso)
  return trilha ? (trilha.values[1] ?? null) : null
}

/**
 * Uma cópia do clipe, com outro nome, sem o deslocamento: o andar para frente (do primeiro ao
 * último quadro) sai em linha reta ao longo do tempo, e o balanço do passo fica. O vertical segue
 * `opcoes.vertical`. Sem a trilha do osso, só a cópia com o nome novo.
 */
export function semDeslocamento(
  clipe: AnimationClip,
  nome: string,
  opcoes: OpcoesSemDeslocamento = {},
): AnimationClip {
  const copia = clipe.clone()
  copia.name = nome
  const trilha = trilhaDePosicao(copia, opcoes.osso ?? 'Hips')
  if (!trilha) return copia
  const { times, values } = trilha
  const n = times.length
  if (n < 2) return copia
  const t0 = times[0] ?? 0
  const total = (times[n - 1] ?? t0) - t0
  const ultimo = (n - 1) * 3
  const dx = (values[ultimo] ?? 0) - (values[0] ?? 0)
  const dy = (values[ultimo + 1] ?? 0) - (values[1] ?? 0)
  const dz = (values[ultimo + 2] ?? 0) - (values[2] ?? 0)
  const vertical = opcoes.vertical ?? 'manter'
  for (let i = 0; i < n; i++) {
    const f = total > 0 ? ((times[i] ?? t0) - t0) / total : 0
    const j = i * 3
    values[j] = (values[j] ?? 0) - dx * f
    values[j + 2] = (values[j + 2] ?? 0) - dz * f
    if (vertical === 'tendencia') values[j + 1] = (values[j + 1] ?? 0) - dy * f
    else if (vertical !== 'manter') values[j + 1] = Math.min(values[j + 1] ?? 0, vertical.teto)
  }
  return copia
}
