import { createHash, randomBytes } from 'node:crypto'
import {
  type AmigosDaFamilia,
  CASAS_DE_AMIGOS_MAXIMO,
  type CasaDeAmigo,
  type CasasDeAmigos,
  migrarSalvamento,
  OBJETOS_DA_CASA,
  PERMISSOES_PADRAO,
  type QuartoDoJogo,
  VERSAO_DAS_VISITAS_DE_AMIGOS,
} from '@sistemazero/arquipelago-contracts'
import type { Logger } from '@sistemazero/core/logging'
import { decidirAcesso, type PoliticaDeAcesso } from '../domain/acesso'
import type { RepositorioDaFamilia } from '../domain/familia.port'
import type { Jogador, Responsavel } from '../domain/jogador'
import { MembrosIndisponiveisError, type PortaDosMembros } from '../domain/membros.port'
import { SalvamentoDaVisitaNecessarioError } from '../domain/visitas-adultas.port'
import {
  CasaDeAmigoIndisponivelError,
  LimiteDeCasasError,
  type RepositorioDasVisitasDeAmigos,
  VisitasDeAmigosDesligadasError,
} from '../domain/visitas-de-amigos.port'
import { AcessoBloqueadoError, IrmaoNaoEncontradoError, SomenteLeituraError } from './erros'

const hashDoCodigo = (codigo: string) => createHash('sha256').update(codigo).digest('hex')

/**
 * Visitas de outras crianças (N08a, 30/10/2026): o responsável gera o convite de uma criança dele;
 * o responsável de outra família aceita com um apelido; a criança visitante vê a casa, só leitura.
 * Tudo exige "Visitas de outras crianças" ligado nas DUAS contas, conferido a cada leitura. O
 * serviço nunca sabe nomes. Plano: `docs/superpowers/plans/2026-10-30-arquipelago-visitas-de-amigos.md`.
 */
export class ServicoDasVisitasDeAmigos {
  constructor(
    private readonly deps: {
      repo: RepositorioDasVisitasDeAmigos
      familia: Pick<RepositorioDaFamilia, 'perfisDaConta' | 'salvamentos' | 'lerPermissoes'>
      politica: PoliticaDeAcesso
      membros?: Pick<PortaDosMembros, 'lerQuarto'> | null
      logger?: Logger
      agora?: () => Date
    },
  ) {}

  private agora() {
    return this.deps.agora?.() ?? new Date()
  }

  private async ligado(contaId: string): Promise<boolean> {
    const p = (await this.deps.familia.lerPermissoes(contaId)) ?? PERMISSOES_PADRAO
    return p.visitasDeOutrasCriancas
  }

  /** A criança da conta, que vê o jogo pela mesma decisão de quando ela abre. */
  private veOJogo(contaId: string, equipe: boolean, perfilId: string): boolean {
    return decidirAcesso(this.deps.politica, {
      id: perfilId,
      publico: 'kids',
      contaId,
      equipe,
      somenteLeitura: false,
    }).liberado
  }

  // ── A área dos pais ────────────────────────────────────────────────────────────────────────

  async daFamilia(r: Responsavel, perfis: readonly string[]): Promise<AmigosDaFamilia> {
    const situacao = (await this.ligado(r.contaId)) ? 'ok' : 'desligado'
    const daConta = await this.deps.familia.perfisDaConta(r.contaId, perfis)
    const ativos = await this.deps.repo.convitesAtivos(daConta)
    const casas = await this.deps.repo.casasDaConta(r.contaId)
    return {
      versao: VERSAO_DAS_VISITAS_DE_AMIGOS,
      situacao,
      convites: daConta.map((perfilId) => ({ perfilId, ativo: ativos.has(perfilId) })),
      casas: casas.map((c) => ({ id: c.id, apelido: c.apelido })),
    }
  }

  async gerarConvite(r: Responsavel, perfilId: string) {
    if (r.somenteLeitura) throw new SomenteLeituraError()
    if (!(await this.ligado(r.contaId))) throw new VisitasDeAmigosDesligadasError()
    const daConta = await this.deps.familia.perfisDaConta(r.contaId, [perfilId])
    if (!daConta.includes(perfilId) || !this.veOJogo(r.contaId, r.equipe, perfilId))
      throw new IrmaoNaoEncontradoError()
    const codigo = randomBytes(24).toString('base64url')
    const ok = await this.deps.repo.gerarConvite(
      perfilId,
      r.contaId,
      hashDoCodigo(codigo),
      this.agora(),
    )
    if (!ok) throw new SalvamentoDaVisitaNecessarioError()
    return { versao: VERSAO_DAS_VISITAS_DE_AMIGOS, perfilId, codigo }
  }

  async apagarConvite(r: Responsavel, perfilId: string) {
    if (r.somenteLeitura) throw new SomenteLeituraError()
    await this.deps.repo.apagarConvite(perfilId, r.contaId)
    return { versao: VERSAO_DAS_VISITAS_DE_AMIGOS, perfilId, ativo: false }
  }

