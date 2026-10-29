import type { IdDaGaleria } from '@sistemazero/arquipelago-contracts'
import type { CompraDaGaleria, RepositorioDaGaleria } from '../../src/domain/galeria.port'

/** As compras da galeria em memória, com a mesma regra do Drizzle (a primeira reserva vale). */
export class GaleriaEmMemoria implements RepositorioDaGaleria {
  readonly linhas = new Map<string, CompraDaGaleria>()

  async compras(jogadorId: string) {
    return [...this.linhas.entries()]
      .filter(([k]) => k.startsWith(`${jogadorId}|`))
      .map(([, c]) => ({ ...c }))
  }

  async reservar(p: Parameters<RepositorioDaGaleria['reservar']>[0]) {
    const k = `${p.jogadorId}|${p.aparencia}`
    if (!this.linhas.has(k))
      this.linhas.set(k, {
        aparencia: p.aparencia,
        objeto: p.objeto,
        moedas: p.moedas,
        chave: p.chave,
        situacao: 'pendente',
      })
    return { ...(this.linhas.get(k) as CompraDaGaleria) }
  }

  async marcarPaga(jogadorId: string, aparencia: IdDaGaleria) {
    const c = this.linhas.get(`${jogadorId}|${aparencia}`)
    if (c?.situacao === 'pendente') c.situacao = 'paga'
  }

  async desistir(jogadorId: string, aparencia: IdDaGaleria, chave: string) {
    const k = `${jogadorId}|${aparencia}`
    const c = this.linhas.get(k)
    if (c?.situacao === 'pendente' && c.chave === chave) this.linhas.delete(k)
  }
}
