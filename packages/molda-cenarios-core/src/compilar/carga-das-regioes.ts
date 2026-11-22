/**
 * Que regiões ficam carregadas enquanto o personagem anda (lote 6 da conclusão do plano do
 * Estúdio, 22/11/2026; regras em `docs/estudio-evolucao/regioes-3d-especificacao.md` e no plano).
 * Pura e sem relógio próprio: quem chama passa o foco, a câmera e o tempo de cada quadro. O motor
 * dos cenários (JavaScript) usa esta; o `cenario.py` do Raylib repete as mesmas regras.
 *
 * - **Região atual**, com 0,5 m de tolerância na borda: quem está na Vila continua na Vila até
 *   passar meio metro além da caixa dela. Para o bloco "Quando entrar na região", fora de toda
 *   região a atual é nenhuma (entrar de novo na Vila dispara de novo).
 * - **Região segura** (a da carga): fora de toda região, fica a última; começando fora, a mais
 *   perto. A janela obrigatória é a segura e as vizinhas dela: sempre carregadas.
 * - **Pré-carga**: as outras regiões entram quando ficam a até `max(40 m, distância câmera-foco)`
 *   do foco.
 * - **Descarte**: a região que não é mais pedida só sai quando passa 20 m além do raio da
 *   pré-carga e fica lá por 2 s seguidos (andar perto da borda não faz carregar e descarregar).
 * - **Entradas**: cada mudança da atual para uma região (inclusive quando o personagem já começa
 *   dentro) vira uma entrada, uma vez.
 */

export const REGRAS_DA_CARGA = Object.freeze({
  tolerancia: 0.5,
  preCarga: 40,
  folgaDoDescarte: 20,
  atrasoDoDescarte: 2,
})

export interface RegiaoDaCarga {
  id: string
  nome: string
  caixa: { x0: number; z0: number; x1: number; z1: number }
  vizinhas: readonly string[]
}

export interface PontoNoChao {
  x: number
  z: number
}

export interface EstadoDaCarga {
  /** A região onde o personagem está agora (para o bloco); `null` fora de todas. */
  atual: string | null
  /** A região que a carga considera (a atual, ou a última, ou a mais perto). */
  segura: string
  /** As regiões que precisam estar carregadas agora (a segura e as vizinhas). */
  obrigatorias: ReadonlySet<string>
  /** As que ficam carregadas: as obrigatórias, as perto e as que ainda esperam o descarte. */
  carregadas: ReadonlySet<string>
  /** As regiões em que o personagem entrou neste quadro, pelo nome, na ordem. */
  entradas: readonly string[]
}

function distanciaAteCaixa(p: PontoNoChao, c: RegiaoDaCarga['caixa']): number {
  const x0 = Math.min(c.x0, c.x1),
    x1 = Math.max(c.x0, c.x1),
    z0 = Math.min(c.z0, c.z1),
    z1 = Math.max(c.z0, c.z1)
  const dx = Math.max(x0 - p.x, 0, p.x - x1),
    dz = Math.max(z0 - p.z, 0, p.z - z1)
  return Math.hypot(dx, dz)
}

/** O plano da carga de uma cena com regiões. `atualizar` a cada quadro. */
export function criarPlanoDaCarga(regioes: readonly RegiaoDaCarga[]) {
  if (!regioes.length) throw Error('O plano da carga precisa de ao menos uma região.')
  const porId = new Map(regioes.map((r) => [r.id, r]))
  let atual: string | null = null
  let segura: string | null = null
  // Quando cada região carregada passou a ficar longe (o relógio do descarte).
  const longeDesde = new Map<string, number>()
  const carregadas = new Set<string>()

  const regiaoDoPonto = (p: PontoNoChao): string | null => {
    // Quem já está numa região fica nela até sair da caixa com a tolerância.
    if (atual !== null) {
      const r = porId.get(atual)!
      if (distanciaAteCaixa(p, r.caixa) <= REGRAS_DA_CARGA.tolerancia) return atual
    }
    for (const r of regioes) if (distanciaAteCaixa(p, r.caixa) === 0) return r.id
    return null
  }

  const maisPerto = (p: PontoNoChao) => {
    let melhor = regioes[0]!
    let menor = Number.POSITIVE_INFINITY
    for (const r of regioes) {
      const d = distanciaAteCaixa(p, r.caixa)
      if (d < menor) {
        menor = d
        melhor = r
      }
    }
    return melhor.id
  }

  return {
    /**
     * Um quadro: `foco` é quem a câmera segue (o personagem), `camera` a posição dela no chão
     * (opcional) e `agora` o tempo em segundos.
     */
    atualizar(foco: PontoNoChao, agora: number, camera?: PontoNoChao): EstadoDaCarga {
      if (![foco.x, foco.z, agora].every(Number.isFinite))
        throw Error('O foco e o tempo da carga precisam ser números.')
      const antes = atual
      atual = regiaoDoPonto(foco)
      if (atual !== null) segura = atual
      else if (segura === null) segura = maisPerto(foco)
      // Começar dentro também é entrar: a atual nasce nenhuma.
      const entradas = atual !== null && atual !== antes ? [porId.get(atual)!.nome] : []
      const s = porId.get(segura!)!
      const obrigatorias = new Set([s.id, ...s.vizinhas.filter((v) => porId.has(v))])
      const raio = Math.max(
        REGRAS_DA_CARGA.preCarga,
        camera ? Math.hypot(camera.x - foco.x, camera.z - foco.z) : 0,
      )
      for (const r of regioes) {
        const d = distanciaAteCaixa(foco, r.caixa)
        if (obrigatorias.has(r.id) || d <= raio) {
          carregadas.add(r.id)
          longeDesde.delete(r.id)
          continue
        }
        if (!carregadas.has(r.id)) continue
        if (d <= raio + REGRAS_DA_CARGA.folgaDoDescarte) {
          longeDesde.delete(r.id)
          continue
        }
        const desde = longeDesde.get(r.id)
        if (desde === undefined) longeDesde.set(r.id, agora)
        else if (agora - desde >= REGRAS_DA_CARGA.atrasoDoDescarte) {
          carregadas.delete(r.id)
          longeDesde.delete(r.id)
        }
      }
      return {
        atual,
        segura: segura!,
        obrigatorias,
        carregadas: new Set(carregadas),
        entradas,
      }
    },
    /** Recomeçar (o reinício do jogo): a primeira entrada volta a disparar. */
    reiniciar() {
      atual = null
    },
  }
}