  async aceitar(r: Responsavel, codigo: string, apelido: string) {
    if (r.somenteLeitura) throw new SomenteLeituraError()
    if (!(await this.ligado(r.contaId))) throw new VisitasDeAmigosDesligadasError()
    const hash = hashDoCodigo(codigo)
    const convite = await this.deps.repo.conviteDoCodigo(hash)
    // O código da própria família não vira "casa de amigo": irmãos já se visitam.
    if (!convite || convite.contaId === r.contaId) throw new CasaDeAmigoIndisponivelError()
    const aceite = await this.deps.repo.aceitar(
      r.contaId,
      { perfilId: convite.perfilId, hash },
      apelido.trim(),
      this.agora(),
      CASAS_DE_AMIGOS_MAXIMO,
    )
    if (aceite.situacao === 'sem-convite') throw new CasaDeAmigoIndisponivelError()
    if (aceite.situacao === 'limite') throw new LimiteDeCasasError()
    return { versao: VERSAO_DAS_VISITAS_DE_AMIGOS, id: aceite.id, apelido: apelido.trim() }
  }

  async remover(r: Responsavel, id: string) {
    if (r.somenteLeitura) throw new SomenteLeituraError()
    await this.deps.repo.remover(r.contaId, id)
    return { versao: VERSAO_DAS_VISITAS_DE_AMIGOS, id, removida: true }
  }

  // ── A criança ──────────────────────────────────────────────────────────────────────────────

  private exigirCrianca(jogador: Jogador): string {
    const decisao = decidirAcesso(this.deps.politica, jogador)
    if (!decisao.liberado) throw new AcessoBloqueadoError(decisao.motivo)
    if (jogador.publico !== 'kids' || jogador.contaId === null)
      throw new CasaDeAmigoIndisponivelError()
    return jogador.contaId
  }

  /** As casas que valem agora: convite ativo, as duas famílias ligadas, quem mora vê o jogo. */
  private async validas(jogador: Jogador, contaId: string) {
    const casas = await this.deps.repo.casasDaConta(contaId)
    const validas: typeof casas = []
    for (const c of casas) {
      if (!c.conviteAtivo || c.contaAnfitria === null) continue
      if (!(await this.ligado(c.contaAnfitria))) continue
      if (!this.veOJogo(c.contaAnfitria, false, c.perfilAnfitriao)) continue
      if (c.perfilAnfitriao === jogador.id) continue
      validas.push(c)
    }
    return validas
  }

  async casas(jogador: Jogador): Promise<CasasDeAmigos> {
    const contaId = this.exigirCrianca(jogador)
    if (!(await this.ligado(contaId)))
      return { versao: VERSAO_DAS_VISITAS_DE_AMIGOS, situacao: 'desligado', casas: [] }
    const validas = await this.validas(jogador, contaId)
    return {
      versao: VERSAO_DAS_VISITAS_DE_AMIGOS,
      situacao: 'ok',
      casas: validas.map((c) => ({ id: c.id, apelido: c.apelido })),
    }
  }

  async casa(jogador: Jogador, id: string): Promise<CasaDeAmigo> {
    const contaId = this.exigirCrianca(jogador)
    if (!(await this.ligado(contaId))) throw new VisitasDeAmigosDesligadasError()
    const c = (await this.validas(jogador, contaId)).find((k) => k.id === id)
    if (!c) throw new CasaDeAmigoIndisponivelError()
    const s = migrarSalvamento(
      (await this.deps.familia.salvamentos([c.perfilAnfitriao])).get(c.perfilAnfitriao),
    )
    if (!s) throw new CasaDeAmigoIndisponivelError()
    const quarto = await this.quartoDe(c.perfilAnfitriao)
    // Depois das esperas (salvamento e Members), a mesma conferência de novo: um convite apagado,
    // um interruptor desligado ou um aceite removido no meio do caminho não deixa a casa sair.
    if (!(await this.ligado(contaId))) throw new VisitasDeAmigosDesligadasError()
    if (!(await this.validas(jogador, contaId)).some((k) => k.id === c.id))
      throw new CasaDeAmigoIndisponivelError()
    return {
      versao: VERSAO_DAS_VISITAS_DE_AMIGOS,
      id: c.id,
      apelido: c.apelido,
      obra: s.construcao.casa,
      horta: s.horta,
      completos: OBJETOS_DA_CASA.filter((o) => Boolean(s.projetos[o]?.aparencia)),
      quarto,
    }
  }

  private async quartoDe(perfilId: string): Promise<QuartoDoJogo | null> {
    if (!this.deps.membros) return null
    try {
      return (await this.deps.membros.lerQuarto({ userId: perfilId, audience: 'kids' })).quarto
    } catch (erro) {
      if (!(erro instanceof MembrosIndisponiveisError)) throw erro
      this.deps.logger?.warn('arquipelago.visitas_de_amigos.quarto_indisponivel', {
        motivo: erro.motivo,
        status: erro.status,
      })
      return null
    }
  }
}
