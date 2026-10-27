import type {
  RepositorioDoJogo,
  ResultadoDaGravacao,
  SalvamentoNoBanco,
} from '../../src/domain/repositorio.port'

/** Repositório em memória com a mesma semântica do Drizzle (revisão como trava, teto do dia). */
export class RepositorioEmMemoria implements RepositorioDoJogo {
  readonly salvamentos = new Map<string, SalvamentoNoBanco>()
  readonly tempo = new Map<string, number>()
  readonly limites = new Map<string, number>()

  async lerSalvamento(jogadorId: string) {
    return this.salvamentos.get(jogadorId) ?? null
  }

  async gravarSalvamento(
    e: Parameters<RepositorioDoJogo['gravarSalvamento']>[0],
  ): Promise<ResultadoDaGravacao> {
    const atual = this.salvamentos.get(e.jogadorId) ?? null
    if ((atual?.revisao ?? 0) !== e.revisaoBase) return { ok: false, atual }
    const guardado = {
      revisao: e.revisaoBase + 1,
      dados: structuredClone(e.salvamento),
      atualizadoEm: e.agora,
    }
    this.salvamentos.set(e.jogadorId, guardado)
    return { ok: true, guardado }
  }

  async somarTempo(jogadorId: string, dia: string, segundos: number) {
    const chave = `${jogadorId}|${dia}`
    const total = Math.min((this.tempo.get(chave) ?? 0) + segundos, 86_400)
    this.tempo.set(chave, total)
    return total
  }

  async lerTempo(jogadorId: string, dia: string) {
    return this.tempo.get(`${jogadorId}|${dia}`) ?? 0
  }

  async lerLimite(contaId: string) {
    return this.limites.get(contaId) ?? null
  }

  async gravarLimite(contaId: string, minutos: number) {
    this.limites.set(contaId, minutos)
    return minutos
  }
}
