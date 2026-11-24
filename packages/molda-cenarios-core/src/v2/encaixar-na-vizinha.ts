import { transformacaoResolvida } from './chao'
import type { DocumentoDeCenario, InstanciaDeCenario, ModeloDoCenario } from './documento'
import { encaixarPose, matrizDaPose, type PontoNoMundo, pontosNoMundo } from './encaixe-de-pecas'
import type { PontoDeEncaixe } from './entidades-schema'
import type { FonteDeAlturas } from './terreno'

/** "Encaixar na vizinha" procura mais longe que o arrasto: a peça pode estar a uns passos. */
export const ALCANCE_DO_BOTAO_DE_ENCAIXE = 3
/** Só as peças com o centro até aqui entram na procura. */
const RAIO_DAS_VIZINHAS = 25

export interface EncaixeNaVizinha {
  /** O que gravar na peça (`instancia.atualizar`): a pose nova, solta do relevo. */
  alteracoes: Pick<InstanciaDeCenario, 'transformacao' | 'apoio'>
  vizinha: string
  /** Quanto a peça andou até encaixar (metros, entre os pontos). */
  distancia: number
}

/**
 * Encaixa uma peça já posta na vizinha mais perto que tenha um ponto compatível (o botão da
 * oficina e o comando `encaixar_pecas` do agente). Os pontos vêm do modelo (`encaixes`,
 * escritos à mão) ou de `pontosDoModelo` (a geometria). A peça encaixada fica solta do relevo,
 * como no arrasto. Nulo quando nenhum par encaixa.
 */
export function encaixarNaVizinha(
  doc: DocumentoDeCenario,
  id: string,
  pontosDoModelo: (m: ModeloDoCenario) => readonly PontoDeEncaixe[] | null,
  fonte?: FonteDeAlturas,
  opcoes: { vizinha?: string; alcance?: number } = {},
): EncaixeNaVizinha | null {
  const pontosDe = (o: InstanciaDeCenario) => {
    const m = doc.modelos.find((x) => x.id === o.modelo)
    return m ? (m.encaixes ?? pontosDoModelo(m)) : null
  }
  const peca = doc.instancias.find((o) => o.id === id)
  const pontos = peca && pontosDe(peca)
  if (!peca || !pontos?.length) return null
  const pose = transformacaoResolvida(doc, peca, fonte)
  const vizinhos: PontoNoMundo[] = [],
    donos: string[] = []
  for (const o of doc.instancias) {
    if (o.id === id || o.oculto || (opcoes.vizinha && o.id !== opcoes.vizinha)) continue
    const seus = pontosDe(o)
    if (!seus?.length) continue
    const outra = transformacaoResolvida(doc, o, fonte)
    if (
      Math.hypot(outra.posicao.x - pose.posicao.x, outra.posicao.z - pose.posicao.z) >
      RAIO_DAS_VIZINHAS
    )
      continue
    for (const p of pontosNoMundo(seus, matrizDaPose(outra))) {
      vizinhos.push(p)
      donos.push(o.id)
    }
  }
  const r = encaixarPose(pontos, pose, vizinhos, opcoes.alcance ?? ALCANCE_DO_BOTAO_DE_ENCAIXE)
  if (!r) return null
  return {
    alteracoes: { transformacao: r.pose, apoio: { tipo: 'absoluto' } },
    vizinha: donos[r.achado.para]!,
    distancia: r.achado.distancia,
  }
}
