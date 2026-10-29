import type { PermissoesDaFamilia } from '@sistemazero/arquipelago-contracts'
import type { RepositorioDaFamilia, TempoNaJanela } from '../../src/domain/familia.port'
import type { RepositorioEmMemoria } from './memoria'

/** A família em memória, lendo o mesmo repositório do jogo em memória (salvamento, tempo, conta). */
export class FamiliaEmMemoria implements RepositorioDaFamilia {
  readonly permissoes = new Map<string, PermissoesDaFamilia>()
  /** O fim de cada sessão com tempo contado, por perfil (os testes põem à mão). */
  readonly sessoes = new Map<string, Date[]>()

  constructor(private readonly jogo: RepositorioEmMemoria) {}

  async perfisDaConta(contaId: string, perfis: readonly string[]) {
    return perfis.filter((id) => this.jogo.contas.get(id) === contaId)
  }

  async outrosPerfisDaConta(contaId: string, menos: string, limite: number) {
    return [...this.jogo.contas]
      .filter(([id, conta]) => conta === contaId && id !== menos)
      .map(([id]) => id)
      .slice(0, limite)
  }

  async tempoNaJanela(perfis: readonly string[], inicio: string, fim: string) {
    const tempos = new Map<string, TempoNaJanela>()
    for (const [chave, segundos] of this.jogo.tempo) {
      const [id, dia] = chave.split('|') as [string, string]
      if (!perfis.includes(id) || dia < inicio || dia > fim || segundos <= 0) continue
      const atual = tempos.get(id) ?? { segundos: 0, dias: 0 }
      tempos.set(id, { segundos: atual.segundos + segundos, dias: atual.dias + 1 })
    }
    return tempos
  }

  async sessoesNaJanela(perfis: readonly string[], de: Date, ate: Date) {
    const fins = new Map<string, Date[]>()
    for (const id of perfis) {
      const dentro = (this.sessoes.get(id) ?? []).filter((f) => f >= de && f <= ate)
      if (dentro.length > 0) fins.set(id, dentro)
    }
    return fins
  }

  async salvamentos(perfis: readonly string[]) {
    const mapa = new Map<string, unknown>()
    for (const id of perfis) {
      const linha = this.jogo.salvamentos.get(id)
      if (linha) mapa.set(id, linha.dados)
    }
    return mapa
  }

  async lerPermissoes(contaId: string) {
    const p = this.permissoes.get(contaId)
    return p ? { ...p } : null
  }

  async gravarPermissoes(contaId: string, p: PermissoesDaFamilia) {
    this.permissoes.set(contaId, { ...p })
    return { ...p }
  }
}
