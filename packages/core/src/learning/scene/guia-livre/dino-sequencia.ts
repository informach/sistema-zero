import type { SceneActivity } from '../index'

/**
 * A régua das falas das cinco cenas do Corre Dino em exploração livre (frente C, 02/11/2026):
 * `controls`, `hitbox`, `score`, `number-line` e `acceleration`.
 *
 * Os testes têm uma ordem sugerida (a do curso). A fala de agora pede o PRIMEIRO teste que falta e
 * explica o teste que vem logo antes dele na ordem, que por isso mesmo já foi feito: nenhuma fala
 * explica um resultado que a criança não viu. Quem fez o teste de antes fora da ordem (ou não o fez,
 * porque o bloco não o cobra) ouve a variante `-first` do pedido, sem a explicação.
 *
 * ⚠️ As falas seguem as METAS DO BLOCO (`setup.goals`), como o `metaFeita` do ateliê: um teste que o
 * bloco não cobra não é pedido. Um teste cobrado puxa o que ele `requer` no motor (a `score-start` só
 * cai depois de ver o placar solto crescer; o contraste da área só depois de um BATEU).
 * ⚠️ Sem `sceneTargets` (o `index`): o registro dos guias é lido pelo `discovery-guidance`, que o
 * `index` importa, e um valor do `index` aqui fecharia um ciclo de importação. Por isso a lista de
 * FÁBRICA (as metas da missão sem caso) vem de cada cena.
 */
export interface PassoDaSequencia {
  /** O nome do passo nas chaves das falas (`<cena>-<chave>` e `<cena>-<chave>-first`). */
  chave: string
  /** As metas que contam para este passo: a do modelo e os apelidos de caso (`early-hit`…). */
  metas: readonly string[]
  /** O passo que o motor exige antes deste (a chave dele). */
  requer?: string
}

/** As metas que esta atividade cobra entre as da sequência: as do caso, ou as de fábrica. */
export function metasCobradas(
  activity: SceneActivity,
  passos: readonly PassoDaSequencia[],
  fabrica: readonly string[],
): readonly string[] {
  const todas = passos.flatMap((p) => p.metas)
  const doCaso = activity.setup?.goals?.filter((id) => todas.includes(id)) ?? []
  return doCaso.length ? doCaso : fabrica
}

/** Os passos que a fala vai pedir, na ordem: os cobrados e os que eles exigem antes. */
export function passosPedidos(
  passos: readonly PassoDaSequencia[],
  cobradas: readonly string[],
): PassoDaSequencia[] {
  const pedidos = new Set(
    passos.filter((p) => p.metas.some((m) => cobradas.includes(m))).map((p) => p.chave),
  )
  // Um teste cobrado puxa o que ele requer (e assim por diante).
  for (let mudou = true; mudou; ) {
    mudou = false
    for (const p of passos)
      if (pedidos.has(p.chave) && p.requer && !pedidos.has(p.requer)) {
        pedidos.add(p.requer)
        mudou = true
      }
  }
  return passos.filter((p) => pedidos.has(p.chave))
}

/**
 * A chave da fala de agora: `<cena>-start` (o primeiro passo da ordem, ainda por fazer),
 * `<cena>-<chave>` (explica o passo de antes e pede este), `<cena>-<chave>-first` (pede este sem
 * explicar, porque o de antes não foi visto), `<cena>-complete` (todos os passos cobrados, que são
 * todos os da sequência) ou `fimParcial` (um bloco que cobra só uma parte).
 */
export function falaDaSequencia({
  cena,
  activity,
  has,
  passos,
  fabrica,
  fimParcial,
}: {
  cena: string
  activity: SceneActivity
  has: (meta: string) => boolean
  passos: readonly PassoDaSequencia[]
  fabrica: readonly string[]
  /** A fala do fim quando o bloco cobra só uma parte dos passos (pelas chaves cobradas). */
  fimParcial: (chaves: readonly string[]) => string
}): string {
  const cobradas = metasCobradas(activity, passos, fabrica)
  const pedidos = passosPedidos(passos, cobradas)
  /** O passo está feito: as metas dele que o bloco cobra caíram (sem nenhuma cobrada, a primeira). */
  const feito = (p: PassoDaSequencia) => {
    const dele = p.metas.filter((m) => cobradas.includes(m))
    return (dele.length ? dele : p.metas.slice(0, 1)).every(has)
  }
  const proximo = pedidos.find((p) => !feito(p))
  if (!proximo)
    return pedidos.length === passos.length
      ? `${cena}-complete`
      : fimParcial(pedidos.map((p) => p.chave))
  const i = passos.indexOf(proximo)
  if (i === 0) return `${cena}-start`
  const anterior = passos[i - 1]
  const visto = anterior?.metas.some(has) ?? false
  return visto ? `${cena}-${proximo.chave}` : `${cena}-${proximo.chave}-first`
}
